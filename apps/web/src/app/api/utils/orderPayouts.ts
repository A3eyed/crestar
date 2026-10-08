// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { sendAutoPayout } from '@/app/api/utils/paystackTransfer';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CRESTAR MULTI-PARTY PAYOUT ENGINE — per-leg, sequential, idempotent
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Runs only AFTER the buyer has confirmed delivery with their 4-digit PIN and
 * the internal ledger has already moved that order's holds from Pending →
 * Available. Money is spendable in our own books before we ever call Paystack,
 * so a failed transfer just leaves it withdrawable rather than lost.
 *
 * Each recipient is a "leg" with its own row in `order_payout_legs`, its own
 * Paystack reference and its own status, so a failure in one leg can never
 * block or corrupt another, and any single leg can be retried on its own from
 * the admin dashboard.
 *
 *   Seller     PO-S-<orderRef>
 *   Creator    PO-C-<orderRef>
 *   Deliverer  PO-D-<orderRef>
 *
 * The platform fee is simply never transferred out — it stays in Crestar's
 * Paystack balance. There is no ledger movement for it.
 *
 * IDEMPOTENCY: a leg is claimed with a conditional UPDATE
 * (`... WHERE status IN ('pending','failed')`). Two concurrent runs race on
 * that single row and only the winner gets a returned row, so a transfer can
 * never be issued twice for the same leg.
 *
 * RETRY SAFETY: Paystack rejects a duplicate transfer reference, so every
 * retry gets a fresh suffixed reference (`PO-S-ABC-r2`). The original attempt
 * stays recorded in `last_error` / `attempts`.
 */

export const LEG_PREFIX = {
  seller: 'PO-S',
  creator: 'PO-C',
  deliverer: 'PO-D',
};

export const LEG_LABEL = {
  seller: 'Seller payout',
  creator: 'Creator commission',
  deliverer: 'Delivery payout',
};

function money(value) {
  return Math.round((parseFloat(value) || 0) * 100) / 100;
}

function orderRef(order) {
  return order.order_number || String(order.id).slice(0, 8).toUpperCase();
}

function legReference(leg, order, attempt) {
  const base = `${LEG_PREFIX[leg]}-${orderRef(order)}`;
  return attempt > 0 ? `${base}-r${attempt + 1}` : base;
}

/** Which parties are owed money on this order, and how much. */
export function buildLegs(order) {
  const legs = [];

  const sellerAmount = money(order.seller_payout);
  if (order.seller_id && sellerAmount > 0) {
    legs.push({ leg: 'seller', recipientUserId: String(order.seller_id), amount: sellerAmount });
  }

  const creatorAmount = money(order.creator_commission);
  if (order.origin_creator_id && creatorAmount > 0) {
    legs.push({
      leg: 'creator',
      recipientUserId: String(order.origin_creator_id),
      amount: creatorAmount,
    });
  }

  const delivererAmount = money(order.deliverer_fee);
  if (order.deliverer_id && delivererAmount > 0) {
    legs.push({
      leg: 'deliverer',
      recipientUserId: String(order.deliverer_id),
      amount: delivererAmount,
    });
  }

  return legs;
}

/** Create the leg rows for an order if they don't exist yet.
 *
 * The deliverer leg is skipped when `/api/deliverers/confirm-delivery` already
 * credited the delivery fee straight into that deliverer's Available balance —
 * otherwise we'd hand them the same fee twice, once as a wallet credit and
 * again as a Paystack Transfer.
 */
export async function ensureLegs(order) {
  let legs = buildLegs(order);

  if (legs.some((l) => l.leg === 'deliverer')) {
    const alreadyCredited = await sql`
      SELECT id FROM crestar_wallet_transactions
      WHERE related_order_id = ${order.id}
        AND transaction_type = 'delivery_fee'
        AND status = 'completed'
      LIMIT 1
    `;
    if (alreadyCredited.length > 0) {
      legs = legs.filter((l) => l.leg !== 'deliverer');
    }
  }

  for (const leg of legs) {
    await sql`
      INSERT INTO order_payout_legs (
        order_id, leg, recipient_user_id, amount, currency, reference, status
      ) VALUES (
        ${order.id}, ${leg.leg}, ${leg.recipientUserId}, ${leg.amount},
        ${order.currency || 'GHS'}, ${legReference(leg.leg, order, 0)}, 'pending'
      )
      ON CONFLICT (order_id, leg) DO UPDATE
        SET amount = EXCLUDED.amount,
            recipient_user_id = EXCLUDED.recipient_user_id,
            updated_at = now()
        WHERE order_payout_legs.status IN ('pending', 'failed')
    `;
  }

  return sql`
    SELECT * FROM order_payout_legs WHERE order_id = ${order.id} ORDER BY leg
  `;
}

/** Roll the individual leg statuses up into orders.payout_status. */
export async function refreshOrderPayoutStatus(orderId) {
  const legs = await sql`
    SELECT status FROM order_payout_legs WHERE order_id = ${orderId}
  `;

  let status = 'not_applicable';
  if (legs.length > 0) {
    const statuses = legs.map((l) => l.status);
    if (statuses.every((s) => s === 'paid')) status = 'paid';
    else if (statuses.some((s) => s === 'failed')) status = 'failed';
    else if (statuses.some((s) => s === 'retained')) status = 'partial';
    else if (statuses.some((s) => s === 'processing')) status = 'processing';
    else status = 'pending';
  }

  await sql`
    UPDATE orders SET payout_status = ${status}, updated_at = now() WHERE id = ${orderId}
  `;

  return status;
}

/** Normalise whatever sendAutoPayout hands back into a leg status. */
function interpret(result) {
  if (!result) return { status: 'failed', error: 'No response from payout engine' };

  if (result.status === 'retained') {
    return {
      status: 'retained',
      error: result.error || result.reason || 'Kept in wallet — no payout destination on file',
    };
  }

  const ok =
    result.success === true ||
    result.status === 'paid' ||
    result.status === 'success' ||
    result.status === 'sent' ||
    result.status === 'pending';

  if (ok) {
    return { status: 'paid', transferCode: result.transferCode || result.transfer_code || null };
  }

  return { status: 'failed', error: result.error || result.message || 'Transfer failed' };
}

/**
 * Pay one leg. Claims the row first so concurrent callers can't double-send.
 */
async function runLeg(order, legRow) {
  const [claimed] = await sql`
    UPDATE order_payout_legs
    SET status = 'processing', attempts = attempts + 1, updated_at = now()
    WHERE id = ${legRow.id} AND status IN ('pending', 'failed')
    RETURNING id, attempts, leg, amount, recipient_user_id
  `;

  if (!claimed) {
    return { leg: legRow.leg, status: legRow.status, skipped: true };
  }

  const attempt = (claimed.attempts || 1) - 1;
  const reference = legReference(legRow.leg, order, attempt);

  await sql`
    UPDATE order_payout_legs SET reference = ${reference}, updated_at = now()
    WHERE id = ${legRow.id}
  `;

  let outcome;
  try {
    const result = await sendAutoPayout({
      userId: legRow.recipient_user_id,
      amount: money(legRow.amount),
      reference,
      reason: `Crestar ${LEG_LABEL[legRow.leg].toLowerCase()} — order ${orderRef(order)}`,
      orderId: order.id,
    });
    outcome = interpret(result);
  } catch (err) {
    console.error(`[payouts] leg ${legRow.leg} threw on order ${order.id}:`, err);
    outcome = { status: 'failed', error: err.message };
  }

  await sql`
    UPDATE order_payout_legs
    SET status = ${outcome.status},
        last_error = ${outcome.error || null},
        paystack_transfer_code = COALESCE(${outcome.transferCode || null}, paystack_transfer_code),
        updated_at = now()
    WHERE id = ${legRow.id}
  `;

  return { leg: legRow.leg, reference, amount: money(legRow.amount), ...outcome };
}

/**
 * Pay every outstanding leg on an order, sequentially.
 *
 * Sequential — not parallel — on purpose: Paystack's Transfer API serialises
 * against a single account balance, and firing three at once makes partial
 * failures much harder to reason about when you're reconciling later.
 *
 * @param {object}  order      full orders row (must already be escrow-released)
 * @param {object}  options
 * @param {string}  options.only  pay a single leg only ('seller'|'creator'|'deliverer')
 */
export async function payoutOrderLegs(order, options = {}) {
  const { only = null } = options;

  const allLegs = await ensureLegs(order);
  const targets = allLegs.filter((l) => {
    if (only && l.leg !== only) return false;
    return l.status === 'pending' || l.status === 'failed';
  });

  const results = [];
  for (const legRow of targets) {
    results.push(await runLeg(order, legRow));
  }

  const payoutStatus = await refreshOrderPayoutStatus(order.id);

  return { payoutStatus, results, legs: await legsForOrder(order.id) };
}

/** All legs for an order, shaped for the admin UI. */
export async function legsForOrder(orderId) {
  return sql`
    SELECT l.id, l.leg, l.recipient_user_id, l.amount, l.currency, l.reference,
           l.status, l.attempts, l.last_error, l.paystack_transfer_code,
           l.created_at, l.updated_at,
           COALESCE(NULLIF(au.business_name, ''), au.display_name, au.username, au.name) AS recipient_name,
           au.username AS recipient_handle
    FROM order_payout_legs l
    LEFT JOIN auth_users au ON au.id = l.recipient_user_id
    WHERE l.order_id = ${orderId}
    ORDER BY CASE l.leg WHEN 'seller' THEN 1 WHEN 'creator' THEN 2 ELSE 3 END
  `;
}

/**
 * Backwards-compatible entry point. The delivery-confirmation routes used to
 * call `payoutOrderRecipients(order)` and read `{ payoutStatus, results }`;
 * they still can, they just get per-leg tracking for free now.
 */
export async function payoutOrderRecipients(order) {
  return payoutOrderLegs(order);
}
