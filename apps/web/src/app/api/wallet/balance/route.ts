// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';
import { resolveUserId } from '@/app/api/utils/auth';

const PENDING_STATUSES = ['paid', 'preparing', 'ready_for_pickup', 'in_transit'];

export async function GET(request) {
  try {
    let userId = await resolveUserId(request).catch(() => null);
    if (!userId) {
      const session = await auth();
      userId = session?.user?.id || null;
    }
    if (!userId) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }
    userId = String(userId);

    const userResult = await sql`
      SELECT identity_id FROM auth_users WHERE id = ${userId} LIMIT 1
    `;

    if (!userResult.length) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    let identityId = userResult[0].identity_id;

    if (!identityId) {
      const [newIdentity] = await sql`
        INSERT INTO identities DEFAULT VALUES RETURNING id
      `;
      identityId = newIdentity.id;
      await sql`
        UPDATE auth_users SET identity_id = ${identityId} WHERE id = ${userId}
      `;
      await sql`
        INSERT INTO identity_accounts (identity_id, user_id, is_primary)
        VALUES (${identityId}, ${userId}, true)
        ON CONFLICT (identity_id, user_id) DO NOTHING
      `;
    }

    await sql`
      INSERT INTO wallet_accounts (identity_id, account_type, currency, actual_balance, pending_balance)
      VALUES (${identityId}, 'personal', 'GHS', 0, 0)
      ON CONFLICT (identity_id) DO NOTHING
    `;

    const walletResult = await sql`
      SELECT actual_balance, pending_balance, currency
      FROM wallet_accounts
      WHERE identity_id = ${identityId}
      LIMIT 1
    `;

    if (!walletResult.length) {
      throw new Error('Failed to create wallet account');
    }

    const wallet = walletResult[0];
    const available = parseFloat(wallet.actual_balance) || 0;

    // Live pending from paid orders not yet delivered (escrow hold for sellers)
    let escrowPending = 0;
    let pendingOrderCount = 0;
    try {
      const pendingRows = await sql`
        SELECT
          COALESCE(SUM(COALESCE(seller_payout, total_amount * 0.97)), 0) AS pending_sum,
          COUNT(*)::int AS cnt
        FROM orders
        WHERE seller_id = ${userId}
          AND status = ANY(${PENDING_STATUSES})
          AND (payment_status = 'paid' OR status = 'paid' OR status = 'preparing'
               OR status = 'ready_for_pickup' OR status = 'in_transit')
      `;
      escrowPending = parseFloat(pendingRows?.[0]?.pending_sum) || 0;
      pendingOrderCount = pendingRows?.[0]?.cnt || 0;
    } catch (e) {
      console.warn('pending escrow query', e?.message || e);
      escrowPending = parseFloat(wallet.pending_balance) || 0;
    }

    // Prefer the larger of ledger pending vs live escrow (avoids double-count drift)
    const ledgerPending = parseFloat(wallet.pending_balance) || 0;
    const pendingBalance = Math.max(ledgerPending, escrowPending);

    return Response.json({
      actualBalance: available,
      pendingBalance,
      balance: available,
      currency: wallet.currency || 'GHS',
      pendingOrderCount,
      pendingSource: 'orders_escrow',
      message:
        pendingBalance > 0
          ? 'Pending includes earnings from orders awaiting buyer delivery confirmation.'
          : undefined,
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    return Response.json({ error: 'Failed to get wallet balance' }, { status: 500 });
  }
}
