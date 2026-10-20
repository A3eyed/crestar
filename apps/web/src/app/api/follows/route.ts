// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { createNotification, getUserDisplayName } from '@/app/api/utils/notify';

async function resolveTargetUserId(raw) {
  const key = String(raw || '').trim().replace(/^@+/, '');
  if (!key) return null;
  const [row] = await sql`
    SELECT id FROM auth_users
    WHERE id::text = ${key} OR lower(username) = lower(${key})
    LIMIT 1
  `;
  return row?.id ? String(row.id) : null;
}

/**
 * Follows API — TikTok-style follow/unfollow.
 *
 * GET  /api/follows?targetId=<userId|username> → { following, followersCount }
 * POST /api/follows { targetId }              → toggles; returns { following, followersCount }
 */
export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    const { searchParams } = new URL(request.url);
    const targetRaw = searchParams.get('targetId');
    const targetId = await resolveTargetUserId(targetRaw);

    if (!targetId) {
      return Response.json({ error: 'targetId required' }, { status: 400 });
    }

    let following = false;
    if (userId) {
      const rows = await sql`
        SELECT 1 FROM follows
        WHERE follower_id = ${String(userId)} AND following_id = ${targetId}
      `;
      following = rows.length > 0;
    }

    const [counts] = await sql`
      SELECT COUNT(*)::int AS followers_count
      FROM follows WHERE following_id = ${targetId}
    `;

    return Response.json({
      following,
      followersCount: counts?.followers_count || 0,
    });
  } catch (error) {
    console.error('Get follow status error:', error);
    return Response.json({ error: 'Failed to get follow status' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const targetId = await resolveTargetUserId(body.targetId);
    if (!targetId) {
      return Response.json({ error: 'targetId required' }, { status: 400 });
    }
    if (targetId === String(userId)) {
      return Response.json({ error: 'You cannot follow yourself' }, { status: 400 });
    }

    const existing = await sql`
      SELECT id FROM follows
      WHERE follower_id = ${String(userId)} AND following_id = ${targetId}
    `;

    let following;
    if (existing.length > 0) {
      await sql`
        DELETE FROM follows
        WHERE follower_id = ${String(userId)} AND following_id = ${targetId}
      `;
      following = false;
    } else {
      await sql`
        INSERT INTO follows (follower_id, following_id)
        VALUES (${String(userId)}, ${targetId})
        ON CONFLICT (follower_id, following_id) DO NOTHING
      `;
      following = true;

      try {
        const followerName = await getUserDisplayName(userId);
        await createNotification({
          userId: targetId,
          type: 'follow',
          title: '👤 New Follower',
          body: `${followerName} started following you`,
          data: { from_user_id: String(userId) },
        });
      } catch (notifyErr) {
        console.error('Follow notification failed:', notifyErr);
      }
    }

    try {
      await sql`
        UPDATE auth_users SET followers_count = (
          SELECT COUNT(*) FROM follows WHERE following_id = ${targetId}
        ) WHERE id::text = ${targetId}
      `;
      await sql`
        UPDATE auth_users SET following_count = (
          SELECT COUNT(*) FROM follows WHERE follower_id = ${String(userId)}
        ) WHERE id::text = ${String(userId)}
      `;
    } catch (e) {
      console.warn('Follower counter sync failed:', e?.message);
    }

    const [counts] = await sql`
      SELECT COUNT(*)::int AS followers_count
      FROM follows WHERE following_id = ${targetId}
    `;

    return Response.json({
      success: true,
      following,
      followersCount: counts?.followers_count || 0,
    });
  } catch (error) {
    console.error('Toggle follow error:', error);
    return Response.json({ error: 'Failed to update follow' }, { status: 500 });
  }
}
