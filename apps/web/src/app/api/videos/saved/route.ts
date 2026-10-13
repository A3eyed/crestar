// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

/** GET /api/videos/saved — videos the current user saved */
export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Please sign in to continue.' }, { status: 401 });
    }

    // video_saves may not exist on every branch — fall back gracefully
    let videos = [];
    try {
      videos = await sql`
        SELECT
          v.id,
          v.creator_user_id,
          v.video_url,
          v.thumbnail_url,
          v.caption,
          v.views_count,
          v.likes_count,
          v.comments_count,
          v.created_at,
          vs.created_at AS saved_at
        FROM video_saves vs
        JOIN videos v ON v.id = vs.video_id
        WHERE vs.user_id = ${userId}
          AND (v.status IS NULL OR v.status IN ('active', 'published'))
        ORDER BY vs.created_at DESC
        LIMIT 100
      `;
    } catch (e) {
      console.warn('video_saves query failed:', e?.message);
      videos = [];
    }

    return Response.json({
      videos: videos.map((v) => ({
        ...v,
        views_count: v.views_count || 0,
        likes_count: v.likes_count || 0,
      })),
    });
  } catch (error) {
    console.error('Get saved videos error:', error);
    return Response.json({ videos: [] }, { status: 200 });
  }
}
