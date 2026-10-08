// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Initialize a Paystack payment for wallet deposit
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const userId = session.user.id.toString();
    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return Response.json({ error: "Enter a valid amount" }, { status: 400 });
    }

    if (amount < 1) {
      return Response.json(
        { error: "Minimum deposit is GH₵ 1.00" },
        { status: 400 },
      );
    }

    // Check if Paystack secret key is configured
    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error("❌ PAYSTACK_SECRET_KEY environment variable is not set");
      return Response.json(
        { error: "Payment service is not configured. Please contact support." },
        { status: 500 },
      );
    }

    // Get user's identity_id and ensure wallet account exists
    const userResult = await sql`
      SELECT identity_id, email FROM auth_users WHERE id = ${userId} LIMIT 1
    `;

    if (!userResult.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const { identity_id: identityId, email } = userResult[0];

    // Ensure wallet account exists
    await sql`
      INSERT INTO wallet_accounts (identity_id, account_type, currency, actual_balance, pending_balance)
      VALUES (${identityId}, 'personal', 'GHS', 0, 0)
      ON CONFLICT (identity_id) DO NOTHING
    `;

    const reference = `DEP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    console.log(
      `💰 Initializing deposit: ${reference} - GH₵${amount} for user ${userId}`,
    );

    // Initialize Paystack payment
    const paystackRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email || `user${userId}@crestar.app`,
          amount: Math.round(amount * 100), // Convert to pesewas
          reference,
          callback_url: `${process.env.NEXT_PUBLIC_CREATE_APP_URL || "https://app.crestar.com"}/wallet?deposit=success`,
          metadata: {
            type: "wallet_deposit",
            user_id: userId,
            identity_id: identityId,
            custom_fields: [
              {
                display_name: "Transaction Type",
                variable_name: "type",
                value: "Wallet Deposit",
              },
            ],
          },
        }),
      },
    );

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok) {
      console.error("❌ Paystack initialization failed:", paystackData);
      return Response.json(
        {
          error:
            paystackData.message ||
            "Payment service is temporarily unavailable. Please try again.",
          details: paystackData,
        },
        { status: 502 },
      );
    }

    if (!paystackData.status || !paystackData.data?.authorization_url) {
      console.error("❌ Invalid Paystack response:", paystackData);
      return Response.json(
        { error: "Failed to initialize payment. Please try again." },
        { status: 502 },
      );
    }

    // Get current wallet balance
    const walletResult = await sql`
      SELECT id, actual_balance, pending_balance 
      FROM wallet_accounts 
      WHERE identity_id = ${identityId} 
      LIMIT 1
    `;

    const wallet = walletResult[0];

    // Create a pending transaction in the new wallet system
    await sql`
      INSERT INTO crestar_wallet_transactions (
        wallet_account_id,
        transaction_type,
        amount,
        currency,
        actual_balance_before,
        actual_balance_after,
        pending_balance_before,
        pending_balance_after,
        reference,
        external_reference,
        description,
        metadata,
        status,
        created_at
      ) VALUES (
        ${wallet.id},
        'deposit',
        ${amount},
        'GHS',
        ${wallet.actual_balance},
        ${wallet.actual_balance}, // Will be updated by webhook/verification
        ${wallet.pending_balance},
        ${wallet.pending_balance},
        ${reference},
        ${reference},
        'Wallet deposit via Paystack',
        ${JSON.stringify({ user_id: userId, paystack_reference: reference })},
        'pending',
        now()
      )
    `;

    // Calculate expected balance after for legacy table
    const expectedBalanceAfter =
      parseFloat(wallet.actual_balance) + parseFloat(amount);

    // Also create legacy transaction for backward compatibility
    await sql`
      INSERT INTO wallet_transactions (
        user_id, transaction_type, amount, balance_after, reference, status
      ) VALUES (
        ${userId}, 'deposit', ${amount}, ${expectedBalanceAfter}, ${reference}, 'pending'
      )
    `;

    console.log(
      `✅ Payment initialized: ${paystackData.data.authorization_url}`,
    );

    return Response.json({
      success: true,
      paymentUrl: paystackData.data.authorization_url,
      reference,
      access_code: paystackData.data.access_code,
    });
  } catch (error) {
    console.error("❌ Deposit initialization error:", error);
    return Response.json(
      { error: `Failed to initialize deposit: ${error.message}` },
      { status: 500 },
    );
  }
}

// Verify and complete a deposit - updates ACTUAL BALANCE immediately
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return Response.json({ error: "Reference required" }, { status: 400 });
    }

    console.log(`🔍 Verifying payment: ${reference} for user ${userId}`);

    // Check if Paystack secret key is configured
    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error("❌ PAYSTACK_SECRET_KEY environment variable is not set");
      return Response.json(
        { error: "Payment verification service is not configured" },
        { status: 500 },
      );
    }

    // Verify with Paystack
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      },
    );

    if (!verifyRes.ok) {
      const errorData = await verifyRes.json();
      console.error("❌ Paystack verification failed:", errorData);
      return Response.json(
        {
          error: errorData.message || "Could not verify payment with Paystack",
        },
        { status: 400 },
      );
    }

    const verifyData = await verifyRes.json();

    if (verifyData.data.status !== "success") {
      console.log(`⚠️ Payment not successful: ${verifyData.data.status}`);

      // Update transactions to failed in both systems
      await sql`
        UPDATE wallet_transactions 
        SET status = 'failed' 
        WHERE reference = ${reference} AND user_id = ${userId}
      `;

      await sql`
        UPDATE crestar_wallet_transactions 
        SET status = 'failed' 
        WHERE external_reference = ${reference}
      `;

      return Response.json(
        { error: `Payment ${verifyData.data.status}. Please try again.` },
        { status: 400 },
      );
    }

    // Check if already processed
    const existingTransaction = await sql`
      SELECT status FROM crestar_wallet_transactions 
      WHERE external_reference = ${reference} AND status = 'completed'
      LIMIT 1
    `;

    if (existingTransaction.length > 0) {
      console.log(`✅ Payment already processed: ${reference}`);
      return Response.json({
        success: true,
        message: "Deposit already completed!",
      });
    }

    // Process the deposit - update ACTUAL BALANCE (not escrow/pending)
    const userResult = await sql`
      SELECT identity_id FROM auth_users WHERE id = ${userId} LIMIT 1
    `;

    if (!userResult.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const identityId = userResult[0].identity_id;
    const amount = verifyData.data.amount / 100; // Convert from pesewas to cedis

    // Get wallet account
    const walletResult = await sql`
      SELECT id, actual_balance, pending_balance 
      FROM wallet_accounts 
      WHERE identity_id = ${identityId} 
      LIMIT 1
    `;

    if (!walletResult.length) {
      return Response.json({ error: "Wallet not found" }, { status: 404 });
    }

    const wallet = walletResult[0];
    const newActualBalance = parseFloat(wallet.actual_balance) + amount;

    console.log(
      `💰 Processing deposit: ${amount} → Current: ${wallet.actual_balance} → New: ${newActualBalance}`,
    );

    // Update ACTUAL_BALANCE immediately (wallet deposits go straight to available balance, NOT escrow)
    await sql`
      UPDATE wallet_accounts 
      SET 
        actual_balance = ${newActualBalance},
        updated_at = now()
      WHERE id = ${wallet.id}
    `;

    // Update transaction status to completed
    await sql`
      UPDATE crestar_wallet_transactions 
      SET 
        status = 'completed',
        actual_balance_after = ${newActualBalance},
        completed_at = now()
      WHERE external_reference = ${reference}
    `;

    // Update legacy transaction to completed
    await sql`
      UPDATE wallet_transactions 
      SET 
        status = 'completed',
        balance_after = ${newActualBalance}
      WHERE reference = ${reference} AND user_id = ${userId}
    `;

    console.log(
      `✅ Deposit completed: ${reference} - GH₵${amount} added to wallet`,
    );

    return Response.json({
      success: true,
      message: "Deposit successful! Money added to your wallet.",
      newBalance: newActualBalance,
    });
  } catch (error) {
    console.error("❌ Verify deposit error:", error);
    return Response.json(
      { error: `Failed to verify deposit: ${error.message}` },
      { status: 500 },
    );
  }
}
