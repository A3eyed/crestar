// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';
import { createNotification } from '@/app/api/utils/notify';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const body = await request.json();
    const { videoId, commentText } = body;

    if (!videoId || !commentText?.trim()) {
      return Response.json({ error: 'Video ID and comment text required' }, { status: 400 });
    }

    // Insert comment (table now exists in database)
    const [comment] = await sql`
      INSERT INTO video_comments (video_id, user_id, comment_text)
      VALUES (${videoId}, ${userId}, ${commentText.trim()})
      RETURNING *
    `;

    // Update video comments count
    await sql`UPDATE videos SET comments_count = comments_count + 1 WHERE id = ${videoId}`;

    // Get user info for response
    const [user] = await sql`
      SELECT name, email, username, profile_image 
      FROM auth_users 
      WHERE id = ${userId}
    `;

    // Notify the video creator (in-app) — never notify yourself
    try {
      const [video] = await sql`
        SELECT creator_user_id FROM videos WHERE id = ${videoId} LIMIT 1
      `;
      if (video?.creator_user_id && video.creator_user_id !== userId) {
        const commenterName = user?.username || user?.name || 'Someone';
        const preview = commentText.trim().slice(0, 80);
        await createNotification({
          userId: video.creator_user_id,
          type: 'comment',
          title: '💬 New Comment',
          body: `${commenterName} commented: "${preview}"`,
          data: { video_id: videoId, comment_id: comment.id, from_user_id: userId },
        });
      }
    } catch (notifyErr) {
      console.error('Comment notification failed:', notifyErr);
    }

    return Response.json({
      success: true,
      comment: {
        id: comment.id,
        text: comment.comment_text,
        createdAt: comment.created_at,
        user: {
          username: user?.username || user?.email?.split('@')[0] || 'user',
          profileImage: user?.profile_image,
          name: user?.name,
        },
      },
    });
  } catch (error) {
    console.error('Post comment error:', error);
    return Response.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return Response.json({ error: 'Video ID required' }, { status: 400 });
    }

    // Get comments with user info
    const comments = await sql`
      SELECT 
        vc.id,
        vc.comment_text,
        vc.created_at,
        vc.user_id,
        au.username,
        au.email,
        au.name,
        au.profile_image,
        au.is_verified
      FROM video_comments vc
      LEFT JOIN auth_users au ON vc.user_id = au.id::text
      WHERE vc.video_id = ${videoId}
      ORDER BY vc.created_at DESC
      LIMIT 100
    `;

    const formattedComments = comments.map((c) => ({
      id: c.id,
      text: c.comment_text,
      createdAt: c.created_at,
      user: {
        id: c.user_id,
        username: c.username || c.email?.split('@')[0] || 'user',
        profileImage: c.profile_image,
        name: c.name,
        isVerified: c.is_verified || false,
      },
    }));

    return Response.json({ comments: formattedComments });
  } catch (error) {
    console.error('Get comments error:', error);
    return Response.json({ error: 'Failed to get comments' }, { status: 500 });
  }
}
