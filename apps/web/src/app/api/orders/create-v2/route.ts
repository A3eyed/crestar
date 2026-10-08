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
    const body = await request.json();

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const buyerId = session.user.id.toString();
    const { itemType, itemId, quantity = 1, deliveryAddress, selectedTier } = body;

    // Fetch item details
    let item, seller, unitPrice, itemTitle;

    if (itemType === 'product') {
      [item] = await sql`SELECT * FROM products WHERE id = ${itemId}`;
      if (!item) {
        return Response.json({ error: 'Product not found' }, { status: 404 });
      }
      unitPrice = item.price;
      itemTitle = item.title;
      seller = await sql`
        SELECT * FROM professional_profiles WHERE user_id = ${item.seller_id}
      `.then((rows) => rows[0]);
    } else {
      [item] = await sql`SELECT * FROM services WHERE id = ${itemId}`;
      if (!item) {
        return Response.json({ error: 'Service not found' }, { status: 404 });
      }
      unitPrice =
        selectedTier === 'basic'
          ? item.basic_price
          : selectedTier === 'standard'
            ? item.standard_price
            : item.premium_price;
      itemTitle = `${item.title} (${selectedTier})`;
      seller = await sql`
        SELECT * FROM professional_profiles WHERE user_id = ${item.seller_id}
      `.then((rows) => rows[0]);
    }

    // Crestar charges ONE flat 3% platform fee — the only fee on the platform,
    // identical for every program.
    const subtotal = money(unitPrice * quantity);
    const platformFee = platformFeeOn(subtotal);
    const deliveryFee = 0; // TODO: Calculate based on distance/weight
    const totalAmount = money(subtotal + deliveryFee);
    const sellerPayout = netOfPlatformFee(subtotal);

    // Generate order number and delivery PIN
    const orderNumber = generateOrderNumber();
    const deliveryPin = generateDeliveryPin();

    // Calculate escrow release time
    let escrowReleaseAt = null;
    if (item.product_type === 'food_beverage') {
      const hoursToAdd = seller?.is_registered_business ? 24 : 72;
      escrowReleaseAt = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
    }

    // Create order
    const [order] = await sql`
      INSERT INTO orders (
        order_number, buyer_id, seller_id, item_type, item_id, item_title,
        quantity, unit_price, subtotal, platform_fee, platform_fee_rate, delivery_fee,
        total_amount, seller_payout, delivery_address, delivery_pin,
        delivery_latitude, delivery_longitude, escrow_release_at, status
      ) VALUES (
        ${orderNumber}, ${buyerId}, ${item.seller_id}, ${itemType}, ${itemId},
        ${itemTitle}, ${quantity}, ${unitPrice}, ${subtotal}, ${platformFee}, ${PLATFORM_FEE_RATE},
        ${deliveryFee}, ${totalAmount}, ${sellerPayout},
        ${JSON.stringify(deliveryAddress)}, ${deliveryPin},
        ${deliveryAddress?.latitude || null}, ${deliveryAddress?.longitude || null},
        ${escrowReleaseAt}, 'pending_payment'
      )
      RETURNING *
    `;

    console.log(`💳 Creating order ${order.id} — GH₵${totalAmount.toFixed(2)} to main balance`);

    // Initialize Paystack payment (NO split)
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: session.user.email || 'buyer@example.com',
        amount: Math.round(totalAmount * 100),
        reference: orderNumber,
        metadata: {
          order_id: order.id,
          order_number: orderNumber,
          buyer_id: buyerId,
          seller_id: item.seller_id,
          custom_fields: [
            {
              display_name: 'Order Number',
              variable_name: 'order_number',
              value: orderNumber,
            },
          ],
        },
        // NO split object — all funds go to main balance
      }),
    });

    if (!paystackResponse.ok) {
      throw new Error('Failed to initialize payment');
    }

    const paystackData = await paystackResponse.json();

    // Update order with payment reference
    await sql`
      UPDATE orders
      SET payment_reference = ${paystackData.data.reference},
          metadata = COALESCE(metadata, '{}'::jsonb) || '{"direct_split": false}'::jsonb,
          updated_at = NOW()
      WHERE id = ${order.id}
    `;

    return Response.json({
      success: true,
      order: {
        ...order,
        payment_reference: paystackData.data.reference,
      },
      paymentUrl: paystackData.data.authorization_url,
      deliveryPin,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return Response.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
