// @ts-nocheck
import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';

async function requireAdmin(session) {
  if (!session?.user?.id) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  const [row] = await sql`
    SELECT id, role, is_admin FROM auth_users WHERE id = ${String(session.user.id)} LIMIT 1
  `;
  const ok =
    row &&
    (row.is_admin === true ||
      row.role === 'admin' ||
      row.role === 'owner' ||
      row.role === 'moderator');
  if (!ok) return { error: Response.json({ error: 'Admin privileges required' }, { status: 403 }) };
  return { admin: row };
}

/**
 * POST /api/admin/moderate
 * body: { action, userId, reason?, message?, title? }
 * actions: warn | clear_warning | suspend | unsuspend | revoke_monetization
 *          | grant_verification | revoke_verification | broadcast
 */
export async function POST(request) {
  try {
    const session = await auth();
    const gate = await requireAdmin(session);
    if (gate.error) return gate.error;

    const body = await request.json();
    const action = String(body?.action || '').trim();
    const targetUserId = body?.userId ? String(body.userId) : null;
    const reason = body?.reason ? String(body.reason).slice(0, 2000) : null;
    const message = body?.message ? String(body.message).slice(0, 4000) : null;

    if (action === 'broadcast') {
      if (!message) return Response.json({ error: 'message required' }, { status: 400 });
      const users = await sql`SELECT id FROM auth_users WHERE COALESCE(account_status, 'active') <> 'deleted'`;
      let sent = 0;
      for (const u of users) {
        await sql`
          INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at)
          VALUES (
            ${String(u.id)},
            'platform_update',
            ${body.title || 'Crestar update'},
            ${message},
            ${JSON.stringify({ from: 'admin', adminId: session.user.id })}::jsonb,
            false,
            NOW()
          )
        `;
        sent += 1;
      }
      return Response.json({ success: true, sent });
    }

    if (!targetUserId) {
      return Response.json({ error: 'userId required' }, { status: 400 });
    }

    const [target] = await sql`SELECT id, username FROM auth_users WHERE id = ${targetUserId}`;
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    if (action === 'warn') {
      await sql`
        UPDATE auth_users
        SET account_warning = ${reason || message || 'Warning for policy violation'},
            account_warning_at = NOW(),
            updated_at = NOW()
        WHERE id = ${targetUserId}
      `;
      await sql`
        INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at)
        VALUES (
          ${targetUserId},
          'account_warning',
          'Account warning',
          ${reason || message || 'Your account received a warning for violating Crestar policies.'},
          ${JSON.stringify({ from: 'admin' })}::jsonb,
          false,
          NOW()
        )
      `;
      return Response.json({ success: true, action: 'warn' });
    }

    if (action === 'clear_warning') {
      await sql`
        UPDATE auth_users
        SET account_warning = NULL, account_warning_at = NULL, updated_at = NOW()
        WHERE id = ${targetUserId}
      `;
      return Response.json({ success: true, action: 'clear_warning' });
    }

    if (action === 'suspend') {
      await sql`
        UPDATE auth_users
        SET account_status = 'suspended',
            suspended_at = NOW(),
            suspended_reason = ${reason || 'Suspended by admin'},
            updated_at = NOW()
        WHERE id = ${targetUserId}
      `;
      await sql`
        INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at)
        VALUES (
          ${targetUserId},
          'account_suspended',
          'Account suspended',
          ${reason || 'Your account has been suspended.'},
          ${JSON.stringify({ from: 'admin' })}::jsonb,
          false,
          NOW()
        )
      `;
      return Response.json({ success: true, action: 'suspend' });
    }

    if (action === 'unsuspend') {
      await sql`
        UPDATE auth_users
        SET account_status = 'active',
            suspended_at = NULL,
            suspended_reason = NULL,
            updated_at = NOW()
        WHERE id = ${targetUserId}
      `;
      return Response.json({ success: true, action: 'unsuspend' });
    }

    if (action === 'revoke_monetization') {
      await sql`
        UPDATE business_centers
        SET status = 'revoked',
            verification_status = 'revoked',
            updated_at = NOW()
        WHERE owner_user_id = ${targetUserId}
           OR identity_id IN (SELECT identity_id FROM auth_users WHERE id = ${targetUserId})
      `;
      await sql`
        INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at)
        VALUES (
          ${targetUserId},
          'monetization_revoked',
          'Monetization access revoked',
          ${reason || 'Your seller/deliverer monetization access has been revoked.'},
          ${JSON.stringify({ from: 'admin' })}::jsonb,
          false,
          NOW()
        )
      `;
      return Response.json({ success: true, action: 'revoke_monetization' });
    }

    if (action === 'grant_verification') {
      await sql`
        UPDATE auth_users SET is_verified = TRUE, updated_at = NOW() WHERE id = ${targetUserId}
      `;
      return Response.json({ success: true, action: 'grant_verification' });
    }

    if (action === 'revoke_verification') {
      await sql`
        UPDATE auth_users SET is_verified = FALSE, updated_at = NOW() WHERE id = ${targetUserId}
      `;
      return Response.json({ success: true, action: 'revoke_verification' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[admin/moderate]', error);
    return Response.json({ error: 'Moderation failed', detail: error.message }, { status: 500 });
  }
}
