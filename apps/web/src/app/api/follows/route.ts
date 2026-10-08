// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { createNotification, getUserDisplayName } from '@/app/api/utils/notify';

/**
 * Follows API — TikTok-style follow/unfollow.
 *
 * GET  /api/follows?targetId=<userId>   → { following: boolean, followersCount }
 * POST /api/follows { targetId }        → toggles follow; returns { following, followersCount }
 */
export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('targetId');

    if (!targetId) {
      return Response.json({ error: 'targetId required' }, { status: 400 });
    }

    let following = false;
    if (userId) {
      const rows = await sql`
        SELECT 1 FROM follows
        WHERE follower_id = ${userId} AND following_id = ${targetId}
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

    const { targetId } = await request.json();
    if (!targetId) {
      return Response.json({ error: 'targetId required' }, { status: 400 });
    }
    if (targetId === userId) {
      return Response.json({ error: 'You cannot follow yourself' }, { status: 400 });
    }

    // Toggle: unfollow if already following, otherwise follow
    const existing = await sql`
      SELECT id FROM follows
      WHERE follower_id = ${userId} AND following_id = ${targetId}
    `;

    let following;
    if (existing.length > 0) {
      await sql`
        DELETE FROM follows
        WHERE follower_id = ${userId} AND following_id = ${targetId}
      `;
      following = false;
    } else {
      await sql`
        INSERT INTO follows (follower_id, following_id)
        VALUES (${userId}, ${targetId})
        ON CONFLICT (follower_id, following_id) DO NOTHING
      `;
      following = true;

      // Notify the followed user (in-app)
      try {
        const followerName = await getUserDisplayName(userId);
        await createNotification({
          userId: targetId,
          type: 'follow',
          title: '👤 New Follower',
          body: `${followerName} started following you`,
          data: { from_user_id: userId },
        });
      } catch (notifyErr) {
        console.error('Follow notification failed:', notifyErr);
      }
    }

    // Keep denormalized counters in sync on auth_users (best effort)
    try {
      await sql`
        UPDATE auth_users SET followers_count = (
          SELECT COUNT(*) FROM follows WHERE following_id = ${targetId}
        ) WHERE id = ${targetId}
      `;
      await sql`
        UPDATE auth_users SET following_count = (
          SELECT COUNT(*) FROM follows WHERE follower_id = ${userId}
        ) WHERE id = ${userId}
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
