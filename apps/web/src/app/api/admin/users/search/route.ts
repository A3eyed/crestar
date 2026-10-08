// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';

// GET: Search users for verification management
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // ✅ FIXED: V2 uses text IDs, no need to parseInt

    // Check admin privileges via role
    const [admin] = await sql`
      SELECT id, role FROM "user"
      WHERE id = ${userId} AND role IN ('admin', 'owner', 'moderator')
    `;

    if (!admin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('q') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let users;

    if (searchQuery.trim()) {
      // Search by username, email, or name
      users = await sql`
        SELECT 
          id,
          username,
          email,
          name,
          is_verified,
          is_admin,
          created_at
        FROM "user"
        WHERE 
          username ILIKE ${'%' + searchQuery + '%'} OR
          email ILIKE ${'%' + searchQuery + '%'} OR
          name ILIKE ${'%' + searchQuery + '%'}
        ORDER BY 
          is_verified DESC,
          username ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    } else {
      // Get all users, prioritizing verified users
      users = await sql`
        SELECT 
          id,
          username,
          email,
          name,
          is_verified,
          is_admin,
          created_at
        FROM "user"
        ORDER BY 
          is_verified DESC,
          created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    }

    // Get user stats for verified vs unverified
    const [stats] = await sql`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN is_verified = true THEN 1 ELSE 0 END) as verified_count,
        SUM(CASE WHEN is_admin = true THEN 1 ELSE 0 END) as admin_count
      FROM "user"
    `;

    return Response.json({
      success: true,
      users: users,
      stats: {
        total_users: parseInt(stats.total_users),
        verified_count: parseInt(stats.verified_count),
        unverified_count: parseInt(stats.total_users) - parseInt(stats.verified_count),
        admin_count: parseInt(stats.admin_count),
      },
      pagination: {
        limit,
        offset,
        hasMore: users.length === limit,
      },
    });
  } catch (error) {
    console.error('Admin users search error:', error);
    return Response.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
