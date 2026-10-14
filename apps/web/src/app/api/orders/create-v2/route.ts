// @ts-nocheck
import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';
import {
  PLATFORM_FEE_RATE,
  money,
  platformFeeOn,
  netOfPlatformFee,
} from '@/app/api/utils/platformFee';

/**
 * POST /api/orders/create-v2
 * Creates a pending order from cart / product checkout.
 * Platform fee is always the flat 5% from platformFee helpers + DB trigger.
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const buyerId = session.user.id;
    const body = await request.json();
    const {
      sellerId,
      itemType = 'product',
      itemId,
      itemTitle,
      quantity = 1,
      unitPrice,
      deliveryFee = 0,
      deliveryAddress,
      currency = 'GHS',
      originVideoId,
      originCreatorId,
      creatorCommission = 0,
    } = body;

    if (!sellerId || !itemId || unitPrice == null) {
      return Response.json({ error: 'Missing required order fields' }, { status: 400 });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const price = money(unitPrice);
    const subtotal = money(price * qty);
    const delivery = money(deliveryFee);

    // Crestar charges ONE flat 5% platform fee — the only fee on the platform,
    // identical for every program. No subscriptions. The `crestar_apply_platform_fee`
    // trigger is the ledger authority; we precompute here for the API response.
    const platformFee = platformFeeOn(subtotal);
    const totalAmount = money(subtotal + delivery);

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const [order] = await sql`
      INSERT INTO orders (
        order_number, buyer_id, seller_id, item_type, item_id, item_title,
        quantity, unit_price, subtotal, platform_fee, platform_fee_rate, delivery_fee,
        total_amount, seller_payout, delivery_address, currency, status, payment_status,
        origin_video_id, origin_creator_id, creator_commission, created_at, updated_at
      ) VALUES (
        ${orderNumber}, ${buyerId}, ${sellerId}, ${itemType}, ${itemId}, ${itemTitle},
        ${qty}, ${price}, ${subtotal}, ${platformFee}, ${PLATFORM_FEE_RATE}, ${delivery},
        ${totalAmount}, ${netOfPlatformFee(subtotal)}, ${deliveryAddress || null}, ${currency},
        'pending', 'pending',
        ${originVideoId || null}, ${originCreatorId || null}, ${money(creatorCommission)},
        NOW(), NOW()
      )
      RETURNING *
    `;

    return Response.json({ success: true, order });
  } catch (error) {
    console.error('orders/create-v2 error:', error);
    return Response.json(
      { error: 'Failed to create order', details: String(error?.message || error) },
      { status: 500 }
    );
  }
}
