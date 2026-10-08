// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';

// GET /api/profile/role - Returns the current user's role from the database
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // ✅ FIXED: V2 uses text IDs

    const rows = await sql`
      SELECT role, is_admin FROM "user" WHERE id = ${userId} LIMIT 1
    `;

    if (rows.length === 0) {
      return Response.json({ role: 'user', is_admin: false });
    }

    return Response.json({
      role: rows[0].role || 'user',
      is_admin: rows[0].is_admin || false,
    });
  } catch (error) {
    console.error('Profile role fetch error:', error);
    return Response.json({ error: 'Failed to fetch role' }, { status: 500 });
  }
}
