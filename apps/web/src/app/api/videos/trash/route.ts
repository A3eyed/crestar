// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

// Deleted videos are kept in the trash for this many days before permanent removal
const RETENTION_DAYS = 30;

/**
 * Permanently remove trashed videos whose retention period has expired.
 * Runs lazily whenever the trash is accessed.
 */
async function purgeExpired(userId) {
  try {
    const expired = await sql(
      `SELECT id FROM videos
       WHERE creator_user_id = $1
         AND status = 'deleted'
         AND deleted_at IS NOT NULL
         AND deleted_at < now() - ($2 || ' days')::interval`,
      [userId, String(RETENTION_DAYS)]
    );

    for (const row of expired) {
      await sql(`DELETE FROM video_likes WHERE video_id = $1`, [row.id]);
      await sql(`DELETE FROM video_saves WHERE video_id = $1`, [row.id]);
      await sql(`DELETE FROM video_comments WHERE video_id = $1`, [row.id]);
      await sql(`DELETE FROM video_product_tags WHERE video_id = $1`, [row.id]);
      await sql(`DELETE FROM videos WHERE id = $1`, [row.id]);
    }

    if (expired.length > 0) {
      console.log(`🗑️ Purged ${expired.length} expired video(s) for user ${userId}`);
    }
  } catch (err) {
    console.error('Trash purge error:', err);
  }
}

/**
 * GET /api/videos/trash
 * List the current user's recently deleted videos with days remaining.
 */
export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await purgeExpired(userId);

    const videos = await sql`
      SELECT 
        id, video_url, thumbnail_url, caption, duration_seconds,
        views_count, likes_count, comments_count, created_at, deleted_at
      FROM videos
      WHERE creator_user_id = ${userId} AND status = 'deleted'
      ORDER BY deleted_at DESC
    `;

    const now = Date.now();
    const formatted = videos.map((v) => {
      const deletedAt = v.deleted_at ? new Date(v.deleted_at).getTime() : now;
      const elapsedDays = Math.floor((now - deletedAt) / (24 * 60 * 60 * 1000));
      const daysRemaining = Math.max(0, RETENTION_DAYS - elapsedDays);
      return {
        id: v.id,
        videoUrl: v.video_url,
        video_url: v.video_url,
        thumbnailUrl: v.thumbnail_url,
        thumbnail_url: v.thumbnail_url,
        caption: v.caption,
        durationSeconds: v.duration_seconds,
        viewsCount: v.views_count || 0,
        createdAt: v.created_at,
        deletedAt: v.deleted_at,
        deleted_at: v.deleted_at,
        daysRemaining,
        days_remaining: daysRemaining,
      };
    });

    return Response.json({ videos: formatted, retentionDays: RETENTION_DAYS });
  } catch (error) {
    console.error('Get trash error:', error);
    return Response.json({ error: 'Failed to load deleted videos' }, { status: 500 });
  }
}

/**
 * POST /api/videos/trash
 * Restore a deleted video: { videoId }
 */
export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId } = body;
    if (!videoId) {
      return Response.json({ error: 'videoId required' }, { status: 400 });
    }

    const [video] = await sql`
      SELECT id, creator_user_id, status FROM videos WHERE id = ${videoId}
    `;

    if (!video) {
      return Response.json({ error: 'Video not found' }, { status: 404 });
    }
    if (video.creator_user_id !== String(userId)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (video.status !== 'deleted') {
      return Response.json({ error: 'Video is not in the trash' }, { status: 400 });
    }

    await sql`
      UPDATE videos 
      SET status = 'active', deleted_at = NULL, updated_at = NOW()
      WHERE id = ${videoId}
    `;

    return Response.json({ success: true, message: 'Video restored' });
  } catch (error) {
    console.error('Restore video error:', error);
    return Response.json({ error: 'Failed to restore video' }, { status: 500 });
  }
}

/**
 * DELETE /api/videos/trash?videoId=xxx
 * Permanently delete a video from the trash (cannot be undone).
 */
export async function DELETE(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    if (!videoId) {
      return Response.json({ error: 'videoId required' }, { status: 400 });
    }

    const [video] = await sql`
      SELECT id, creator_user_id, status FROM videos WHERE id = ${videoId}
    `;

    if (!video) {
      return Response.json({ error: 'Video not found' }, { status: 404 });
    }
    if (video.creator_user_id !== String(userId)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (video.status !== 'deleted') {
      return Response.json(
        { error: 'Video must be in the trash before permanent deletion' },
        { status: 400 }
      );
    }

    await sql(`DELETE FROM video_likes WHERE video_id = $1`, [videoId]);
    await sql(`DELETE FROM video_saves WHERE video_id = $1`, [videoId]);
    await sql(`DELETE FROM video_comments WHERE video_id = $1`, [videoId]);
    await sql(`DELETE FROM video_product_tags WHERE video_id = $1`, [videoId]);
    await sql(`DELETE FROM videos WHERE id = $1`, [videoId]);

    return Response.json({ success: true, message: 'Video permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    return Response.json({ error: 'Failed to permanently delete video' }, { status: 500 });
  }
}
