import { NextRequest } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Get total posts
    const postsResult = await sql`
      SELECT COUNT(*) as count FROM videos WHERE creator_user_id = ${id}
    `;
    const posts = Number(postsResult[0]?.count || 0);

    // Get total views
    const viewsResult = await sql`
      SELECT SUM(views_count) as total FROM videos WHERE creator_user_id = ${id}
    `;
    const totalViews = Number(viewsResult[0]?.total || 0);

    // Get total likes
    const likesResult = await sql`
      SELECT SUM(likes_count) as total FROM videos WHERE creator_user_id = ${id}
    `;
    const totalLikes = Number(likesResult[0]?.total || 0);

    // Get total sales (if seller)
    const salesResult = await sql`
      SELECT COUNT(*) as count, SUM(total_amount) as total
      FROM orders
      WHERE seller_id = ${id} AND status = 'completed'
    `;
    const totalSales = Number(salesResult[0]?.total || 0);
    const orderCount = Number(salesResult[0]?.count || 0);

    // Get follower/following count from auth_users table
    const userResult = await sql`
      SELECT followers_count, following_count FROM auth_users WHERE id = ${id}
    `;
    const followers = Number(userResult[0]?.followers_count || 0);
    const following = Number(userResult[0]?.following_count || 0);

    return Response.json({
      posts,
      followers,
      following,
      totalViews,
      totalLikes,
      totalSales,
      orderCount,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return Response.json({ error: 'Failed to fetch user stats' }, { status: 500 });
  }
}
