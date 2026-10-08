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

    // Fetch sellers based on verification status
    const sellers = await sql`
      SELECT 
        pp.id,
        pp.user_id,
        pp.seller_type,
        pp.business_name,
        pp.full_name,
        pp.momo_number,
        pp.ghana_card_photo,
        pp.business_permit_photo,
        pp.portfolio_media,
        pp.verification_status,
        pp.is_registered_business,
        pp.country,
        pp.region,
        pp.city,
        pp.delivery_method,
        pp.created_at,
        pp.updated_at,
        u.username,
        u.email,
        u.display_name
      FROM professional_profiles pp
      JOIN auth_users u ON pp.user_id::text = u.id::text
      WHERE pp.verification_status = ${status}
      ORDER BY pp.created_at DESC
    `;

    // Get stats
    const [stats] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE verification_status = 'approved') as approved,
        COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected
      FROM professional_profiles
    `;

    return Response.json({
      sellers,
      stats: {
        pending: parseInt(stats.pending) || 0,
        approved: parseInt(stats.approved) || 0,
        rejected: parseInt(stats.rejected) || 0,
      },
    });
  } catch (error) {
    console.error('Admin sellers GET error:', error);
    return Response.json({ error: 'Failed to fetch sellers' }, { status: 500 });
  }
}

export async function POST(request) {
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

    const body = await request.json();
    const { sellerId, action, notes } = body;

    if (!sellerId || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update seller verification status
    await sql`
      UPDATE professional_profiles
      SET 
        verification_status = ${newStatus},
        updated_at = NOW()
      WHERE id = ${sellerId}
    `;

    // If approving, unlock seller features
    if (action === 'approve') {
      await sql`
        UPDATE professional_profiles
        SET features_unlocked = jsonb_build_object(
          'bulk_upload', true,
          'view_analytics', true,
          'create_listings', true,
          'priority_support', true,
          'custom_storefront', true
        )
        WHERE id = ${sellerId}
      `;
    }

    return Response.json({
      success: true,
      message: `Seller ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Admin sellers POST error:', error);
    return Response.json({ error: 'Failed to update seller' }, { status: 500 });
  }
}
