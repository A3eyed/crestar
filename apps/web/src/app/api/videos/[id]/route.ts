// @ts-nocheck
import sql from '@/app/api/utils/sql';

/**
 * GET /api/videos/:id
 * Returns a single video with its creator info and tagged products —
 * used by the web video viewer (TikTok-style profile video playback).
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return Response.json({ error: 'Video ID required' }, { status: 400 });
    }

    const [video] = await sql`
      SELECT 
        v.*,
        u.username,
        u.display_name,
        u.profile_image,
        u.is_verified,
        COALESCE(pp.business_name, bc.business_name) as business_name
      FROM videos v
      LEFT JOIN auth_users u ON v.creator_user_id = u.id::text
      LEFT JOIN professional_profiles pp ON pp.user_id = v.creator_user_id
      LEFT JOIN business_centers bc ON bc.identity_id = u.identity_id
      WHERE v.id = ${id} AND v.status = 'active'
    `;

    if (!video) {
      return Response.json({ error: 'Video not found' }, { status: 404 });
    }

    // Tagged products / services with live details
    const taggedItems = await sql`
      SELECT 
        vpt.product_id,
        vpt.service_id,
        p.title as product_title,
        p.price as product_price,
        p.media as product_media,
        p.stock_quantity as product_stock,
        p.seller_currency,
        s.title as service_title,
        s.basic_price as service_price,
        s.media as service_media
      FROM video_product_tags vpt
      LEFT JOIN products p ON vpt.product_id = p.id AND p.status = 'active'
      LEFT JOIN services s ON vpt.service_id = s.id AND s.status = 'active'
      WHERE vpt.video_id = ${id}
    `;

    return Response.json({
      video: {
        ...video,
        tagged_items: taggedItems,
      },
    });
  } catch (error) {
    console.error('Get video error:', error);
    return Response.json({ error: 'Failed to get video' }, { status: 500 });
  }
}
