// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

const CANCEL_WINDOW_MS = 5 * 60 * 1000;

/**
 * POST /api/orders/cancel
 * Body: { orderId }
 * Buyer may cancel within 5 minutes of placing the order (paid or awaiting payment).
 */
export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Please sign in' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const orderId = body.orderId;
    if (!orderId) {
      return Response.json({ error: 'Order ID required' }, { status: 400 });
    }

    const rows = await sql`
      SELECT *
      FROM orders
      WHERE id = ${orderId}
      LIMIT 1
    `;
    const order = rows?.[0];
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    if (String(order.buyer_id) !== String(userId)) {
      return Response.json({ error: 'Only the buyer can cancel this order' }, { status: 403 });
    }

    const terminal = ['cancelled', 'refunded', 'delivered', 'completed'];
    if (terminal.includes(order.status)) {
      return Response.json({ error: 'This order can no longer be cancelled' }, { status: 400 });
    }

    // Once the seller is actively fulfilling (in transit), cancel is blocked
    if (['in_transit', 'ready_for_pickup'].includes(order.status)) {
      return Response.json(
        { error: 'This order is already on the way and cannot be cancelled here' },
        { status: 400 },
      );
    }

    const created = new Date(order.created_at).getTime();
    const elapsed = Date.now() - created;
    if (elapsed > CANCEL_WINDOW_MS) {
      const secsLeft = 0;
      return Response.json(
        {
          error: 'The 5-minute cancel window has ended',
          secondsRemaining: secsLeft,
        },
        { status: 400 },
      );
    }

    await sql`
      UPDATE orders
      SET
        status = 'cancelled',
        payment_status = CASE
          WHEN payment_status = 'paid' THEN 'refund_pending'
          ELSE payment_status
        END,
        updated_at = NOW()
      WHERE id = ${orderId}
    `;

    return Response.json({
      success: true,
      message:
        order.payment_status === 'paid' || order.status === 'paid'
          ? 'Order cancelled. Any paid amount will be refunded according to your payment method.'
          : 'Order cancelled.',
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return Response.json({ error: 'Could not cancel order' }, { status: 500 });
  }
}
