// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get wallet transaction history
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "20"),
      100,
    );
    const offset = parseInt(url.searchParams.get("offset") || "0");

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
    const walletAccount = await sql`
      SELECT id FROM wallet_accounts WHERE identity_id = ${identity_id} LIMIT 1
    `;

    if (walletAccount.length === 0) {
      return Response.json({ transactions: [] });
    }

    const wallet_id = walletAccount[0].id;

    // Get wallet transactions
    const transactions = await sql`
      SELECT 
        id,
        transaction_type,
        amount,
        actual_balance_before,
        actual_balance_after, 
        pending_balance_before,
        pending_balance_after,
        reference,
        description,
        related_user_id,
        status,
        created_at,
        completed_at
      FROM crestar_wallet_transactions
      WHERE wallet_account_id = ${wallet_id}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return Response.json({
      transactions: transactions,
      has_more: transactions.length === limit,
    });
  } catch (error) {
    console.error("Wallet transactions error:", error);
    return Response.json(
      { error: "Failed to get transactions" },
      { status: 500 },
    );
  }
}
