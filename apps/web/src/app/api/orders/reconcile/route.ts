// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { settleOrderPaid, releaseOrderEscrow } from '@/app/api/utils/orderSettlement';
import { payoutOrderLegs } from '@/app/api/utils/orderPayouts';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ORDER RECONCILIATION SWEEP — the safety net for "missing seller orders"
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Orders are written before the buyer pays, and sellers only see them once
 * something flips them to 'paid'. Normally that's the Paystack webhook or
 * /api/payments/verify. But webhooks get dropped, retries get exhausted, buyers
 * close the browser before the success redirect, and the UPDATE that attaches
 * the payment reference can fail on its own. Any of those leaves a real,
 * genuinely-paid order stuck at 'pending_payment' and invisible forever.
 *
 * This endpoint asks Paystack the only question that matters — "was this
 * actually paid?" — for every recently-stuck order, and settles the ones that
 * were. It is the authority of last resort.
 *
 * It also recovers orders whose `payment_reference` never got written, because
 * /api/payments/initialize uses `order_number` as the Paystack reference, so
 * the order number itself is a valid thing to look up.
 *
 * USAGE
 *   POST /api/orders/reconcile          — admins (session) or cron (x-cron-secret)
 *   GET  /api/orders/reconcile?orderId= — check/settle a single order
 *
 * Run it on a schedule (every 10–15 minutes is plenty) and the missing-order
 * class of bug stops existing.
 */

const LOOKBACK_DAYS = 7;
const MAX_PER_RUN = 100;

async function isAuthorised(request) {
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET) {
    return { ok: true, actor: 'cron' };
  }

  const userId = await resolveUserId(request);
  if (!userId) return { ok: false };

  const [user] = await sql`
    SELECT is_admin, role FROM auth_users WHERE id = ${userId} LIMIT 1
  `;
  const admin = user?.is_admin || ['admin', 'owner', 'moderator'].includes(user?.role);
  return { ok: Boolean(admin), actor: userId, userId };
}

/** Ask Paystack whether a reference was actually paid. */
async function verifyWithPaystack(reference) {
  if (!reference) return { paid: false, reason: 'no_reference' };

  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    if (res.status === 404) return { paid: false, reason: 'unknown_reference' };
    if (!res.ok) return { paid: false, reason: `paystack_${res.status}` };

    const json = await res.json();
    if (json?.data?.status !== 'success') {
      return { paid: false, reason: json?.data?.status || 'not_successful' };
    }

    return {
      paid: true,
      channel: json.data.channel || 'paystack',
      amount: (json.data.amount || 0) / 100,
      reference: json.data.reference,
    };
  } catch (err) {
    console.error('[reconcile] Paystack verify failed:', err);
    return { paid: false, reason: 'verify_error' };
  }
}

/** Reconcile one order row. Returns a small audit record. */
async function reconcileOrder(order) {
  const candidates = [order.payment_reference, order.order_number].filter(Boolean);

  for (const reference of candidates) {
    const result = await verifyWithPaystack(reference);
    if (!result.paid) continue;

    // Guard against settling an order for less than it costs.
    const expected = parseFloat(order.total_amount) || 0;
    if (expected > 0 && result.amount + 0.01 < expected) {
      console.warn(
        `[reconcile] Order ${order.order_number}: Paystack shows ${result.amount} but order is ${expected} — skipping`
      );
      await sql`
        UPDATE orders
        SET reconcile_attempts = COALESCE(reconcile_attempts, 0) + 1, reconciled_at = now()
        WHERE id = ${order.id}
      `;
      return { orderId: order.id, orderNumber: order.order_number, action: 'underpaid' };
    }

    const settlement = await settleOrderPaid(order.id, {
      channel: result.channel,
      reference: result.reference,
    });

    await sql`
      UPDATE orders
      SET reconcile_attempts = COALESCE(reconcile_attempts, 0) + 1, reconciled_at = now()
      WHERE id = ${order.id}
    `;

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      sellerId: order.seller_id,
      action: settlement.settled ? 'recovered' : 'already_settled',
      amount: result.amount,
    };
  }

  await sql`
    UPDATE orders
    SET reconcile_attempts = COALESCE(reconcile_attempts, 0) + 1, reconciled_at = now()
    WHERE id = ${order.id}
  `;

  return { orderId: order.id, orderNumber: order.order_number, action: 'unpaid' };
}

/**
 * ESCROW AUTO-RELEASE SWEEP — the 3-day fallback.
 *
 * When a deliverer confirms delivery, the order gets
 * `escrow_release_at = NOW() + 3 days`. If the buyer never confirms with
 * their PIN, this sweep releases the held funds (Pending → Available) and
 * triggers the Paystack payout legs, so money can never be stuck forever.
 */
async function autoReleaseDueEscrows() {
  const due = await sql`
    SELECT * FROM orders
    WHERE status = 'delivered'
      AND escrow_release_at IS NOT NULL
      AND escrow_release_at <= now()
      AND escrow_released_at IS NULL
      AND payment_status = 'paid'
    ORDER BY escrow_release_at ASC
    LIMIT ${MAX_PER_RUN}
  `;

  const released = [];
  for (const order of due) {
    try {
      const releaseResult = await releaseOrderEscrow(order);

      // Mark the order completed — the auto-release window has elapsed.
      await sql`
        UPDATE orders
        SET status = 'completed',
            completed_at = COALESCE(completed_at, now()),
            updated_at = now()
        WHERE id = ${order.id} AND status = 'delivered'
      `;

      // Push the Paystack transfers out. Failures are non-fatal — funds stay
      // in the recipients' Available balances for manual withdrawal.
      let payout = null;
      try {
        payout = await payoutOrderLegs(order);
      } catch (payoutErr) {
        console.error(`[reconcile] auto-release payout failed for order ${order.id}:`, payoutErr);
      }

      released.push({
        orderId: order.id,
        orderNumber: order.order_number,
        released: releaseResult.released,
        payoutStatus: payout?.payoutStatus || 'pending',
      });

      console.log(
        `⏱️ Auto-released escrow for order ${order.order_number || order.id} (3-day window elapsed)`
      );
    } catch (err) {
      console.error(`[reconcile] auto-release failed for order ${order.id}:`, err);
    }
  }

  return released;
}

export async function POST(request) {
  const authz = await isAuthorised(request);
  if (!authz.ok) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stuck = await sql`
      SELECT id, order_number, payment_reference, total_amount, seller_id, created_at
      FROM orders
      WHERE status = 'pending_payment'
        AND created_at > now() - make_interval(days => ${LOOKBACK_DAYS})
      ORDER BY created_at DESC
      LIMIT ${MAX_PER_RUN}
    `;

    const results = [];
    for (const order of stuck) {
      results.push(await reconcileOrder(order));
    }

    const recovered = results.filter((r) => r.action === 'recovered');
    if (recovered.length > 0) {
      console.log(`🛟 Reconciliation recovered ${recovered.length} paid order(s) for sellers`);
    }

    // Escrow auto-release fallback (3-day window after delivery)
    const autoReleased = await autoReleaseDueEscrows();

    return Response.json({
      success: true,
      scanned: stuck.length,
      recovered: recovered.length,
      autoReleased: autoReleased.length,
      results,
      escrowReleases: autoReleased,
    });
  } catch (error) {
    console.error('Reconcile error:', error);
    return Response.json({ error: 'Reconciliation failed' }, { status: 500 });
  }
}

// GET /api/orders/reconcile?orderId=… — reconcile (or just inspect) one order
export async function GET(request) {
  const authz = await isAuthorised(request);
  if (!authz.ok) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const orderId = url.searchParams.get('orderId');

  if (!orderId) {
    const [summary] = await sql`
      SELECT COUNT(*)::int AS stuck,
             COALESCE(SUM(total_amount), 0) AS value_at_risk
      FROM orders
      WHERE status = 'pending_payment'
        AND created_at > now() - make_interval(days => ${LOOKBACK_DAYS})
    `;
    return Response.json({ summary });
  }

  const [order] = await sql`
    SELECT id, order_number, payment_reference, total_amount, seller_id, status
    FROM orders WHERE id = ${orderId} LIMIT 1
  `;
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

  if (order.status !== 'pending_payment') {
    return Response.json({ order, action: 'nothing_to_do' });
  }

  const result = await reconcileOrder(order);
  return Response.json({ order, result });
}
