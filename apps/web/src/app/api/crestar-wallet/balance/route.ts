// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { resolveUserId } from "@/app/api/utils/auth";

const PLATFORM_FEE_RATE = 0.03;
const CLIENT_ALLOWED = new Set(["withdrawal"]);
const EARNING_TYPES = new Set([
  "sale",
  "order_payout",
  "delivery_fee",
  "creator_commission",
  "escrow_hold",
  "creator_commission_hold",
  "escrow_release",
]);

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function netOfFee(amount) {
  return money(amount * (1 - PLATFORM_FEE_RATE));
}

async function ensureWallet(userId) {
  const userIdentity =
    await sql`SELECT identity_id FROM auth_users WHERE id = ${userId}`;
  let identityId = userIdentity[0]?.identity_id;
  if (!identityId) {
    const created =
      await sql`INSERT INTO identities DEFAULT VALUES RETURNING id`;
    identityId = created[0].id;
    await sql`UPDATE auth_users SET identity_id = ${identityId} WHERE id = ${userId}`;
    await sql`
      INSERT INTO identity_accounts (identity_id, user_id, is_primary)
      VALUES (${identityId}, ${userId}, true)
      ON CONFLICT (identity_id, user_id) DO NOTHING
    `;
  }
  const existing = await sql`
    SELECT id, actual_balance, pending_balance, currency
    FROM wallet_accounts
    WHERE identity_id = ${identityId}
    LIMIT 1
  `;
  if (existing.length > 0) return existing[0];
  const createdWallet = await sql`
    INSERT INTO wallet_accounts (identity_id, account_type, actual_balance, pending_balance)
    VALUES (${identityId}, 'personal', 0, 0)
    RETURNING id, actual_balance, pending_balance, currency
  `;
  return createdWallet[0];
}

function present(wallet) {
  const actual = money(wallet.actual_balance);
  const pending = money(wallet.pending_balance);
  return {
    wallet_id: wallet.id,
    actual_balance: actual,
    pending_balance: pending,
    actualBalance: actual,
    pendingBalance: pending,
    currency: wallet.currency || "GHS",
  };
}

export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId)
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    return Response.json(present(await ensureWallet(userId)));
  } catch (error) {
    console.error("Wallet balance error:", error);
    return Response.json(
      { error: "Failed to get wallet balance" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId)
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    const body = await request.json();
    const { transaction_type, reference, description, metadata } = body;
    const amount = money(body.amount);
    if (!transaction_type || amount <= 0) {
      return Response.json(
        { error: "A positive amount and transaction_type are required" },
        { status: 400 }
      );
    }
    if (
      EARNING_TYPES.has(transaction_type) ||
      !CLIENT_ALLOWED.has(transaction_type)
    ) {
      return Response.json(
        {
          error:
            "Earnings are credited by the payment webhook after the 3% fee. This endpoint only accepts a withdrawal.",
        },
        { status: 403 }
      );
    }

    const wallet = await ensureWallet(userId);
    const currentActual = money(wallet.actual_balance);
    const currentPending = money(wallet.pending_balance);
    if (amount > currentActual) {
      return Response.json({ error: "Insufficient balance" }, { status: 400 });
    }
    const newActual = money(currentActual - amount);
    const updated = await sql`
      UPDATE wallet_accounts
      SET actual_balance = ${newActual}, updated_at = now()
      WHERE id = ${wallet.id} AND actual_balance >= ${amount}
      RETURNING actual_balance, pending_balance
    `;
    if (updated.length === 0) {
      return Response.json({ error: "Insufficient balance" }, { status: 400 });
    }
    await sql`
      INSERT INTO crestar_wallet_transactions (
        wallet_account_id, transaction_type, amount,
        actual_balance_before, actual_balance_after,
        pending_balance_before, pending_balance_after,
        reference, description, metadata, status, created_at, completed_at
      ) VALUES (
        ${wallet.id}, 'withdrawal', ${amount},
        ${currentActual}, ${newActual},
        ${currentPending}, ${currentPending},
        ${reference || null}, ${description || null},
        ${JSON.stringify(metadata || {})}, 'completed', now(), now()
      )
    `;
    return Response.json({
      success: true,
      actual_balance: newActual,
      pending_balance: currentPending,
      actualBalance: newActual,
      pendingBalance: currentPending,
    });
  } catch (error) {
    console.error("Wallet update error:", error);
    return Response.json({ error: "Failed to update wallet" }, { status: 500 });
  }
}

export async function creditEarning({
  userId,
  grossAmount,
  transactionType,
  reference,
  description,
}) {
  const net = netOfFee(grossAmount);
  const fee = money(grossAmount - net);
  const wallet = await ensureWallet(userId);
  const currentPending = money(wallet.pending_balance);
  const nextPending = money(currentPending + net);
  await sql`
    UPDATE wallet_accounts
    SET pending_balance = ${nextPending}, updated_at = now()
    WHERE id = ${wallet.id}
  `;
  await sql`
    INSERT INTO crestar_wallet_transactions (
      wallet_account_id, transaction_type, amount,
      actual_balance_before, actual_balance_after,
      pending_balance_before, pending_balance_after,
      reference, description, metadata, status, created_at, completed_at
    ) VALUES (
      ${wallet.id}, ${transactionType}, ${net},
      ${money(wallet.actual_balance)}, ${money(wallet.actual_balance)},
      ${currentPending}, ${nextPending},
      ${reference || null}, ${description || null},
      ${JSON.stringify({
        grossAmount: money(grossAmount),
        platformFee: fee,
        feeRate: PLATFORM_FEE_RATE,
      })},
      'pending', now(), now()
    )
  `;
  return { net, fee };
}