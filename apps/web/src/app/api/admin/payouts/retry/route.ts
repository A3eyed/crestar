// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { canAccessAdmin } from '@/app/api/utils/adminAuth';
import { payoutOrderLegs, legsForOrder } from '@/app/api/utils/orderPayouts';
import { releaseOrderEscrow } from '@/app/api/utils/orderSettlement';

/**
 * One-click retry for a failed payout leg.
 *
 * POST { orderId, leg }        — retry a single leg ('seller'|'creator'|'deliverer')
 * POST { orderId }             — retry every outstanding leg on the order
 *
 * A retry gets a fresh Paystack reference (`PO-S-ABC-r2`) because Paystack
 * rejects duplicates, and the leg row is claimed with a conditional UPDATE so
 * two admins mashing the button can't double-send.
 */
export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [admin] = await sql`
      SELECT id, role, is_admin, username FROM auth_users WHERE id = ${userId} LIMIT 1
    `;
    if (!admin || (!admin.is_admin && !canAccessAdmin(admin))) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const { orderId, leg = null } = await request.json();
    if (!orderId) return Response.json({ error: 'Order ID is required' }, { status: 400 });

    if (leg && !['seller', 'creator', 'deliverer'].includes(leg)) {
      return Response.json({ error: 'Unknown payout leg' }, { status: 400 });
    }

    const [order] = await sql`SELECT * FROM orders WHERE id = ${orderId} LIMIT 1`;
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    if (order.status !== 'completed') {
      return Response.json(
        { error: 'Only delivery-confirmed orders can be paid out' },
        { status: 400 }
      );
    }

    // Belt and braces: make sure the ledger release actually happened before
    // we try to push money out again. It's a no-op if it already did.
    await releaseOrderEscrow(order);

    const result = await payoutOrderLegs(order, { only: leg });

    await sql`
      INSERT INTO admin_logs (admin_id, action_type, target_entity_type, target_entity_id, details)
      VALUES (${admin.id}, 'retry_payout', 'order', ${String(order.id)},
              ${JSON.stringify({ leg: leg || 'all', outcome: result.payoutStatus, results: result.results })})
    `;

    return Response.json({
      success: true,
      payoutStatus: result.payoutStatus,
      results: result.results,
      legs: await legsForOrder(orderId),
    });
  } catch (err) {
    console.error('Payout retry error:', err);
    return Response.json({ error: 'Retry failed' }, { status: 500 });
  }
}
