// @ts-nocheck
import sql from '@/app/api/utils/sql';

/**
 * POST /api/videos/share
 * Increments a video's share counter (called when a user shares via the
 * native share sheet — same behavior as TikTok's share count).
 * No auth required: shares can happen from logged-out sessions too.
 */
export async function POST(request) {
  try {
    const { videoId } = await request.json();

    if (!videoId) {
      return Response.json({ error: 'videoId required' }, { status: 400 });
    }

    const [video] = await sql`
      UPDATE videos
      SET shares_count = COALESCE(shares_count, 0) + 1
      WHERE id = ${videoId}
      RETURNING id, shares_count
    `;

    if (!video) {
      return Response.json({ error: 'Video not found' }, { status: 404 });
    }

    return Response.json({ success: true, sharesCount: video.shares_count });
  } catch (error) {
    console.error('Share video error:', error);
    return Response.json({ error: 'Failed to record share' }, { status: 500 });
  }
}
