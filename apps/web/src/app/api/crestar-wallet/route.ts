// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get wallet balance and recent transactions
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's identity and wallet
    const userIdentity = await sql`
      SELECT identity_id FROM auth_users WHERE id = ${userId}
    `;

    if (userIdentity.length === 0 || !userIdentity[0].identity_id) {
      return Response.json({ error: "Identity not found" }, { status: 404 });
    }

    const identity_id = userIdentity[0].identity_id;

    // Get wallet account
    const wallet = await sql`
      SELECT 
        id,
        actual_balance,
        pending_balance,
        currency,
        created_at,
        updated_at
      FROM wallet_accounts 
      WHERE identity_id = ${identity_id}
    `;

    if (wallet.length === 0) {
      // Create wallet if doesn't exist
      const newWallet = await sql`
        INSERT INTO wallet_accounts (identity_id, account_type, actual_balance, pending_balance)
        VALUES (${identity_id}, 'personal', 0, 0)
        RETURNING id, actual_balance, pending_balance, currency, created_at, updated_at
      `;
      return Response.json({
        wallet: newWallet[0],
        recent_transactions: [],
      });
    }

    // Get recent transactions (last 10)
    const transactions = await sql`
      SELECT 
        id,
        transaction_type,
        amount,
        currency,
        actual_balance_after,
        pending_balance_after,
        description,
        status,
        created_at,
        related_user_id
      FROM crestar_wallet_transactions 
      WHERE wallet_account_id = ${wallet[0].id}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Get payout method
    const payoutMethod = await sql`
      SELECT 
        method_type,
        method_code,
        method_name,
        details,
        is_active,
        created_at
      FROM wallet_payout_methods
      WHERE wallet_account_id = ${wallet[0].id} AND is_active = true
      LIMIT 1
    `;

    return Response.json({
      wallet: wallet[0],
      recent_transactions: transactions,
      payout_method: payoutMethod.length > 0 ? payoutMethod[0] : null,
    });
  } catch (error) {
    console.error("Wallet error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Handle wallet operations (deposit, withdraw, etc.)
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { action, amount, description, recipient_username } = body;

    if (!action) {
      return Response.json({ error: "Action is required" }, { status: 400 });
    }

    const userId = session.user.id;

    // Get user's identity and wallet
    const userIdentity = await sql`
      SELECT identity_id FROM auth_users WHERE id = ${userId}
    `;

    if (userIdentity.length === 0 || !userIdentity[0].identity_id) {
      return Response.json({ error: "Identity not found" }, { status: 404 });
    }

    const identity_id = userIdentity[0].identity_id;

    // Get wallet account
    const wallet = await sql`
      SELECT id, actual_balance, pending_balance 
      FROM wallet_accounts 
      WHERE identity_id = ${identity_id}
    `;

    if (wallet.length === 0) {
      return Response.json({ error: "Wallet not found" }, { status: 404 });
    }

    const walletAccount = wallet[0];

    switch (action) {
      case "deposit":
        // This would typically integrate with Paystack or other payment processor
        if (!amount || amount <= 0) {
          return Response.json(
            { error: "Valid amount required" },
            { status: 400 },
          );
        }

        // For now, simulate deposit (in real implementation, this would be called after payment confirmation)
        const newActualBalance =
          parseFloat(walletAccount.actual_balance) + parseFloat(amount);

        await sql`
          UPDATE wallet_accounts 
          SET actual_balance = ${newActualBalance}, updated_at = NOW()
          WHERE id = ${walletAccount.id}
        `;

        await sql`
          INSERT INTO crestar_wallet_transactions (
            wallet_account_id,
            transaction_type,
            amount,
            actual_balance_before,
            actual_balance_after,
            pending_balance_before,
            pending_balance_after,
            description,
            status
          ) VALUES (
            ${walletAccount.id},
            'deposit',
            ${amount},
            ${walletAccount.actual_balance},
            ${newActualBalance},
            ${walletAccount.pending_balance},
            ${walletAccount.pending_balance},
            ${description || "Wallet deposit"},
            'completed'
          )
        `;

        return Response.json({
          success: true,
          message: "Deposit successful",
          new_balance: newActualBalance,
        });

      case "withdraw":
        if (!amount || amount <= 0) {
          return Response.json(
            { error: "Valid amount required" },
            { status: 400 },
          );
        }

        const currentBalance = parseFloat(walletAccount.actual_balance);
        if (currentBalance < amount) {
          return Response.json(
            { error: "Insufficient balance" },
            { status: 400 },
          );
        }

        const newWithdrawBalance = currentBalance - parseFloat(amount);

        await sql`
          UPDATE wallet_accounts 
          SET actual_balance = ${newWithdrawBalance}, updated_at = NOW()
          WHERE id = ${walletAccount.id}
        `;

        await sql`
          INSERT INTO crestar_wallet_transactions (
            wallet_account_id,
            transaction_type,
            amount,
            actual_balance_before,
            actual_balance_after,
            pending_balance_before,
            pending_balance_after,
            description,
            status
          ) VALUES (
            ${walletAccount.id},
            'withdrawal',
            ${amount},
            ${walletAccount.actual_balance},
            ${newWithdrawBalance},
            ${walletAccount.pending_balance},
            ${walletAccount.pending_balance},
            ${description || "Wallet withdrawal"},
            'completed'
          )
        `;

        return Response.json({
          success: true,
          message: "Withdrawal successful",
          new_balance: newWithdrawBalance,
        });

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Wallet operation error:", error);
    return Response.json(
      { error: "Failed to process wallet operation" },
      { status: 500 },
    );
  }
}
