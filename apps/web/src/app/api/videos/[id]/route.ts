// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/app/api/utils/auth';

/**
 * GET /api/videos/:id
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
      WHERE v.id = ${id} AND (v.status = 'active' OR v.status = 'private')
    `;

    if (!video) {
      return Response.json({ error: 'Video not found' }, { status: 404 });
    }

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

/**
 * PATCH /api/videos/:id — owner can update caption / visibility
 */
export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return Response.json({ error: 'Video ID required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const caption = typeof body.caption === 'string' ? body.caption.slice(0, 500) : null;
    const visibility = body.visibility === 'private' ? 'private' : body.visibility === 'public' ? 'public' : null;

    const [existing] = await sql`
      SELECT id, creator_user_id, status FROM videos WHERE id = ${id} LIMIT 1
    `;
    if (!existing) {
      return Response.json({ error: 'Video not found' }, { status: 404 });
    }
    if (String(existing.creator_user_id) !== String(userId)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nextStatus =
      visibility === 'private'
        ? 'private'
        : visibility === 'public'
          ? 'active'
          : existing.status;

    if (caption != null && visibility != null) {
      await sql`
        UPDATE videos
        SET caption = ${caption},
            status = ${nextStatus},
            updated_at = NOW()
        WHERE id = ${id}
      `;
    } else if (caption != null) {
      await sql`
        UPDATE videos
        SET caption = ${caption},
            updated_at = NOW()
        WHERE id = ${id}
      `;
    } else if (visibility != null) {
      await sql`
        UPDATE videos
        SET status = ${nextStatus},
            updated_at = NOW()
        WHERE id = ${id}
      `;
    }

    return Response.json({ ok: true, status: nextStatus });
  } catch (error) {
    console.error('Patch video error:', error);
    return Response.json({ error: 'Failed to update video' }, { status: 500 });
  }
}
