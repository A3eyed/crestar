// @ts-nocheck
import sql from '@/app/api/utils/sql';

/**
 * POST /api/payments/initialize
 * Initialize Paystack payment for an existing order
 *
 * PAYMENT MODEL (TikTok-inspired, Paystack-compliant):
 * - ALL funds collected to Crestar's main Paystack balance
 * - NO automatic splits/subaccounts (removed for escrow compliance)
 * - On charge.success webhook: create order + credit internal ledger (pending balance)
 * - On delivery PIN confirmation: release pending → available in ledger
 * - Sellers cash out via Paystack Transfer API (manual or auto-payout)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, email } = body;

    if (!orderId || !email) {
      return Response.json({ error: 'Order ID and email are required' }, { status: 400 });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error('❌ PAYSTACK_SECRET_KEY is not configured');
      return Response.json(
        { error: 'Payment service is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Load order (we don't need subaccount anymore but keep query for compatibility)
    const [order] = await sql`
      SELECT o.* 
      FROM orders o
      WHERE o.id = ${orderId}
    `;

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'pending_payment') {
      return Response.json({ error: 'Order is not pending payment' }, { status: 400 });
    }

    // Build Paystack initialization payload
    const amount = Math.round(parseFloat(order.total_amount) * 100); // GHS to pesewas
    const reference = order.order_number || `ORD-${order.id}`;

    const paystackPayload = {
      email,
      amount,
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/payment/callback`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        custom_fields: [
          {
            display_name: 'Order Number',
            variable_name: 'order_number',
            value: order.order_number || order.id,
          },
          {
            display_name: 'Buyer ID',
            variable_name: 'buyer_id',
            value: order.buyer_id,
          },
        ],
      },
      // NO split object — all funds go to main balance
    };

    console.log(
      `💳 Initializing payment for order ${orderId} — GH₵${(amount / 100).toFixed(2)} to main balance`
    );

    // Initialize payment with Paystack
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackPayload),
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json();
      console.error('Paystack error:', errorData);
      return Response.json(
        { error: errorData.message || 'Payment initialization failed' },
        { status: 400 }
      );
    }

    const paystackData = await paystackResponse.json();

    // Update order with payment reference
    await sql`
      UPDATE orders 
      SET payment_reference = ${paystackData.data.reference}, 
          metadata = COALESCE(metadata, '{}'::jsonb) || '{"direct_split": false}'::jsonb,
          updated_at = NOW()
      WHERE id = ${orderId}
    `;

    return Response.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    return Response.json({ error: 'Payment initialization failed' }, { status: 500 });
  }
}
