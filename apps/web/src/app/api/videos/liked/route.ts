// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

/** GET /api/videos/liked — videos the current user has liked */
export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Please sign in to continue.' }, { status: 401 });
    }

    const videos = await sql`
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
        vl.created_at AS liked_at
      FROM video_likes vl
      JOIN videos v ON v.id = vl.video_id
      WHERE vl.user_id = ${userId}
        AND (v.status IS NULL OR v.status IN ('active', 'published'))
      ORDER BY vl.created_at DESC
      LIMIT 100
    `;

    return Response.json({
      videos: videos.map((v) => ({
        ...v,
        views_count: v.views_count || 0,
        likes_count: v.likes_count || 0,
      })),
    });
  } catch (error) {
    console.error('Get liked videos error:', error);
    return Response.json({ videos: [], error: 'Could not load liked videos' }, { status: 200 });
  }
}
