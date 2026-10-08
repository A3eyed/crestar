// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { notifyNewOrderOnce } from '@/app/api/utils/notify';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CRESTAR ORDER SETTLEMENT — one idempotent path from "paid" to "seller sees it"
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY THIS FILE EXISTS
 *
 * Orders were being created with status 'pending_payment' BEFORE the buyer
 * paid, and `/api/orders/list?role=seller` deliberately hides that status.
 * The order only became visible once *something* flipped it to 'paid'. Three
 * different things could do that (the Paystack webhook, /payments/verify, or
 * nothing at all), none of them guarded, and if all three missed — webhook
 * retry exhausted, buyer closed the browser before the redirect, a network
 * blip on the reference UPDATE — the money was collected and the seller never
 * saw an order. That is the "missing seller orders" bug.
 *
 * Everything that must happen when money lands now lives here, behind one
 * function, and every step is individually idempotent:
 *
 *   1. status → 'paid' via an atomic compare-and-set (only one caller wins)
 *   2. inventory decremented exactly once   (guarded by orders.inventory_applied)
 *   3. escrow holds written exactly once    (guarded by orders.ledger_applied
 *                                            AND by existing ledger rows, so it
 *                                            can never double up with the
 *                                            webhook's own ledger writes)
 *   4. seller notified exactly once         (guarded by notifyNewOrderOnce)
 *
 * Callers: the Paystack webhook, /api/payments/verify, and the reconciliation
 * sweep at /api/orders/reconcile. Any one of them succeeding is enough. Calling
 * all three is harmless.
 */

const TERMINAL_UNPAID = new Set(['cancelled', 'refunded', 'failed']);

/** Load the full order row we need for settlement. */
async function loadOrder(orderId) {
  const [order] = await sql`
    SELECT id, order_number, buyer_id, seller_id, status, payment_status,
           payment_reference, payment_method, total_amount, subtotal,
           platform_fee, seller_payout, delivery_fee, deliverer_fee,
           deliverer_id, creator_commission, origin_creator_id, currency,
           item_type, item_id, item_title, quantity,
           inventory_applied, ledger_applied, paid_at, metadata
    FROM orders WHERE id = ${orderId} LIMIT 1
  `;
  return order || null;
}

/**
 * Decrement stock for everything in the order — exactly once.
 *
 * The `orders.inventory_applied = false` predicate inside the UPDATE is the
 * lock: two concurrent callers race on that single row and only the winner
 * gets a returned row, so the decrement below can never run twice.
 */
export async function applyInventory(order) {
  try {
    const [claimed] = await sql`
      UPDATE orders SET inventory_applied = true, updated_at = now()
      WHERE id = ${order.id} AND COALESCE(inventory_applied, false) = false
      RETURNING id
    `;
    if (!claimed) return { applied: false, reason: 'already_applied' };

    // Multi-item orders keep their lines in order_items.
    const lines = await sql`
      SELECT product_id, variant_id, quantity
      FROM order_items
      WHERE order_id = ${order.id} AND product_id IS NOT NULL
    `;

    const targets = lines.length
      ? lines
      : order.item_type === 'product' && order.item_id
        ? [{ product_id: order.item_id, variant_id: null, quantity: order.quantity || 1 }]
        : [];

    for (const line of targets) {
      const qty = Math.max(1, parseInt(line.quantity, 10) || 1);

      await sql`
        UPDATE products
        SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - ${qty}),
            updated_at = now()
        WHERE id = ${line.product_id}
      `;

      if (line.variant_id) {
        await sql`
          UPDATE product_variants
          SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - ${qty})
          WHERE id = ${line.variant_id}
        `;
      }
    }

    return { applied: true, lines: targets.length };
  } catch (err) {
    console.error('[settlement] applyInventory failed:', err);
    // Never let inventory bookkeeping block the seller from seeing the order.
    return { applied: false, error: err.message };
  }
}

/** Resolve (or lazily create) the wallet account for a user id. */
async function walletForUser(userId) {
  if (!userId) return null;
  const [u] = await sql`
    SELECT identity_id FROM auth_users WHERE id = ${String(userId)} LIMIT 1
  `;
  if (!u?.identity_id) return null;

  let [wallet] = await sql`
    SELECT id, actual_balance, pending_balance
    FROM wallet_accounts WHERE identity_id = ${u.identity_id} LIMIT 1
  `;
  if (!wallet) {
    [wallet] = await sql`
      INSERT INTO wallet_accounts (identity_id, account_type, actual_balance, pending_balance)
      VALUES (${u.identity_id}, 'personal', 0, 0)
      ON CONFLICT (identity_id) DO UPDATE SET updated_at = now()
      RETURNING id, actual_balance, pending_balance
    `;
  }
  return wallet || null;
}

/** Write one pending (escrowed) ledger entry for a party. */
async function holdForParty({ userId, amount, type, order, label }) {
  const value = Math.round((parseFloat(amount) || 0) * 100) / 100;
  if (!userId || value <= 0) return null;

  const wallet = await walletForUser(userId);
  if (!wallet) {
    console.warn(`[settlement] no wallet for user ${userId} on order ${order.id}`);
    return null;
  }

  const pendingBefore = parseFloat(wallet.pending_balance) || 0;
  const pendingAfter = pendingBefore + value;

  await sql`
    UPDATE wallet_accounts
    SET pending_balance = ${pendingAfter}, updated_at = now()
    WHERE id = ${wallet.id}
  `;

  await sql`
    INSERT INTO crestar_wallet_transactions (
      wallet_account_id, transaction_type, amount, currency,
      actual_balance_before, actual_balance_after,
      pending_balance_before, pending_balance_after,
      reference, description, status, related_user_id, related_order_id,
      completed_at
    ) VALUES (
      ${wallet.id}, ${type}, ${value}, ${order.currency || 'GHS'},
      ${parseFloat(wallet.actual_balance) || 0}, ${parseFloat(wallet.actual_balance) || 0},
      ${pendingBefore}, ${pendingAfter},
      ${`HOLD-${order.order_number || order.id}-${type}`},
      ${label}, 'completed', ${String(order.buyer_id)}, ${order.id},
      now()
    )
  `;

  return { userId, amount: value, walletId: wallet.id };
}

/**
 * Record every party's share as PENDING (escrowed) — exactly once per order.
 *
 * Double guard: the `ledger_applied` compare-and-set, *plus* a lookup for any
 * existing hold row on this order. The second guard means this is safe to run
 * alongside the Paystack webhook's own ledger writes — whichever gets there
 * first wins and the other becomes a no-op.
 */
export async function recordEscrowHolds(order) {
  try {
    const existing = await sql`
      SELECT id FROM crestar_wallet_transactions
      WHERE related_order_id = ${order.id}
        AND transaction_type IN ('escrow_hold', 'creator_commission_hold')
      LIMIT 1
    `;
    if (existing.length > 0) {
      await sql`UPDATE orders SET ledger_applied = true WHERE id = ${order.id}`;
      return { applied: false, reason: 'holds_already_exist' };
    }

    const [claimed] = await sql`
      UPDATE orders SET ledger_applied = true, updated_at = now()
      WHERE id = ${order.id} AND COALESCE(ledger_applied, false) = false
      RETURNING id
    `;
    if (!claimed) return { applied: false, reason: 'already_applied' };

    const label = `Escrow hold — order ${order.order_number || order.id}`;
    const held = [];

    const sellerShare = await holdForParty({
      userId: order.seller_id,
      amount: order.seller_payout,
      type: 'escrow_hold',
      order,
      label,
    });
    if (sellerShare) held.push({ leg: 'seller', ...sellerShare });

    const creatorShare = await holdForParty({
      userId: order.origin_creator_id,
      amount: order.creator_commission,
      type: 'creator_commission_hold',
      order,
      label: `Creator commission hold — order ${order.order_number || order.id}`,
    });
    if (creatorShare) held.push({ leg: 'creator', ...creatorShare });

    // Deliverer fee is held too, so nothing pays out before the buyer's PIN.
    const delivererShare = await holdForParty({
      userId: order.deliverer_id,
      amount: order.deliverer_fee,
      type: 'escrow_hold',
      order,
      label: `Delivery fee hold — order ${order.order_number || order.id}`,
    });
    if (delivererShare) held.push({ leg: 'deliverer', ...delivererShare });

    return { applied: true, held };
  } catch (err) {
    console.error('[settlement] recordEscrowHolds failed:', err);
    return { applied: false, error: err.message };
  }
}

/**
 * THE one function to call when a payment is confirmed.
 *
 * Returns { settled, alreadySettled, order }. Never throws — a settlement
 * hiccup must never turn into a 500 on a webhook, because Paystack would then
 * retry forever against an order that is actually fine.
 */
export async function settleOrderPaid(orderOrId, options = {}) {
  const { channel = 'paystack', reference = null } = options;

  const orderId = typeof orderOrId === 'object' ? orderOrId.id : orderOrId;
  if (!orderId) return { settled: false, error: 'no_order_id' };

  try {
    // 1 ── Atomic compare-and-set. Exactly one caller flips pending → paid.
    const [won] = await sql`
      UPDATE orders
      SET status = 'paid',
          payment_status = 'paid',
          payment_method = COALESCE(payment_method, ${channel}),
          payment_reference = COALESCE(payment_reference, ${reference}),
          paid_at = COALESCE(paid_at, now()),
          updated_at = now()
      WHERE id = ${orderId}
        AND status = 'pending_payment'
      RETURNING id
    `;

    const order = await loadOrder(orderId);
    if (!order) return { settled: false, error: 'order_not_found' };

    if (!won && TERMINAL_UNPAID.has(order.status)) {
      return { settled: false, alreadySettled: false, order, reason: order.status };
    }

    // 2/3/4 ── Run the follow-ups regardless of who won the race. A previous
    // attempt may have flipped the status and then died before finishing, and
    // each of these is individually idempotent.
    const inventory = await applyInventory(order);
    const ledger = await recordEscrowHolds(order);
    await notifyNewOrderOnce(order);

    if (won) {
      console.log(
        `✅ Order ${order.order_number || order.id} settled — now visible to seller ${order.seller_id}`
      );
    }

    return {
      settled: Boolean(won),
      alreadySettled: !won,
      order,
      inventory,
      ledger,
    };
  } catch (err) {
    console.error('[settlement] settleOrderPaid failed:', err);
    return { settled: false, error: err.message };
  }
}

/** Settle every order that shares a Paystack reference (multi-seller carts). */
export async function settleOrdersByReference(reference, options = {}) {
  if (!reference) return [];
  const rows = await sql`SELECT id FROM orders WHERE payment_reference = ${reference}`;
  const results = [];
  for (const row of rows) {
    results.push(await settleOrderPaid(row.id, { ...options, reference }));
  }
  return results;
}

/**
 * Move every held share on an order from Pending → Available.
 *
 * Called the moment the buyer confirms delivery with their 4-digit PIN, and
 * strictly before any Paystack Transfer is attempted: money must be spendable
 * in our own books before we try to push it out, so that a failed transfer can
 * simply leave it sitting there for manual cash-out.
 */
export async function releaseOrderEscrow(order) {
  try {
    const released = await sql`
      SELECT id FROM crestar_wallet_transactions
      WHERE related_order_id = ${order.id}
        AND transaction_type = 'escrow_release'
        AND status = 'completed'
      LIMIT 1
    `;
    if (released.length > 0) {
      return { released: false, reason: 'already_released' };
    }

    const holds = await sql`
      SELECT wallet_account_id, SUM(amount) AS total
      FROM crestar_wallet_transactions
      WHERE related_order_id = ${order.id}
        AND transaction_type IN ('escrow_hold', 'creator_commission_hold')
        AND status = 'completed'
      GROUP BY wallet_account_id
    `;

    const moved = [];
    for (const hold of holds) {
      const amount = parseFloat(hold.total) || 0;
      if (amount <= 0) continue;

      const [wallet] = await sql`
        SELECT id, actual_balance, pending_balance
        FROM wallet_accounts WHERE id = ${hold.wallet_account_id} LIMIT 1
      `;
      if (!wallet) continue;

      const pendingBefore = parseFloat(wallet.pending_balance) || 0;
      const actualBefore = parseFloat(wallet.actual_balance) || 0;
      const pendingAfter = Math.max(0, pendingBefore - amount);
      const actualAfter = actualBefore + amount;

      await sql`
        UPDATE wallet_accounts
        SET pending_balance = ${pendingAfter}, actual_balance = ${actualAfter}, updated_at = now()
        WHERE id = ${wallet.id}
      `;

      await sql`
        INSERT INTO crestar_wallet_transactions (
          wallet_account_id, transaction_type, amount, currency,
          actual_balance_before, actual_balance_after,
          pending_balance_before, pending_balance_after,
          reference, description, status, related_order_id, completed_at
        ) VALUES (
          ${wallet.id}, 'escrow_release', ${amount}, ${order.currency || 'GHS'},
          ${actualBefore}, ${actualAfter}, ${pendingBefore}, ${pendingAfter},
          ${`REL-${order.order_number || order.id}-${wallet.id}`},
          ${`Delivery confirmed — order ${order.order_number || order.id}`},
          'completed', ${order.id}, now()
        )
      `;

      moved.push({ walletId: wallet.id, amount });
    }

    await sql`
      UPDATE orders SET escrow_released_at = COALESCE(escrow_released_at, now()), updated_at = now()
      WHERE id = ${order.id}
    `;

    return { released: true, moved };
  } catch (err) {
    console.error('[settlement] releaseOrderEscrow failed:', err);
    return { released: false, error: err.message };
  }
}
