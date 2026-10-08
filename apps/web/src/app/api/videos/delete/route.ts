// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

export async function DELETE(request) {
  try {
    // Supports BOTH web sessions and mobile JWT tokens
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return Response.json({ error: 'videoId required' }, { status: 400 });
    }

    // Verify ownership
    const [video] = await sql`
      SELECT id, creator_user_id FROM videos WHERE id = ${videoId}
    `;

    if (!video) {
      return Response.json({ error: 'Video not found' }, { status: 404 });
    }

    if (video.creator_user_id !== String(userId)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Move to trash (TikTok-style): keep the video + its product tags for 30
    // days so it can be restored from the "Recently deleted" section.
    // Permanent removal happens via /api/videos/trash after retention expires.
    await sql`
      UPDATE videos 
      SET status = 'deleted', deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${videoId}
    `;

    return Response.json({
      success: true,
      message: 'Video moved to Recently deleted. It will be permanently removed after 30 days.',
    });
  } catch (error) {
    console.error('Delete video error:', error);
    return Response.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}
