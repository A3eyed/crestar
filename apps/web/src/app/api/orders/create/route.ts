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

// Auto-assign delivery to an accepted deliverer for this seller
async function autoAssignDelivery(orderId, sellerId, deliveryAddress, deliveryFee) {
  try {
    // Find accepted deliverers for this seller who are available
    const deliverers = await sql(
      `SELECT dsr.deliverer_user_id, dp.full_name, dp.rating, dp.total_deliveries
       FROM deliverer_seller_requests dsr
       JOIN deliverer_profiles dp ON dp.user_id = dsr.deliverer_user_id
       WHERE dsr.seller_user_id = $1
         AND dsr.status = 'accepted'
         AND dp.verification_status = 'approved'
         AND dp.is_available = true
       ORDER BY dp.rating DESC, dp.total_deliveries DESC`,
      [sellerId]
    );

    if (deliverers.length === 0) return null;

    // Pick the top-rated available deliverer
    const selectedDeliverer = deliverers[0];

    // Create a delivery assignment
    const pickupAddress = JSON.stringify({ note: 'Pickup from seller' });
    const deliveryAddr =
      typeof deliveryAddress === 'string' ? deliveryAddress : JSON.stringify(deliveryAddress);

    const result = await sql(
      `INSERT INTO delivery_assignments (
        order_id, deliverer_user_id, status, pickup_address, delivery_address,
        delivery_fee, created_at
      ) VALUES ($1, $2, 'pending', $3, $4, $5, NOW())
      RETURNING *`,
      [orderId, selectedDeliverer.deliverer_user_id, pickupAddress, deliveryAddr, deliveryFee || 0]
    );

    // Update the order with the deliverer
    await sql(`UPDATE orders SET deliverer_id = $1, deliverer_fee = $2 WHERE id = $3`, [
      selectedDeliverer.deliverer_user_id,
      deliveryFee || 0,
      orderId,
    ]);

    return result[0];
  } catch (error) {
    console.error('Auto-assign delivery error:', error);
    return null;
  }
}

/**
 * POST /api/orders/create
 * Create a single-item order and initialize payment
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

    // Calculate delivery fee from seller's zones
    let deliveryFee = 0;
    if (deliveryAddress) {
      const zones = await sql(
        `SELECT * FROM seller_delivery_zones
         WHERE seller_user_id = $1 AND is_active = true
         ORDER BY is_free_delivery DESC, delivery_fee ASC LIMIT 1`,
        [item.seller_id]
      );
      if (zones.length > 0) {
        deliveryFee = zones[0].is_free_delivery ? 0 : parseFloat(zones[0].delivery_fee);
      }
    }

    // Crestar charges ONE flat 5% platform fee — the only fee on the platform,
    // identical for every program. No subscriptions. The `crestar_apply_platform_fee`
    // database trigger nets each payout leg too, so these values match the ledger.
    const subtotal = money(unitPrice * quantity);
    const platformFee = platformFeeOn(subtotal);
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

    // Auto-assign delivery if seller has accepted deliverers
    const assignment = await autoAssignDelivery(
      order.id,
      item.seller_id,
      deliveryAddress,
      deliveryFee
    );

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
      deliveryAssignment: assignment,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return Response.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
