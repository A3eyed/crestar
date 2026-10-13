// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { videoUrl, thumbnailUrl, caption, taggedProducts, durationSeconds } = body;

    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Please sign in to post' }, { status: 401 });
    }

    if (!videoUrl || typeof videoUrl !== 'string') {
      return Response.json({ error: 'Video upload did not finish. Try again.' }, { status: 400 });
    }

    const validTags = (taggedProducts || []).filter((t) => t?.productId || t?.serviceId);
    if (validTags.length === 0) {
      return Response.json(
        { error: 'Tag at least one product before posting' },
        { status: 400 },
      );
    }

    let video;
    try {
      const rows = await sql`
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
      video = rows?.[0];
    } catch (e) {
      console.error('videos insert failed', e?.message || e);
      return Response.json(
        { error: 'Could not save your video. Please try again in a moment.' },
        { status: 500 },
      );
    }

    if (!video?.id) {
      return Response.json({ error: 'Could not save your video' }, { status: 500 });
    }

    for (const productTag of validTags) {
      try {
        await sql`
          INSERT INTO video_product_tags (
            video_id,
            product_id,
            service_id
          ) VALUES (
            ${video.id},
            ${productTag.productId || null},
            ${productTag.serviceId || null}
          )
        `;
      } catch (tagErr) {
        console.warn('video tag insert failed', tagErr?.message || tagErr);
      }
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
    return Response.json(
      { error: 'Could not publish video. Please try again.' },
      { status: 500 },
    );
  }
}
