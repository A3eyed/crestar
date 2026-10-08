// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';

export async function GET(request) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const userId = session.user.id.toString();

    // Get user's identity_id
    const userResult = await sql`
      SELECT identity_id FROM auth_users WHERE id = ${userId} LIMIT 1
    `;

    if (!userResult.length) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    let identityId = userResult[0].identity_id;

    // Auto-create identity if user doesn't have one
    if (!identityId) {
      const [newIdentity] = await sql`
        INSERT INTO identities DEFAULT VALUES RETURNING id
      `;
      identityId = newIdentity.id;

      // Link identity to user
      await sql`
        UPDATE auth_users SET identity_id = ${identityId} WHERE id = ${userId}
      `;

      // Also create identity_account link
      await sql`
        INSERT INTO identity_accounts (identity_id, user_id, is_primary)
        VALUES (${identityId}, ${userId}, true)
        ON CONFLICT (identity_id, user_id) DO NOTHING
      `;
    }

    // Ensure wallet account exists
    await sql`
      INSERT INTO wallet_accounts (identity_id, account_type, currency, actual_balance, pending_balance)
      VALUES (${identityId}, 'personal', 'GHS', 0, 0)
      ON CONFLICT (identity_id) DO NOTHING
    `;

    // Get wallet balances from new system
    const walletResult = await sql`
      SELECT actual_balance, pending_balance 
      FROM wallet_accounts 
      WHERE identity_id = ${identityId} 
      LIMIT 1
    `;

    if (!walletResult.length) {
      throw new Error('Failed to create wallet account');
    }

    const wallet = walletResult[0];

    return Response.json({
      actualBalance: parseFloat(wallet.actual_balance),
      pendingBalance: parseFloat(wallet.pending_balance),
      // Legacy field for backward compatibility
      balance: parseFloat(wallet.actual_balance),
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    return Response.json({ error: 'Failed to get wallet balance' }, { status: 500 });
  }
}
