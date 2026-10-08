// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { videoUrl, thumbnailUrl, caption, taggedProducts, durationSeconds } = body;

    // resolveUserId supports BOTH web sessions and mobile JWT tokens
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    // ── REQUIRED: every video must tag at least one product/service ──
    const validTags = (taggedProducts || []).filter((t) => t?.productId || t?.serviceId);
    if (validTags.length === 0) {
      return Response.json(
        { error: 'You must tag at least one product before posting a video' },
        { status: 400 }
      );
    }

    // Create video record in videos table
    const [video] = await sql`
      INSERT INTO videos (
        creator_user_id,
        video_url,
        thumbnail_url,
        caption,
        duration_seconds,
        status
      ) VALUES (
        ${userId},
        ${videoUrl},
        ${thumbnailUrl || null},
        ${caption || ''},
        ${durationSeconds || null},
        'active'
      )
      RETURNING *
    `;

    // Create product tags (always present — enforced above)
    for (const productTag of validTags) {
      const { productId, serviceId } = productTag;

      await sql`
        INSERT INTO video_product_tags (
          video_id,
          product_id,
          service_id
        ) VALUES (
          ${video.id},
          ${productId || null},
          ${serviceId || null}
        )
      `;
    }

    return Response.json({
      success: true,
      message: 'Video posted successfully',
      video: {
        id: video.id,
        videoUrl: video.video_url,
        thumbnailUrl: video.thumbnail_url,
        caption: video.caption,
        createdAt: video.created_at,
      },
    });
  } catch (error) {
    console.error('Video upload error:', error);
    return Response.json({ error: 'Failed to upload video' }, { status: 500 });
  }
}
