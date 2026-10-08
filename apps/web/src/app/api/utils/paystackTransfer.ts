// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { resolvePayoutDetails } from "@/app/api/utils/paystackSubaccount";

const MOMO_BANK_CODES = { MTN: "MTN", VODAFONE: "VDF", AIRTELTIGO: "ATL" };
const MOMO_CODES = new Set(["MTN", "VDF", "ATL"]);

export async function getOrCreateWallet(userId) {
  const [user] =
    await sql`SELECT identity_id FROM auth_users WHERE id = ${String(
      userId
    )} LIMIT 1`;
  if (!user?.identity_id)
    return { error: "No wallet identity linked to this account" };
  let [wallet] =
    await sql`SELECT id, actual_balance, pending_balance FROM wallet_accounts WHERE identity_id = ${user.identity_id} LIMIT 1`;
  if (!wallet) {
    [wallet] = await sql`
      INSERT INTO wallet_accounts (identity_id, account_type, actual_balance, pending_balance)
      VALUES (${user.identity_id}, 'personal', 0, 0)
      ON CONFLICT (identity_id) DO UPDATE SET updated_at = now()
      RETURNING id, actual_balance, pending_balance
    `;
  }
  return { wallet };
}

async function restoreBalance(walletId, amount) {
  await sql`UPDATE wallet_accounts SET actual_balance = actual_balance + ${amount}, updated_at = now() WHERE id = ${walletId}`;
}

export async function resolveTransferRecipient(userId) {
  const { wallet, error: walletError } = await getOrCreateWallet(userId);
  if (walletError) return { error: walletError };
  const [saved] = await sql`
    SELECT id, method_type, details, paystack_recipient_code
    FROM wallet_payout_methods
    WHERE wallet_account_id = ${wallet.id} AND is_active = true
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1
  `;
  if (saved?.paystack_recipient_code)
    return {
      recipientCode: saved.paystack_recipient_code,
      walletId: wallet.id,
    };

  const [nameRow] =
    await sql`SELECT COALESCE(display_name, name, username, 'Crestar User') AS dname FROM auth_users WHERE id = ${String(
      userId
    )} LIMIT 1`;
  let type;
  let bankCode;
  let accountNumber;
  let accountName = nameRow?.dname || "Crestar User";

  if (saved) {
    const details =
      typeof saved.details === "string"
        ? JSON.parse(saved.details)
        : saved.details || {};
    type = saved.method_type === "mobile_money" ? "mobile_money" : "ghipss";
    bankCode =
      saved.method_type === "mobile_money"
        ? MOMO_BANK_CODES[details.provider] || details.bank_code || "MTN"
        : details.bank_code;
    accountNumber = details.phone_number || details.account_number;
    accountName = details.account_name || accountName;
  }
  if (!accountNumber) {
    const payout = await resolvePayoutDetails(userId);
    if (!payout?.accountNumber)
      return { error: "No payout account set up for this user" };
    accountNumber = payout.accountNumber;
    bankCode = payout.settlementBank || "MTN";
    type = MOMO_CODES.has(bankCode) ? "mobile_money" : "ghipss";
  }
  if (!bankCode) return { error: "No bank or mobile money provider set up" };

  const res = await fetch("https://api.paystack.co/transferrecipient", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type,
      name: accountName,
      account_number: String(accountNumber).replace(/\s/g, ""),
      bank_code: bankCode,
      currency: "GHS",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.data?.recipient_code)
    return { error: data?.message || "Could not create transfer recipient" };
  const recipientCode = data.data.recipient_code;

  if (saved?.id) {
    await sql`UPDATE wallet_payout_methods SET paystack_recipient_code = ${recipientCode}, updated_at = now() WHERE id = ${saved.id}`;
  } else {
    await sql`
      INSERT INTO wallet_payout_methods (wallet_account_id, method_type, method_code, method_name, details, paystack_recipient_code, is_active)
      VALUES (${wallet.id}, ${
      type === "mobile_money" ? "mobile_money" : "bank_transfer"
    }, ${bankCode}, ${`${bankCode} — ${accountNumber}`}, ${JSON.stringify({
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: accountName,
    })}, ${recipientCode}, true)
    `;
  }
  return { recipientCode, walletId: wallet.id };
}

export async function sendAutoPayout({
  userId,
  amount,
  reference,
  reason,
  orderId,
}) {
  const payoutAmount = Math.round((parseFloat(amount) || 0) * 100) / 100;
  let walletId = null;
  let debited = false;
  try {
    if (!userId || payoutAmount <= 0)
      return { status: "skipped", detail: "Nothing to pay out" };
    const existing =
      await sql`SELECT status FROM crestar_wallet_transactions WHERE reference = ${reference} AND transaction_type = 'payout' LIMIT 1`;
    if (existing.length > 0)
      return { status: "skipped", detail: `Already ${existing[0].status}` };

    const recipient = await resolveTransferRecipient(userId);
    walletId = recipient.walletId;
    if (recipient.error) return { status: "retained", detail: recipient.error };

    const [row] = await sql`
      UPDATE wallet_accounts
      SET actual_balance = actual_balance - ${payoutAmount}, updated_at = now()
      WHERE id = ${walletId} AND actual_balance >= ${payoutAmount}
      RETURNING actual_balance, pending_balance
    `;
    if (!row)
      return { status: "retained", detail: "Insufficient available balance" };
    debited = true;

    await sql`
      INSERT INTO crestar_wallet_transactions (
        wallet_account_id, transaction_type, amount, currency,
        actual_balance_before, actual_balance_after,
        pending_balance_before, pending_balance_after,
        reference, description, related_order_id, related_user_id, status, created_at
      ) VALUES (
        ${walletId}, 'payout', ${payoutAmount}, 'GHS',
        ${Number(row.actual_balance) + payoutAmount}, ${row.actual_balance},
        ${row.pending_balance}, ${row.pending_balance},
        ${reference}, ${reason || "Crestar payout after delivery PIN"}, ${
      orderId || null
    }, ${String(userId)},
        'pending', now()
      )
    `;

    const res = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(payoutAmount * 100),
        recipient: recipient.recipientCode,
        reason: reason || "Crestar payout",
        reference,
        currency: "GHS",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (
      !res.ok ||
      data?.data?.status === "otp" ||
      data?.data?.status === "failed"
    ) {
      await restoreBalance(walletId, payoutAmount);
      await sql`UPDATE crestar_wallet_transactions SET status = 'failed', description = ${
        data?.message || "Transfer not sent"
      } WHERE reference = ${reference}`;
      return {
        status: "retained",
        detail: data?.message || "Transfer not sent",
      };
    }

    const finalStatus =
      data?.data?.status === "success" ? "completed" : "pending";
    await sql`
      UPDATE crestar_wallet_transactions
      SET status = ${finalStatus}, external_reference = ${
      data?.data?.transfer_code || null
    }, completed_at = ${
      finalStatus === "completed" ? new Date().toISOString() : null
    }
      WHERE reference = ${reference}
    `;
    return {
      status: finalStatus === "completed" ? "sent" : "pending",
      recipientCode: recipient.recipientCode,
    };
  } catch (err) {
    if (debited && walletId)
      await restoreBalance(walletId, payoutAmount).catch(() => {});
    return { status: "retained", detail: err.message };
  }
}

export async function payoutOrderRecipients(order) {
  const orderRef = order.order_number || String(order.id).slice(0, 8);
  const results = {};
  const legs = [
    [
      "seller",
      order.seller_id,
      order.seller_payout,
      `PO-S-${orderRef}`,
      "sale payout",
    ],
    [
      "deliverer",
      order.deliverer_id,
      order.deliverer_fee,
      `PO-D-${orderRef}`,
      "delivery payout",
    ],
    [
      "creator",
      order.origin_creator_id,
      order.creator_commission,
      `PO-C-${orderRef}`,
      "creator commission",
    ],
  ];
  for (const [key, userId, amount, reference, label] of legs) {
    if (userId && Number(amount) > 0) {
      results[key] = await sendAutoPayout({
        userId,
        amount,
        reference,
        reason: `Crestar ${label}, after 3% fee — order ${orderRef}`,
        orderId: order.id,
      });
    }
  }
  const payoutStatus =
    Object.keys(results).length === 0
      ? "not_applicable"
      : Object.values(results).some((result) => result?.status === "retained")
      ? "partial"
      : "paid";
  await sql`UPDATE orders SET payout_status = ${payoutStatus}, updated_at = now() WHERE id = ${order.id}`;
  return { payoutStatus, results };
}