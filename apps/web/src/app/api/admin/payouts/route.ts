// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { canAccessAdmin } from '@/app/api/utils/adminAuth';
import { ensureLegs } from '@/app/api/utils/orderPayouts';

/**
 * Admin payout register — every order, broken down by payout leg.
 *
 * Answers the question the old dashboard couldn't: "this order completed, so
 * who actually got paid, and which leg failed?" Seller, creator and deliverer
 * each have their own status, reference, attempt count and last error.
 */

async function requireAdmin(request) {
  const userId = await resolveUserId(request);
  if (!userId) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };

  const [user] = await sql`
    SELECT id, role, is_admin, username FROM auth_users WHERE id = ${userId} LIMIT 1
  `;
  if (!user || (!user.is_admin && !canAccessAdmin(user))) {
    return { error: Response.json({ error: 'Access denied' }, { status: 403 }) };
  }
  return { user };
}

export async function GET(request) {
  const { error, user } = await requireAdmin(request);
  if (error) return error;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all'; // all | failed | pending | paid
    const search = (url.searchParams.get('search') || '').trim();
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const where = [`o.status IN ('completed', 'delivered', 'paid')`];
    const params = [];

    if (status === 'failed') {
      where.push(`o.payout_status = 'failed'`);
    } else if (status === 'pending') {
      where.push(`COALESCE(o.payout_status, 'pending') IN ('pending', 'processing', 'partial')`);
    } else if (status === 'paid') {
      where.push(`o.payout_status = 'paid'`);
    }

    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(o.order_number ILIKE $${params.length} OR o.item_title ILIKE $${params.length} OR seller.username ILIKE $${params.length})`
      );
    }

    params.push(limit, offset);

    const orders = await sql(
      `SELECT o.id, o.order_number, o.status, o.payout_status, o.total_amount,
              o.platform_fee, o.seller_payout, o.creator_commission, o.deliverer_fee,
              o.currency, o.completed_at, o.created_at, o.escrow_released_at,
              COALESCE(NULLIF(seller.business_name, ''), seller.display_name, seller.username, seller.name) AS seller_name,
              seller.username AS seller_handle,
              COALESCE(NULLIF(buyer.business_name, ''), buyer.display_name, buyer.username, buyer.name) AS buyer_name
       FROM orders o
       LEFT JOIN auth_users seller ON seller.id = o.seller_id
       LEFT JOIN auth_users buyer  ON buyer.id  = o.buyer_id
       WHERE ${where.join(' AND ')}
       ORDER BY COALESCE(o.completed_at, o.created_at) DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Attach legs. Orders confirmed before per-leg tracking existed get their
    // legs backfilled on first view so the admin sees a complete picture.
    const withLegs = [];
    for (const order of orders) {
      let legs = await sql`
        SELECT l.id, l.leg, l.recipient_user_id, l.amount, l.currency, l.reference,
               l.status, l.attempts, l.last_error, l.paystack_transfer_code, l.updated_at,
               COALESCE(NULLIF(au.business_name, ''), au.display_name, au.username, au.name) AS recipient_name
        FROM order_payout_legs l
        LEFT JOIN auth_users au ON au.id = l.recipient_user_id
        WHERE l.order_id = ${order.id}
        ORDER BY CASE l.leg WHEN 'seller' THEN 1 WHEN 'creator' THEN 2 ELSE 3 END
      `;

      if (legs.length === 0 && order.status === 'completed') {
        await ensureLegs(order).catch(() => {});
        legs = await sql`
          SELECT l.id, l.leg, l.recipient_user_id, l.amount, l.currency, l.reference,
                 l.status, l.attempts, l.last_error, l.paystack_transfer_code, l.updated_at,
                 COALESCE(NULLIF(au.business_name, ''), au.display_name, au.username, au.name) AS recipient_name
          FROM order_payout_legs l
          LEFT JOIN auth_users au ON au.id = l.recipient_user_id
          WHERE l.order_id = ${order.id}
          ORDER BY CASE l.leg WHEN 'seller' THEN 1 WHEN 'creator' THEN 2 ELSE 3 END
        `;
      }

      withLegs.push({ ...order, legs });
    }

    const [stats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'failed')::int      AS failed_legs,
        COUNT(*) FILTER (WHERE status = 'retained')::int    AS retained_legs,
        COUNT(*) FILTER (WHERE status = 'paid')::int        AS paid_legs,
        COUNT(*) FILTER (WHERE status IN ('pending','processing'))::int AS open_legs,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('failed','retained')), 0) AS amount_stuck
      FROM order_payout_legs
    `;

    const [stuckOrders] = await sql`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0) AS value
      FROM orders
      WHERE status = 'pending_payment' AND created_at > now() - interval '7 days'
    `;

    return Response.json({
      orders: withLegs,
      stats: { ...stats, unsettledOrders: stuckOrders },
      viewer: user.username,
    });
  } catch (err) {
    console.error('Admin payouts error:', err);
    return Response.json({ error: 'Could not load payouts' }, { status: 500 });
  }
}
