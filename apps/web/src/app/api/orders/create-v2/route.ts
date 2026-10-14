// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';
import {
  PLATFORM_FEE_RATE,
  money,
  platformFeeOn,
  netOfPlatformFee,
} from '@/app/api/utils/platformFee';

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

function generateDeliveryPin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * POST /api/orders/create-v2
 * Create a single-item order and initialize payment (v2)
 *
 * PAYMENT MODEL (TikTok-inspired, Paystack-compliant):
 * - ALL funds collected to Crestar's main Paystack balance
 * - NO automatic splits/subaccounts (removed for escrow compliance)
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
      metadata,
    } = body;

    if (!sellerId || !itemId || unitPrice == null) {
      return Response.json({ error: 'Missing required order fields' }, { status: 400 });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const price = money(unitPrice);
    const subtotal = money(price * qty);
    const delivery = money(deliveryFee || 0);

    // Crestar charges ONE flat 5% platform fee — the only fee on the platform,
    // identical for every program. No subscriptions. The `crestar_apply_platform_fee`
    // trigger is the ledger authority; we precompute here for the API response.
    const platformFee = platformFeeOn(subtotal);
    const totalAmount = money(subtotal + delivery);
    const sellerPayout = netOfPlatformFee(subtotal);

    const orderNumber = generateOrderNumber();
    const deliveryPin = generateDeliveryPin();

    const [order] = await sql`
      INSERT INTO orders (
        order_number, buyer_id, seller_id, item_type, item_id, item_title,
        quantity, unit_price, subtotal, platform_fee, platform_fee_rate, delivery_fee,
        total_amount, seller_payout, delivery_address, delivery_pin, currency,
        status, payment_status, origin_video_id, origin_creator_id, creator_commission,
        metadata, created_at, updated_at
      ) VALUES (
        ${orderNumber}, ${buyerId}, ${sellerId}, ${itemType}, ${itemId},
        ${itemTitle}, ${qty}, ${price}, ${subtotal}, ${platformFee}, ${PLATFORM_FEE_RATE},
        ${delivery}, ${totalAmount}, ${sellerPayout}, ${deliveryAddress || null}, ${deliveryPin},
        ${currency}, 'pending', 'pending',
        ${originVideoId || null}, ${originCreatorId || null}, ${money(creatorCommission || 0)},
        ${metadata ? JSON.stringify(metadata) : null},
        NOW(), NOW()
      )
      RETURNING *
    `;

    // Initialize Paystack payment (NO split) — caller may also create payment separately
    return Response.json({
      success: true,
      order,
      platformFee,
      platformFeeRate: PLATFORM_FEE_RATE,
      deliveryPin,
    });
  } catch (error) {
    console.error('orders/create-v2 error:', error);
    return Response.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
