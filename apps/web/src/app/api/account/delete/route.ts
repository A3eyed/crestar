import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = String(session.user.id);

    // 1. Check for wallet balance
    const walletRows = await sql`
      SELECT wa.actual_balance, wa.pending_balance
      FROM wallet_accounts wa
      JOIN "user" u ON u.identity_id = wa.identity_id
      WHERE u.id = ${userId}
    `;

    if (walletRows.length > 0) {
      const wallet = walletRows[0];
      const actualBalance = parseFloat(String(wallet.actual_balance || 0));
      const pendingBalance = parseFloat(String(wallet.pending_balance || 0));

      if (actualBalance > 0 || pendingBalance > 0) {
        return Response.json(
          {
            error: 'Cannot delete account with a remaining balance.',
            code: 'HAS_BALANCE',
            balance: actualBalance + pendingBalance,
          },
          { status: 400 }
        );
      }
    }

    // 2. Check for pending orders (as buyer or seller)
    const pendingOrders = await sql`
      SELECT COUNT(*) as cnt
      FROM orders
      WHERE (buyer_id = ${userId} OR seller_id = ${userId})
        AND status NOT IN ('completed', 'cancelled', 'refunded')
    `;

    const pendingCount = parseInt(String(pendingOrders[0]?.cnt || 0));
    if (pendingCount > 0) {
      return Response.json(
        {
          error: 'Cannot delete account with pending orders.',
          code: 'HAS_PENDING_ORDERS',
          count: pendingCount,
        },
        { status: 400 }
      );
    }

    // 3. Soft-delete: remove personal data but keep order records
    // Mark videos as removed
    await sql`UPDATE videos SET status = 'removed' WHERE creator_user_id = ${userId}`;

    // Get all sessions for this user and invalidate them through Better Auth
    const sessions = await sql`SELECT token FROM session WHERE "userId" = ${userId}`;
    for (const sessionRow of sessions) {
      try {
        await auth.api.invalidateSession({
          headers: request.headers,
          query: {
            sessionToken: sessionRow.token,
          },
        });
      } catch (err) {
        console.error('Failed to invalidate session:', err);
        // Continue even if session invalidation fails
      }
    }

    // Anonymize user record (GDPR-style soft delete)
    await sql`
      UPDATE "user"
      SET
        name = 'Deleted User',
        email = CONCAT('deleted_', id, '@deleted.invalid'),
        image = NULL,
        username = CONCAT('deleted_', id),
        display_name = 'Deleted User',
        bio = NULL,
        profile_image = NULL,
        phone = NULL,
        "emailVerified" = NULL
      WHERE id = ${userId}
    `;

    // Remove auth account (login credentials) - safe after sessions invalidated
    await sql`DELETE FROM account WHERE "userId" = ${userId}`;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return Response.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
