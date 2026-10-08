// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const userId = session.user.id.toString();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get user's identity_id
    const userResult = await sql`
      SELECT identity_id FROM auth_users WHERE id = ${userId} LIMIT 1
    `;

    if (!userResult.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const identityId = userResult[0].identity_id;

    // Get transactions from new crestar wallet system
    const transactions = await sql`
      SELECT 
        cwt.*,
        o.order_number,
        o.item_title,
        au.username as related_user_username
      FROM crestar_wallet_transactions cwt
      JOIN wallet_accounts wa ON cwt.wallet_account_id = wa.id
      LEFT JOIN orders o ON cwt.related_order_id = o.id
      LEFT JOIN auth_users au ON cwt.related_user_id = au.id::text
      WHERE wa.identity_id = ${identityId}
      ORDER BY cwt.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Format transactions for frontend
    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      transaction_type: tx.transaction_type,
      amount: parseFloat(tx.amount),
      currency: tx.currency,
      description: tx.description,
      reference: tx.reference,
      external_reference: tx.external_reference,
      status: tx.status,
      created_at: tx.created_at,
      actual_balance_before: parseFloat(tx.actual_balance_before),
      actual_balance_after: parseFloat(tx.actual_balance_after),
      pending_balance_before: parseFloat(tx.pending_balance_before),
      pending_balance_after: parseFloat(tx.pending_balance_after),
      // Legacy compatibility fields
      balance_after: parseFloat(tx.actual_balance_after),
      // Additional info
      order_number: tx.order_number,
      item_title: tx.item_title,
      related_user_username: tx.related_user_username,
      metadata:
        typeof tx.metadata === "string"
          ? JSON.parse(tx.metadata || "{}")
          : tx.metadata,
    }));

    return Response.json({ transactions: formattedTransactions });
  } catch (error) {
    console.error("Get wallet transactions error:", error);
    return Response.json(
      { error: "Failed to get wallet transactions" },
      { status: 500 },
    );
  }
}

// Withdraw funds
export async function POST(request) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const userId = session.user.id.toString();
    const body = await request.json();
    const {
      amount,
      withdrawalMethod,
      accountNumber,
      bankCode,
      accountName,
      momoProvider,
    } = body;
    // withdrawalMethod: 'momo' or 'bank'
    // For momo: accountNumber (phone), momoProvider ('MTN', 'VOD', 'ATL', 'TGO')
    // For bank: accountNumber, bankCode, accountName

    if (!amount || amount <= 0) {
      return Response.json(
        { error: "Invalid withdrawal amount" },
        { status: 400 },
      );
    }

    if (!withdrawalMethod || !["momo", "bank"].includes(withdrawalMethod)) {
      return Response.json(
        { error: "Please select a withdrawal method (Mobile Money or Bank)" },
        { status: 400 },
      );
    }

    if (!accountNumber) {
      return Response.json(
        {
          error:
            withdrawalMethod === "momo"
              ? "Please enter your Mobile Money number"
              : "Please enter your bank account number",
        },
        { status: 400 },
      );
    }

    // Check balance
    const balanceResult = await sql`
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN transaction_type IN ('order_payout', 'delivery_fee', 'transfer_in', 'deposit', 'refund') THEN amount
            WHEN transaction_type IN ('transfer_out', 'withdrawal') THEN -amount
            ELSE 0
          END
        ), 0) as balance
      FROM wallet_transactions
      WHERE user_id = ${userId} AND status = 'completed'
    `;

    const currentBalance = parseFloat(balanceResult[0]?.balance || 0);

    if (currentBalance < amount) {
      return Response.json({ error: "Insufficient funds" }, { status: 400 });
    }

    // Step 1: Create a Paystack Transfer Recipient
    let recipientPayload = {};

    if (withdrawalMethod === "momo") {
      // Mobile Money recipient
      const providerMap = {
        MTN: "MTN",
        VOD: "VOD",
        ATL: "ATL",
        TGO: "TGO",
      };
      const provider = providerMap[momoProvider] || "MTN";

      recipientPayload = {
        type: "mobile_money",
        name: accountName || session.user?.name || "Withdrawal",
        account_number: accountNumber.replace(/\s/g, ""),
        bank_code: provider,
        currency: "GHS",
      };
    } else {
      // Bank account recipient
      if (!bankCode) {
        return Response.json(
          { error: "Please select your bank" },
          { status: 400 },
        );
      }

      recipientPayload = {
        type: "ghipss",
        name: accountName || session.user?.name || "Withdrawal",
        account_number: accountNumber.replace(/\s/g, ""),
        bank_code: bankCode,
        currency: "GHS",
      };
    }

    // Create recipient on Paystack
    const recipientResponse = await fetch(
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

    const recipientData = await recipientResponse.json();

    if (!recipientResponse.ok || !recipientData.status) {
      console.error("Paystack recipient error:", recipientData);
      const errorMsg =
        recipientData.message || "Failed to verify withdrawal details";
      return Response.json({ error: errorMsg }, { status: 400 });
    }

    const recipientCode = recipientData.data.recipient_code;

    // Step 2: Initiate transfer using the recipient code
    const transferResponse = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(amount * 100), // Convert to pesewas
        recipient: recipientCode,
        reason: `Crestar wallet withdrawal - User ${userId}`,
        currency: "GHS",
      }),
    });

    const transferData = await transferResponse.json();

    if (!transferResponse.ok || !transferData.status) {
      console.error("Paystack transfer error:", transferData);
      const errorMsg = transferData.message || "Failed to initiate withdrawal";
      return Response.json({ error: errorMsg }, { status: 400 });
    }

    // Record withdrawal transaction
    const [transaction] = await sql`
      INSERT INTO wallet_transactions (
        user_id,
        transaction_type,
        amount,
        balance_after,
        reference,
        status
      ) VALUES (
        ${userId},
        'withdrawal',
        ${amount},
        ${currentBalance - amount},
        ${transferData.data.transfer_code || transferData.data.reference},
        'pending'
      )
      RETURNING *
    `;

    return Response.json({
      success: true,
      transaction,
      message:
        withdrawalMethod === "momo"
          ? "Withdrawal initiated! Funds will arrive in your Mobile Money account shortly."
          : "Withdrawal initiated! Funds will arrive in your bank account in 1-3 business days.",
    });
  } catch (error) {
    console.error("Withdrawal error:", error);
    return Response.json(
      { error: "Failed to process withdrawal. Please try again." },
      { status: 500 },
    );
  }
}
