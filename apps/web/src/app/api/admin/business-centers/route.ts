// @ts-nocheck
import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';

// The better-auth session user does NOT carry a `role` field, so the old
// requireAdminAccess(session.user) check always failed with 403 for real
// admins. Check the role in the database instead (same as other admin routes).
async function checkAdminAccess(userId) {
  const [admin] = await sql`
    SELECT id, role FROM auth_users
    WHERE id = ${userId} AND role IN ('admin', 'owner', 'moderator')
  `;
  return !!admin;
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await checkAdminAccess(session.user.id);
    if (!isAdmin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const centerType = searchParams.get('type') || '';

    // Build query — LEFT JOINs so centers still show even if the identity
    // mapping row is missing; fall back to auth_users via identity_id.
    let query = `
      SELECT 
        bc.id,
        bc.identity_id,
        bc.business_name,
        bc.center_type,
        bc.status,
        bc.verification_status,
        bc.full_name,
        bc.phone_number,
        bc.momo_number,
        bc.ghana_card_photo,
        bc.business_permit_photo,
        bc.portfolio_media,
        bc.delivery_method,
        bc.delivery_regions,
        bc.delivery_cities,
        bc.country,
        bc.region,
        bc.city,
        bc.village,
        bc.vehicle_type,
        bc.vehicle_photo,
        bc.is_available,
        bc.operating_regions,
        bc.intercity_routes,
        bc.paystack_subaccount_code,
        bc.payment_setup_complete,
        bc.total_sales,
        bc.total_deliveries,
        bc.successful_deliveries,
        bc.rating,
        bc.commission_rate,
        bc.created_at,
        bc.updated_at,
        COALESCE(u.id, au.id) as user_id,
        COALESCE(u.username, au.username) as username,
        COALESCE(u.email, au.email) as email,
        COALESCE(u.display_name, au.display_name) as display_name
      FROM business_centers bc
      LEFT JOIN identity_accounts ia ON bc.identity_id = ia.identity_id
      LEFT JOIN "user" u ON ia.user_id = u.id
      LEFT JOIN auth_users au ON au.identity_id = bc.identity_id
      WHERE bc.verification_status = $1
    `;

    const params = [status];

    if (centerType) {
      query += ` AND bc.center_type = $2`;
      params.push(centerType);
    }

    query += ` ORDER BY bc.created_at DESC`;

    const centers = await sql(query, params);

    // Get stats
    const [stats] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE verification_status = 'approved') as approved,
        COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE center_type = 'seller') as sellers,
        COUNT(*) FILTER (WHERE center_type = 'foodhub') as foodhubs,
        COUNT(*) FILTER (WHERE center_type = 'creator') as creators,
        COUNT(*) FILTER (WHERE center_type = 'deliverer') as deliverers
      FROM business_centers
    `;

    return Response.json({
      centers,
      stats: {
        pending: parseInt(stats.pending) || 0,
        approved: parseInt(stats.approved) || 0,
        rejected: parseInt(stats.rejected) || 0,
        sellers: parseInt(stats.sellers) || 0,
        foodhubs: parseInt(stats.foodhubs) || 0,
        creators: parseInt(stats.creators) || 0,
        deliverers: parseInt(stats.deliverers) || 0,
      },
    });
  } catch (error) {
    console.error('Admin business-centers GET error:', error);
    return Response.json({ error: 'Failed to fetch business centers' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await checkAdminAccess(session.user.id);
    if (!isAdmin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { centerId, action, notes } = body;

    if (!centerId || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approve', 'reject', 'suspend', 'activate'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'approve' || action === 'reject') {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      await sql`
        UPDATE business_centers
        SET 
          verification_status = ${newStatus},
          updated_at = NOW()
        WHERE id = ${centerId}
      `;
    } else if (action === 'suspend' || action === 'activate') {
      const newStatus = action === 'suspend' ? 'suspended' : 'active';
      await sql`
        UPDATE business_centers
        SET 
          status = ${newStatus},
          updated_at = NOW()
        WHERE id = ${centerId}
      `;
    }

    const actionMessages = {
      approve: 'Business center approved successfully',
      reject: 'Business center rejected successfully',
      suspend: 'Business center suspended successfully',
      activate: 'Business center activated successfully',
    };

    return Response.json({
      success: true,
      message: actionMessages[action],
    });
  } catch (error) {
    console.error('Admin business-centers POST error:', error);
    return Response.json({ error: 'Failed to update business center' }, { status: 500 });
  }
}
