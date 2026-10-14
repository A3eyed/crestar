// @ts-nocheck
/**
 * POST /api/admin/broadcast
 * Admin-only in-app broadcast to audience segments tied to monetization programs.
 *
 * Body: { audience: 'everyone'|'sellers'|'foodhub'|'creators'|'deliverers', title, body }
 */
import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';
import { createNotification } from '@/app/api/utils/notify';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [user] = await sql`
    SELECT id, role, is_admin FROM auth_users WHERE id = ${session.user.id}
  `;
  if (
    !user ||
    (!user.is_admin && !['admin', 'owner', 'moderator'].includes(user.role))
  ) {
    return null;
  }
  return user;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const rows = await sql`
      SELECT id, title, body, data, created_at
      FROM notifications
      WHERE type = 'broadcast'
      ORDER BY created_at DESC
      LIMIT 30
    `;
    return Response.json({ broadcasts: rows });
  } catch (err) {
    console.error('[admin/broadcast GET]', err);
    return Response.json({ error: 'Failed to load broadcasts' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const audience = (body.audience || 'everyone').toString();
    const title = (body.title || '').toString().trim();
    const message = (body.body || body.message || '').toString().trim();

    const allowed = ['everyone', 'sellers', 'foodhub', 'creators', 'deliverers'];
    if (!allowed.includes(audience)) {
      return Response.json({ error: 'Invalid audience' }, { status: 400 });
    }
    if (!title || !message) {
      return Response.json({ error: 'Title and message are required' }, { status: 400 });
    }

    let userIds = [];

    if (audience === 'everyone') {
      const rows = await sql`
        SELECT id FROM auth_users
        LIMIT 5000
      `;
      userIds = rows.map((r) => r.id);
    } else {
      const centerType =
        audience === 'sellers'
          ? 'seller'
          : audience === 'foodhub'
            ? 'foodhub'
            : audience === 'creators'
              ? 'creator'
              : 'deliverer';

      const rows = await sql`
        SELECT DISTINCT identity_id AS id
        FROM business_centers
        WHERE center_type = ${centerType}
          AND (
            verification_status = 'approved'
            OR status = 'active'
            OR verification_status IS NULL
          )
        LIMIT 5000
      `;
      userIds = rows.map((r) => r.id).filter(Boolean);
    }

    userIds = [...new Set(userIds.map(String))];

    let sent = 0;
    for (const uid of userIds) {
      try {
        await createNotification({
          userId: uid,
          type: 'broadcast',
          title,
          body: message,
          data: { audience, from_admin: true },
        });
        sent += 1;
      } catch (e) {
        // continue
      }
    }

    try {
      await createNotification({
        userId: admin.id,
        type: 'broadcast',
        title: `[Broadcast log] ${title}`,
        body: message,
        data: { audience, recipient_count: sent, log: true },
      });
    } catch (_) {}

    return Response.json({
      success: true,
      audience,
      recipients: sent,
      message: `Broadcast sent to ${sent} user(s) in "${audience}".`,
    });
  } catch (err) {
    console.error('[admin/broadcast POST]', err);
    return Response.json(
      { error: err.message || 'Failed to send broadcast' },
      { status: 500 },
    );
  }
}
