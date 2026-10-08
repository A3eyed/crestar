// @ts-nocheck
import sql from "@/app/api/utils/sql";

function readJson(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      return {};
    }
  }
  return value;
}

function nextDate(frequency) {
  const date = new Date();
  if (frequency === "daily") date.setDate(date.getDate() + 1);
  else if (frequency === "biweekly") date.setDate(date.getDate() + 14);
  else if (frequency === "monthly") date.setMonth(date.getMonth() + 1);
  else date.setDate(date.getDate() + 7);
  return date.toISOString();
}

export async function POST(request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (
      !cronSecret ||
      request.headers.get("authorization") !== `Bearer ${cronSecret}`
    ) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wallets = await sql`
      SELECT id, identity_id, actual_balance, pending_balance, metadata
      FROM wallet_accounts
      WHERE metadata->>'payout_schedule' IS NOT NULL
    `;
    const processedPayouts = [];
    const failedPayouts = [];

    for (const wallet of wallets) {
      const metadata = readJson(wallet.metadata);
      const schedule = metadata.payout_schedule;
      if (
        !schedule?.enabled ||
        !schedule.next_payout_at ||
        new Date(schedule.next_payout_at) > new Date()
      )
        continue;

      const available = Math.round(Number(wallet.actual_balance) * 100) / 100;
      if (
        !Number.isFinite(available) ||
        available < Number(schedule.min_threshold || 0)
      )
        continue;

      const methods = await sql(
        `SELECT * FROM wallet_payout_methods
         WHERE wallet_account_id = $1 AND is_active = true
         ORDER BY created_at DESC LIMIT 1`,
        [wallet.id]
      );
      if (!methods.length) {
        failedPayouts.push({
          wallet_id: wallet.id,
          reason: "No payout method configured",
        });
        continue;
      }

      const method = methods[0];
      const details = readJson(method.details);
      const accountNumber = details.account_number || details.phone_number;
      const bankCode = details.bank_code || details.provider_code;
      if (!accountNumber || !bankCode) {
        failedPayouts.push({
          wallet_id: wallet.id,
          reason: "Payout method is missing an account number or bank code",
        });
        continue;
      }

      const debit = await sql(
        `UPDATE wallet_accounts
         SET actual_balance = actual_balance - $1, updated_at = now()
         WHERE id = $2 AND actual_balance >= $1
         RETURNING actual_balance, pending_balance`,
        [available, wallet.id]
      );
      if (!debit.length) {
        failedPayouts.push({
          wallet_id: wallet.id,
          reason: "Insufficient available balance",
        });
        continue;
      }

      const transferRef = `AUTO-${Date.now()
        .toString(36)
        .toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;
      try {
        const recipientRes = await fetch(
          "https://api.paystack.co/transferrecipient",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type:
                method.method_type === "mobile_money"
                  ? "mobile_money"
                  : "ghipss",
              name: details.account_name || "Crestar seller",
              account_number: accountNumber,
              bank_code: bankCode,
              currency: "GHS",
            }),
          }
        );
        const recipientData = await recipientRes.json();
        if (!recipientRes.ok)
          throw new Error(recipientData.message || "Recipient creation failed");

        const transferRes = await fetch("https://api.paystack.co/transfer", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "balance",
            amount: Math.round(available * 100),
            recipient: recipientData.data.recipient_code,
            reason: "Crestar auto-payout",
            reference: transferRef,
            currency: "GHS",
          }),
        });
        const transferData = await transferRes.json();
        if (!transferRes.ok)
          throw new Error(transferData.message || "Transfer failed");

        await sql(
          `INSERT INTO crestar_wallet_transactions (
            wallet_account_id, transaction_type, amount, currency,
            actual_balance_before, actual_balance_after,
            pending_balance_before, pending_balance_after,
            reference, description, status, created_at, completed_at
          ) VALUES ($1, 'withdrawal', $2, 'GHS', $3, $4, $5, $5, $6, $7, 'completed', now(), now())`,
          [
            wallet.id,
            available,
            available,
            debit[0].actual_balance,
            debit[0].pending_balance,
            transferRef,
            `Auto-payout: ${schedule.frequency}. Already net of the 3% fee.`,
          ]
        );

        const updatedSchedule = {
          ...schedule,
          last_payout_at: new Date().toISOString(),
          next_payout_at: nextDate(schedule.frequency),
          pays: "available_balance_only",
        };
        await sql(`UPDATE wallet_accounts SET metadata = $1 WHERE id = $2`, [
          JSON.stringify({ ...metadata, payout_schedule: updatedSchedule }),
          wallet.id,
        ]);
        processedPayouts.push({
          wallet_id: wallet.id,
          amount: available,
          reference: transferRef,
          next_payout: updatedSchedule.next_payout_at,
        });
      } catch (payoutError) {
        await sql(
          `UPDATE wallet_accounts SET actual_balance = actual_balance + $1, updated_at = now() WHERE id = $2`,
          [available, wallet.id]
        );
        failedPayouts.push({
          wallet_id: wallet.id,
          reason: payoutError.message,
        });
      }
    }

    return Response.json({
      success: true,
      processed: processedPayouts.length,
      failed: failedPayouts.length,
      details: { processedPayouts, failedPayouts },
    });
  } catch (error) {
    console.error("Scheduled payout processing error:", error);
    return Response.json(
      { error: "Failed to process scheduled payouts" },
      { status: 500 }
    );
  }
}