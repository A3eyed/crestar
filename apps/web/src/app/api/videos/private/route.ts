// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

/** GET /api/videos/private — draft/private videos for the signed-in user only */
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
        v.status,
        v.created_at
      FROM videos v
      WHERE v.creator_user_id = ${userId}
        AND v.status IN ('draft', 'private', 'unpublished')
      ORDER BY v.created_at DESC
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
    console.error('Get private videos error:', error);
    return Response.json({ videos: [] }, { status: 200 });
  }
}
