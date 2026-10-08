// @ts-nocheck
import sql from "@/app/api/utils/sql";
import crypto from "crypto";
import { notifyNewOrderOnce } from "@/app/api/utils/notify";
import { refreshOrderPayoutStatus } from "@/app/api/utils/orderPayouts";
import { sendOrderConfirmation } from "@/app/api/utils/notification-service";

const FEE_RATE = 0.03;

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function netShare(order) {
  const payout = money(order.seller_payout);
  const fee = money(order.platform_fee);
  if (fee > 0) return payout;
  return money((order.subtotal || order.total_amount || 0) * (1 - FEE_RATE));
}

async function creditPending({
  userId,
  amount,
  orderId,
  reference,
  type,
  description,
}) {
  if (!userId || amount <= 0) return;
  const [user] =
    await sql`SELECT identity_id FROM auth_users WHERE id = ${String(
      userId
    )} LIMIT 1`;
  if (!user?.identity_id) return;
  await sql`
    INSERT INTO wallet_accounts (identity_id, account_type, currency, actual_balance, pending_balance)
    VALUES (${user.identity_id}, 'personal', 'GHS', 0, 0)
    ON CONFLICT (identity_id) DO NOTHING
  `;
  const [existing] = await sql`
    SELECT id FROM crestar_wallet_transactions
    WHERE related_order_id = ${orderId} AND transaction_type = ${type}
    LIMIT 1
  `;
  if (existing) return;
  const [wallet] =
    await sql`SELECT id, actual_balance, pending_balance FROM wallet_accounts WHERE identity_id = ${user.identity_id} LIMIT 1`;
  const nextPending = money(wallet.pending_balance) + amount;
  await sql`UPDATE wallet_accounts SET pending_balance = ${nextPending}, updated_at = now() WHERE id = ${wallet.id}`;
  await sql`
    INSERT INTO crestar_wallet_transactions (
      wallet_account_id, transaction_type, amount, currency,
      actual_balance_before, actual_balance_after,
      pending_balance_before, pending_balance_after,
      reference, external_reference, description, related_order_id, status, created_at, completed_at
    ) VALUES (
      ${wallet.id}, ${type}, ${amount}, 'GHS',
      ${wallet.actual_balance}, ${wallet.actual_balance},
      ${wallet.pending_balance}, ${nextPending},
      ${`${type}-${String(orderId).slice(
        0,
        8
      )}`}, ${reference}, ${description}, ${orderId}, 'pending', now(), now()
    )
  `;
}

export async function POST(request) {
  try {
    const body = await request.text();
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = request.headers.get("x-paystack-signature");
    if (!secret || !signature)
      return new Response("Unauthorized", { status: 401 });
    const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");
    if (hash !== signature)
      return new Response("Invalid signature", { status: 401 });

    const event = JSON.parse(body);

    if (
      event.event === "transfer.success" ||
      event.event === "transfer.failed" ||
      event.event === "transfer.reversed"
    ) {
      const transferRef = event.data?.reference;
      if (!transferRef) return new Response("No reference", { status: 200 });
      const [tx] =
        await sql`SELECT id, wallet_account_id, amount, status FROM crestar_wallet_transactions WHERE reference = ${transferRef} LIMIT 1`;
      if (!tx || tx.status === "completed" || tx.status === "failed")
        return new Response("Already reconciled", { status: 200 });
      if (event.event === "transfer.success") {
        await sql`UPDATE crestar_wallet_transactions SET status = 'completed', completed_at = now() WHERE id = ${tx.id}`;
      } else {
        await sql`UPDATE wallet_accounts SET actual_balance = actual_balance + ${money(
          tx.amount
        )}, updated_at = now() WHERE id = ${tx.wallet_account_id}`;
        await sql`UPDATE crestar_wallet_transactions SET status = 'failed', description = ${event.event} WHERE id = ${tx.id}`;
      }
      const [leg] =
        await sql`SELECT id, order_id FROM order_payout_legs WHERE reference = ${transferRef} LIMIT 1`;
      if (leg) {
        await sql`UPDATE order_payout_legs SET status = ${
          event.event === "transfer.success" ? "paid" : "failed"
        }, updated_at = now() WHERE id = ${leg.id}`;
        await refreshOrderPayoutStatus(leg.order_id);
      }
      return new Response("Transfer reconciled", { status: 200 });
    }

    if (event.event !== "charge.success")
      return new Response("Event not handled", { status: 200 });

    const { reference, amount, metadata, customer } = event.data;
    const paidAmount = money(amount / 100);

    if (metadata?.type === "wallet_deposit") {
      const userId = metadata.user_id;
      const [done] =
        await sql`SELECT id FROM crestar_wallet_transactions WHERE external_reference = ${reference} AND status = 'completed' LIMIT 1`;
      if (done) return new Response("Already processed", { status: 200 });
      const [user] =
        await sql`SELECT identity_id FROM auth_users WHERE id = ${userId} LIMIT 1`;
      if (!user?.identity_id)
        return new Response("User not found", { status: 404 });
      await sql`INSERT INTO wallet_accounts (identity_id, account_type, currency, actual_balance, pending_balance) VALUES (${user.identity_id}, 'personal', 'GHS', 0, 0) ON CONFLICT (identity_id) DO NOTHING`;
      const [wallet] =
        await sql`SELECT id, actual_balance, pending_balance FROM wallet_accounts WHERE identity_id = ${user.identity_id} LIMIT 1`;
      const next = money(wallet.actual_balance) + paidAmount;
      await sql`UPDATE wallet_accounts SET actual_balance = ${next}, updated_at = now() WHERE id = ${wallet.id}`;
      await sql`
        INSERT INTO crestar_wallet_transactions (
          wallet_account_id, transaction_type, amount, currency,
          actual_balance_before, actual_balance_after, pending_balance_before, pending_balance_after,
          external_reference, description, metadata, status, created_at, completed_at
        ) VALUES (
          ${wallet.id}, 'deposit', ${paidAmount}, 'GHS',
          ${wallet.actual_balance}, ${next}, ${wallet.pending_balance}, ${
        wallet.pending_balance
      },
          ${reference}, 'Wallet deposit', ${JSON.stringify({
        customer_email: customer?.email,
        user_id: userId,
      })}, 'completed', now(), now()
        )
      `;
      return new Response("Deposit processed", { status: 200 });
    }

    const orders = await sql`
      SELECT id, seller_id, buyer_id, creator_commission, origin_creator_id, platform_fee,
             subtotal, total_amount, status, seller_payout, order_number, item_title, quantity, currency
      FROM orders WHERE payment_reference = ${reference}
    `;
    const expected = orders
      .filter((order) => order.status === "pending_payment")
      .reduce((sum, order) => sum + money(order.total_amount), 0);
    if (expected > 0 && Math.abs(paidAmount - expected) > 1) {
      return new Response("Amount mismatch", { status: 200 });
    }

    for (const order of orders) {
      if (order.status !== "pending_payment") continue;
      await sql`UPDATE orders SET status = 'paid', payment_status = 'paid', payment_method = 'paystack', updated_at = now() WHERE id = ${order.id}`;
      await notifyNewOrderOnce({ ...order, status: "paid" }).catch(() => {});
      await sendOrderConfirmation(order.id).catch(() => {});
      await creditPending({
        userId: order.seller_id,
        amount: netShare(order),
        orderId: order.id,
        reference,
        type: "escrow_hold",
        description: "Paid order, not delivered yet. 3% fee already removed.",
      });
      await creditPending({
        userId: order.origin_creator_id,
        amount: money(order.creator_commission),
        orderId: order.id,
        reference,
        type: "creator_commission_hold",
        description: "Creator share waiting on delivery.",
      });
    }
    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}