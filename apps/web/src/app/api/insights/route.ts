// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/app/api/utils/auth';

/**
 * Studio Insights — not a "creator-only" silo.
 * Any signed-in user sees performance for their videos + product tags.
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const uid = String(userId);

    const [totals] = await sql`
      SELECT
        COUNT(*)::int AS videos,
        COALESCE(SUM(views_count), 0)::int AS views,
        COALESCE(SUM(likes_count), 0)::int AS likes,
        COALESCE(SUM(comments_count), 0)::int AS comments,
        COALESCE(SUM(shares_count), 0)::int AS shares
      FROM videos
      WHERE creator_user_id = ${uid}
        AND status = 'active'
    `;

    const topVideos = await sql`
      SELECT
        id,
        caption,
        thumbnail_url,
        video_url,
        views_count,
        likes_count,
        comments_count,
        shares_count,
        created_at
      FROM videos
      WHERE creator_user_id = ${uid}
        AND status = 'active'
      ORDER BY views_count DESC NULLS LAST, created_at DESC
      LIMIT 12
    `;

    const tagStats = await sql`
      SELECT
        COUNT(DISTINCT vpt.video_id)::int AS tagged_videos,
        COUNT(DISTINCT COALESCE(vpt.product_id::text, vpt.service_id::text))::int AS unique_listings
      FROM video_product_tags vpt
      INNER JOIN videos v ON v.id = vpt.video_id
      WHERE v.creator_user_id = ${uid}
        AND v.status = 'active'
    `;

    let orderStats = { orders: 0, gmv: 0 };
    try {
      const [o] = await sql`
        SELECT
          COUNT(*)::int AS orders,
          COALESCE(SUM(total_amount), 0)::float AS gmv
        FROM orders
        WHERE seller_id = ${uid}
          AND status NOT IN ('cancelled', 'failed', 'refunded')
      `;
      if (o) orderStats = { orders: o.orders || 0, gmv: Number(o.gmv) || 0 };
    } catch {
      /* orders table shape may vary */
    }

    return Response.json({
      totals: {
        videos: totals?.videos || 0,
        views: totals?.views || 0,
        likes: totals?.likes || 0,
        comments: totals?.comments || 0,
        shares: totals?.shares || 0,
        taggedVideos: tagStats?.[0]?.tagged_videos || 0,
        uniqueListings: tagStats?.[0]?.unique_listings || 0,
        orders: orderStats.orders,
        gmv: orderStats.gmv,
      },
      topVideos: (topVideos || []).map((v) => ({
        id: v.id,
        caption: v.caption || '',
        thumbnailUrl: v.thumbnail_url,
        videoUrl: v.video_url,
        views: v.views_count || 0,
        likes: v.likes_count || 0,
        comments: v.comments_count || 0,
        shares: v.shares_count || 0,
        createdAt: v.created_at,
      })),
    });
  } catch (err) {
    console.error('Insights API error:', err);
    return Response.json({ error: 'Failed to load insights' }, { status: 500 });
  }
}
