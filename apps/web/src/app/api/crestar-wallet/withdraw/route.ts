// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// MoMo provider code → Paystack bank code mapping (Ghana)
const MOMO_BANK_CODES = {
  MTN: "MTN",
  VODAFONE: "VDF",
  AIRTELTIGO: "ATL",
};

/**
 * POST /api/crestar-wallet/withdraw
 * Initiates a real Paystack transfer to the user's bank/mobile money.
 *
 * Body:
 *  amount            - Amount in GHS to withdraw
 *  payout_method_id  - (optional) ID of a saved wallet_payout_methods row
 *  withdrawal_method - 'momo' | 'bank'  (when NOT using a saved method)
 *  account_number    - Phone/account number (when not using saved method)
 *  momo_provider     - 'MTN' | 'VODAFONE' | 'AIRTELTIGO'
 *  bank_code         - Paystack bank code  (when withdrawal_method = 'bank')
 *  account_name      - Account holder name (when withdrawal_method = 'bank')
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const body = await request.json();
    const {
      amount,
      payout_method_id,
      withdrawal_method,
      account_number,
      momo_provider,
      bank_code,
      account_name,
    } = body;

    // ── Validate amount ───────────────────────────────────────────────────────
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      return Response.json({ error: "Enter a valid amount" }, { status: 400 });
    }
    if (withdrawAmount < 1) {
      return Response.json(
        { error: "Minimum withdrawal is GH₵1.00" },
        { status: 400 },
      );
    }

    // ── Get user identity + wallet ────────────────────────────────────────────
    const userRows = await sql(
      `SELECT identity_id, email FROM auth_users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (!userRows.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    const { identity_id: identityId } = userRows[0];
    if (!identityId) {
      return Response.json(
        { error: "Wallet identity not found" },
        { status: 404 },
      );
    }

    const walletRows = await sql(
      `SELECT id, actual_balance, pending_balance FROM wallet_accounts WHERE identity_id = $1 LIMIT 1`,
      [identityId],
    );
    if (!walletRows.length) {
      return Response.json({ error: "Wallet not found" }, { status: 404 });
    }
    const wallet = walletRows[0];

    if (parseFloat(wallet.actual_balance) < withdrawAmount) {
      return Response.json(
        {
          error: `Insufficient balance. Available: GH₵${parseFloat(wallet.actual_balance).toFixed(2)}`,
        },
        { status: 400 },
      );
    }

    // ── Resolve recipient details ─────────────────────────────────────────────
    let recipientType,
      recipientBankCode,
      recipientAccount,
      recipientName,
      recipientCurrency;

    if (payout_method_id) {
      // Use a saved payout method
      const methodRows = await sql(
        `SELECT * FROM wallet_payout_methods WHERE id = $1 AND wallet_account_id = $2 AND is_active = true LIMIT 1`,
        [payout_method_id, wallet.id],
      );
      if (!methodRows.length) {
        return Response.json(
          { error: "Saved payout method not found" },
          { status: 404 },
        );
      }
      const pm = methodRows[0];
      // Fix: pm.details is stored as JSON string, must parse it
      const det =
        typeof pm.details === "string"
          ? JSON.parse(pm.details)
          : pm.details || {};

      if (pm.method_type === "mobile_money") {
        recipientType = "mobile_money";
        recipientBankCode =
          MOMO_BANK_CODES[det.provider] || det.bank_code || "MTN";
        recipientAccount = det.phone_number || det.account_number;
        recipientName = det.account_name || "Wallet User";
        recipientCurrency = "GHS";
      } else {
        recipientType = "ghipss";
        recipientBankCode = det.bank_code;
        recipientAccount = det.account_number;
        recipientName = det.account_name;
        recipientCurrency = "GHS";
      }
    } else {
      // Manual entry
      if (!withdrawal_method) {
        return Response.json(
          { error: "withdrawal_method is required" },
          { status: 400 },
        );
      }
      if (!account_number?.trim()) {
        return Response.json(
          { error: "Account number is required" },
          { status: 400 },
        );
      }

      if (withdrawal_method === "momo") {
        recipientType = "mobile_money";
        recipientBankCode = MOMO_BANK_CODES[momo_provider] || "MTN";
        recipientAccount = account_number.replace(/\s/g, "");
        recipientName = account_name?.trim() || "Wallet User";
        recipientCurrency = "GHS";
      } else if (withdrawal_method === "bank") {
        if (!bank_code) {
          return Response.json(
            { error: "Bank code is required" },
            { status: 400 },
          );
        }
        if (!account_name?.trim()) {
          return Response.json(
            { error: "Account holder name is required" },
            { status: 400 },
          );
        }
        recipientType = "ghipss";
        recipientBankCode = bank_code;
        recipientAccount = account_number.replace(/\s/g, "");
        recipientName = account_name.trim();
        recipientCurrency = "GHS";
      } else {
        return Response.json(
          { error: "Invalid withdrawal_method" },
          { status: 400 },
        );
      }
    }

    if (!recipientAccount) {
      return Response.json(
        { error: "Account number could not be resolved" },
        { status: 400 },
      );
    }

    // ── Step 1: Create Paystack transfer recipient ────────────────────────────
    const recipientPayload = {
      type: recipientType,
      name: recipientName,
      account_number: recipientAccount,
      bank_code: recipientBankCode,
      currency: recipientCurrency,
    };

    console.log(`💸 Creating transfer recipient:`, recipientPayload);

    const recipientRes = await fetch(
      "https://api.paystack.co/transferrecipient",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(recipientPayload),
      },
    );

    const recipientData = await recipientRes.json();

    if (!recipientRes.ok || !recipientData.data?.recipient_code) {
      console.error("❌ Paystack recipient creation failed:", recipientData);
      return Response.json(
        {
          error:
            recipientData.message ||
            "Could not validate your account details. Please check and try again.",
        },
        { status: 400 },
      );
    }

    const recipientCode = recipientData.data.recipient_code;
    const transferRef = `WD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // ── Step 2: Deduct from wallet balance ATOMICALLY ─────────────────────────
    // Use atomic UPDATE to prevent race condition / double-spend
    const deductResult = await sql(
      `UPDATE wallet_accounts 
       SET actual_balance = actual_balance - $1, updated_at = now() 
       WHERE id = $2 AND actual_balance >= $1
       RETURNING actual_balance, pending_balance`,
      [withdrawAmount, wallet.id],
    );

    if (!deductResult.length) {
      return Response.json(
        {
          error: `Insufficient balance or concurrent withdrawal. Please refresh and try again.`,
        },
        { status: 400 },
      );
    }

    const newBalance = parseFloat(deductResult[0].actual_balance);
    const actualBalanceBefore = parseFloat(wallet.actual_balance);

    // Log a pending transaction
    await sql(
      `INSERT INTO crestar_wallet_transactions (
        wallet_account_id, transaction_type, amount, currency,
        actual_balance_before, actual_balance_after,
        pending_balance_before, pending_balance_after,
        reference, description, related_user_id, status, created_at
      ) VALUES ($1, 'withdrawal', $2, 'GHS', $3, $4, $5, $5,
        $6, $7, $8, 'pending', now())`,
      [
        wallet.id,
        withdrawAmount,
        actualBalanceBefore,
        newBalance,
        wallet.pending_balance,
        transferRef,
        `Withdrawal to ${recipientName} (${recipientAccount})`,
        userId,
      ],
    );

    // ── Step 3: Initiate Paystack transfer ────────────────────────────────────
    const transferPayload = {
      source: "balance",
      amount: Math.round(withdrawAmount * 100), // Pesewas
      recipient: recipientCode,
      reason: "Crestar Wallet Withdrawal",
      reference: transferRef,
      currency: "GHS",
    };

    console.log(
      `💸 Initiating transfer: ${transferRef} — GH₵${withdrawAmount} to ${recipientCode}`,
    );

    const transferRes = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transferPayload),
    });

    const transferData = await transferRes.json();

    if (!transferRes.ok) {
      console.error("❌ Paystack transfer failed:", transferData);

      // Reverse the wallet deduction — refund the user
      await sql(
        `UPDATE wallet_accounts SET actual_balance = $1, updated_at = now() WHERE id = $2`,
        [wallet.actual_balance, wallet.id],
      );
      await sql(
        `UPDATE crestar_wallet_transactions SET status = 'failed' WHERE reference = $1`,
        [transferRef],
      );

      return Response.json(
        {
          error:
            transferData.message ||
            "Transfer failed. Your balance has been restored. Please try again.",
        },
        { status: 400 },
      );
    }

    // Mark transaction completed/pending depending on Paystack response
    const txStatus =
      transferData.data?.status === "success" ? "completed" : "pending";

    await sql(
      `UPDATE crestar_wallet_transactions SET status = $1, completed_at = CASE WHEN $1 = 'completed' THEN now() ELSE NULL END WHERE reference = $2`,
      [txStatus, transferRef],
    );

    // Optionally save new payout method for future use if manual entry
    if (!payout_method_id && account_number) {
      try {
        // Deactivate any existing active method
        await sql(
          `UPDATE wallet_payout_methods SET is_active = false, updated_at = now() WHERE wallet_account_id = $1 AND is_active = true`,
          [wallet.id],
        );
        const methodType =
          withdrawal_method === "momo" ? "mobile_money" : "bank_transfer";
        const details =
          withdrawal_method === "momo"
            ? {
                provider: momo_provider,
                phone_number: recipientAccount,
                account_name: recipientName,
              }
            : {
                bank_code: recipientBankCode,
                account_number: recipientAccount,
                account_name: recipientName,
              };

        await sql(
          `INSERT INTO wallet_payout_methods (wallet_account_id, method_type, method_code, method_name, details, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [
            wallet.id,
            methodType,
            recipientBankCode,
            withdrawal_method === "momo"
              ? `${momo_provider} — ${recipientAccount}`
              : `Bank — ${recipientAccount}`,
            JSON.stringify(details),
          ],
        );
      } catch (saveErr) {
        // Non-critical
        console.error("Failed to save payout method:", saveErr.message);
      }
    }

    console.log(
      `✅ Withdrawal ${transferRef} initiated — GH₵${withdrawAmount} to ${recipientName}`,
    );

    return Response.json({
      success: true,
      reference: transferRef,
      status: txStatus,
      newBalance,
      message: `GH₵${withdrawAmount.toFixed(2)} is being transferred to ${recipientName}. It may take a few minutes to arrive.`,
    });
  } catch (error) {
    console.error("❌ Withdrawal error:", error);
    return Response.json(
      { error: `Withdrawal failed: ${error.message}` },
      { status: 500 },
    );
  }
}
