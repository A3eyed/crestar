// @ts-nocheck
import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // V2 uses text IDs — do NOT parseInt

    // Check admin privileges via role
    const [admin] = await sql`
      SELECT id, role FROM auth_users
      WHERE id = ${userId} AND role IN ('admin', 'owner', 'moderator')
    `;

    if (!admin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    // Fetch deliverers based on verification status
    const deliverers = await sql`
      SELECT 
        dp.id,
        dp.user_id,
        dp.full_name,
        dp.phone_number,
        dp.vehicle_type,
        dp.ghana_card_photo,
        dp.vehicle_photo,
        dp.verification_status,
        dp.is_available,
        dp.operating_regions,
        dp.intercity_routes,
        dp.total_deliveries,
        dp.successful_deliveries,
        dp.rating,
        dp.created_at,
        dp.updated_at,
        u.username,
        u.email,
        u.display_name
      FROM deliverer_profiles dp
      JOIN auth_users u ON dp.user_id::text = u.id::text
      WHERE dp.verification_status = ${status}
      ORDER BY dp.created_at DESC
    `;

    // Get stats
    const [stats] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE verification_status = 'approved') as approved,
        COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE verification_status = 'suspended') as suspended
      FROM deliverer_profiles
    `;

    return Response.json({
      deliverers,
      stats: {
        pending: parseInt(stats.pending) || 0,
        approved: parseInt(stats.approved) || 0,
        rejected: parseInt(stats.rejected) || 0,
        suspended: parseInt(stats.suspended) || 0,
      },
    });
  } catch (error) {
    console.error('Admin deliverers GET error:', error);
    return Response.json({ error: 'Failed to fetch deliverers' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // ✅ FIXED: V2 uses text IDs

    // Check admin privileges via role (auth_users is the source of truth,
    // matching the GET handler and all other admin routes)
    const [admin] = await sql`
      SELECT id, role FROM auth_users
      WHERE id = ${userId} AND role IN ('admin', 'owner', 'moderator')
    `;

    if (!admin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { delivererId, action, notes } = body;

    if (!delivererId || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approve', 'reject', 'suspend'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const newStatus =
      action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'suspended';

    // Update deliverer verification status
    await sql`
      UPDATE deliverer_profiles
      SET 
        verification_status = ${newStatus},
        updated_at = NOW()
      WHERE id = ${delivererId}
    `;

    // If approving, unlock deliverer features
    if (action === 'approve') {
      await sql`
        UPDATE deliverer_profiles
        SET 
          features_unlocked = jsonb_build_object(
            'view_earnings', true,
            'set_availability', true,
            'accept_deliveries', true,
            'performance_stats', true
          ),
          is_available = true
        WHERE id = ${delivererId}
      `;
    }

    const actionMessages = {
      approve: 'Deliverer approved successfully',
      reject: 'Deliverer rejected successfully',
      suspend: 'Deliverer suspended successfully',
    };

    return Response.json({
      success: true,
      message: actionMessages[action],
    });
  } catch (error) {
    console.error('Admin deliverers POST error:', error);
    return Response.json({ error: 'Failed to update deliverer' }, { status: 500 });
  }
}
