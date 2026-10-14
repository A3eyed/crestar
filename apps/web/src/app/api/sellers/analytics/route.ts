// @ts-nocheck
import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';

/**
 * GET /api/sellers/analytics?days=7|28|90
 * TikTok-Shop-style seller analytics built entirely from real data:
 *  - Overview: GMV, orders, avg order value, video views/likes/comments/shares, followers
 *  - Daily trend series for the selected period (revenue + orders)
 *  - Top products by revenue
 *  - Top videos by views
 * All scoped to the signed-in seller.
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const sellerId = session.user.id;

    const { searchParams } = new URL(request.url);
    const daysParam = parseInt(searchParams.get('days') || '28', 10);
    const days = [7, 28, 90].includes(daysParam) ? daysParam : 28;

    const [
      [current],
      [previous],
      dailyRows,
      [videoStats],
      [followerStats],
      topProducts,
      topVideos,
    ] = await sql.transaction([
      // Current period sales
      sql`
        SELECT
          COALESCE(SUM(total_amount), 0) as gmv,
          COUNT(*) as orders,
          COUNT(DISTINCT buyer_id) as customers
        FROM orders
        WHERE seller_id = ${sellerId}
          AND payment_status = 'paid'
          AND created_at >= NOW() - make_interval(days => ${days})
      `,
      // Previous period (for % change, like TikTok's vs-previous badges)
      sql`
        SELECT
          COALESCE(SUM(total_amount), 0) as gmv,
          COUNT(*) as orders
        FROM orders
        WHERE seller_id = ${sellerId}
          AND payment_status = 'paid'
          AND created_at >= NOW() - make_interval(days => ${days * 2})
          AND created_at < NOW() - make_interval(days => ${days})
      `,
      // Daily revenue + orders trend
      sql`
        SELECT
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
          COALESCE(SUM(total_amount), 0) as revenue,
          COUNT(*) as orders
        FROM orders
        WHERE seller_id = ${sellerId}
          AND payment_status = 'paid'
          AND created_at >= NOW() - make_interval(days => ${days})
        GROUP BY 1
        ORDER BY 1
      `,
      // Video engagement totals
      sql`
        SELECT
          COUNT(*) as videos,
          COALESCE(SUM(views_count), 0) as views,
          COALESCE(SUM(likes_count), 0) as likes,
          COALESCE(SUM(comments_count), 0) as comments,
          COALESCE(SUM(shares_count), 0) as shares
        FROM videos
        WHERE creator_user_id = ${sellerId}
          AND COALESCE(status, 'published') NOT IN ('deleted', 'trashed')
      `,
      // Followers total + gained in period
      sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at >= NOW() - make_interval(days => ${days})) as gained
        FROM follows
        WHERE following_id = ${sellerId}
      `,
      // Top products by revenue
      sql`
        SELECT
          p.id,
          p.title,
          p.media,
          COALESCE(SUM(o.total_amount), 0) as revenue,
          COUNT(o.id) as orders,
          COALESCE(SUM(o.quantity), 0) as units
        FROM orders o
        LEFT JOIN products p ON p.id = o.item_id
        WHERE o.seller_id = ${sellerId}
          AND o.payment_status = 'paid'
          AND o.created_at >= NOW() - make_interval(days => ${days})
        GROUP BY p.id, p.title, p.media
        ORDER BY revenue DESC
        LIMIT 10
      `,
      // Top videos by views
      sql`
        SELECT id, caption, thumbnail_url, views_count, likes_count, comments_count, shares_count
        FROM videos
        WHERE creator_user_id = ${sellerId}
          AND COALESCE(status, 'published') NOT IN ('deleted', 'trashed')
        ORDER BY views_count DESC NULLS LAST
        LIMIT 10
      `,
    ]);

    // Build continuous daily trend (fill missing days with 0)
    const dayMap = {};
    for (const row of dailyRows || []) {
      dayMap[row.day] = {
        revenue: parseFloat(row.revenue) || 0,
        orders: parseInt(row.orders) || 0,
      };
    }
    const trend = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trend.push({
        date: label,
        revenue: dayMap[key]?.revenue || 0,
        orders: dayMap[key]?.orders || 0,
      });
    }

    const pctChange = (curr, prev) => {
      const c = parseFloat(curr) || 0;
      const p = parseFloat(prev) || 0;
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 1000) / 10;
    };

    const gmv = parseFloat(current.gmv) || 0;
    const orderCount = parseInt(current.orders) || 0;

    const views = parseInt(videoStats.views) || 0;
    const followers = parseInt(followerStats.total) || 0;
    const followersGained = parseInt(followerStats.gained) || 0;
    const revenueChange = pctChange(current.gmv, previous.gmv);
    const ordersChange = pctChange(current.orders, previous.orders);

    return Response.json({
      days,
      overview: {
        // Primary metrics (SellerAnalytics UI)
        revenue: gmv,
        revenueChange,
        orders: orderCount,
        ordersChange,
        views,
        viewsChange: null,
        followers,
        followersChange: followersGained,
        likes: parseInt(videoStats.likes) || 0,
        comments: parseInt(videoStats.comments) || 0,
        shares: parseInt(videoStats.shares) || 0,
        // Aliases / extras
        gmv,
        gmvChange: revenueChange,
        avgOrderValue: orderCount > 0 ? Math.round((gmv / orderCount) * 100) / 100 : 0,
        customers: parseInt(current.customers) || 0,
        videos: parseInt(videoStats.videos) || 0,
        followersGained,
      },
      trend,
      revenueTrend: trend,
      topProducts: topProducts.map((p) => {
        let image = null;
        try {
          const media = typeof p.media === 'string' ? JSON.parse(p.media) : p.media;
          if (Array.isArray(media) && media.length > 0) {
            image = media[0]?.url || media[0];
          }
        } catch (e) {
          image = null;
        }
        return {
          id: p.id,
          title: p.title,
          image,
          revenue: parseFloat(p.revenue) || 0,
          orders: parseInt(p.orders) || 0,
          units: parseInt(p.units) || 0,
        };
      }),
      topVideos: topVideos.map((v) => ({
        id: v.id,
        caption: v.caption,
        thumbnail: v.thumbnail_url,
        views: parseInt(v.views_count) || 0,
        views_count: parseInt(v.views_count) || 0,
        likes: parseInt(v.likes_count) || 0,
        likes_count: parseInt(v.likes_count) || 0,
        comments: parseInt(v.comments_count) || 0,
        shares: parseInt(v.shares_count) || 0,
      })),
    });
  } catch (error) {
    console.error('Seller analytics GET error:', error);
    return Response.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
