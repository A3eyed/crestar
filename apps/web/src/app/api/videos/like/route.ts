// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';
import { createNotification, getUserDisplayName } from '@/app/api/utils/notify';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return Response.json({ error: 'Video ID required' }, { status: 400 });
    }

    // Check if already liked
    const existing = await sql`
      SELECT id FROM video_likes WHERE video_id = ${videoId} AND user_id = ${userId}
    `;

    if (existing.length > 0) {
      // Unlike
      await sql`DELETE FROM video_likes WHERE video_id = ${videoId} AND user_id = ${userId}`;
      await sql`UPDATE videos SET likes_count = likes_count - 1 WHERE id = ${videoId}`;

      return Response.json({ liked: false, message: 'Unliked' });
    } else {
      // Like
      await sql`INSERT INTO video_likes (video_id, user_id) VALUES (${videoId}, ${userId})`;
      await sql`UPDATE videos SET likes_count = likes_count + 1 WHERE id = ${videoId}`;

      // Notify the video creator (in-app) — never notify yourself
      try {
        const [video] = await sql`
          SELECT creator_user_id, caption FROM videos WHERE id = ${videoId} LIMIT 1
        `;
        if (video?.creator_user_id && video.creator_user_id !== userId) {
          const likerName = await getUserDisplayName(userId);
          await createNotification({
            userId: video.creator_user_id,
            type: 'like',
            title: '❤️ New Like',
            body: `${likerName} liked your video`,
            data: { video_id: videoId, from_user_id: userId },
          });
        }
      } catch (notifyErr) {
        console.error('Like notification failed:', notifyErr);
      }

      return Response.json({ liked: true, message: 'Liked' });
    }
  } catch (error) {
    console.error('Like video error:', error);
    return Response.json({ error: 'Failed to like video' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return Response.json({ error: 'Video ID required' }, { status: 400 });
    }

    const existing = await sql`
      SELECT id FROM video_likes WHERE video_id = ${videoId} AND user_id = ${userId}
    `;

    return Response.json({ liked: existing.length > 0 });
  } catch (error) {
    console.error('Check like status error:', error);
    return Response.json({ error: 'Failed to check like status' }, { status: 500 });
  }
}
