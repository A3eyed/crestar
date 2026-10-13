// @ts-nocheck
import sql from '@/app/api/utils/sql';

export async function GET(request, { params }) {
  try {
    const { id: raw } = await params;
    // Support /@handle, /handle, and raw user ids
    const idOrUsername = String(raw || '')
      .trim()
      .replace(/^@+/, '');

    const resolved = await sql`
      SELECT id FROM auth_users
      WHERE id = ${idOrUsername} OR lower(username) = lower(${idOrUsername})
      LIMIT 1
    `;
    const userId = resolved[0]?.id ? String(resolved[0].id) : String(idOrUsername);

    const centerRows = await sql`
      SELECT bc.business_name, bc.center_type, bc.verification_status
      FROM business_centers bc
      WHERE bc.identity_id IN (
        SELECT identity_id FROM identity_accounts WHERE user_id = ${userId}
        UNION
        SELECT identity_id FROM auth_users WHERE id = ${userId} AND identity_id IS NOT NULL
      )
      LIMIT 1
    `;
    const center = centerRows[0] || null;

    const sellerRows = await sql`
      SELECT
        pp.*,
        u.username,
        u.email,
        u.display_name,
        u.name,
        u.profile_image,
        u.bio,
        u.is_verified
      FROM professional_profiles pp
      JOIN auth_users u ON pp.user_id = u.id::text
      WHERE pp.user_id = ${userId}
    `;

    let profile = sellerRows[0] || null;
    let isSeller = !!profile || !!center;

    if (!profile) {
      const userRows = await sql`
        SELECT
          id, username, email, display_name, name, profile_image, bio, is_verified
        FROM auth_users
        WHERE id = ${userId}
      `;

      if (!userRows[0]) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const u = userRows[0];
      profile = {
        user_id: u.id.toString(),
        username: u.username || (u.email ? u.email.split('@')[0] : null),
        display_name: u.display_name || u.name,
        name: u.name,
        profile_image: u.profile_image,
        bio: u.bio,
        is_verified: u.is_verified,
        seller_type: center?.center_type || null,
        business_name: center?.business_name || null,
        verification_status: center?.verification_status || null,
      };
    }

    const businessName = profile.business_name || center?.business_name || null;
    const handle =
      profile.username ||
      (profile.email ? String(profile.email).split('@')[0] : null) ||
      'user';

    const products = await sql`
      SELECT * FROM products
      WHERE seller_id = ${userId}
      AND status = 'active'
      ORDER BY created_at DESC
    `;

    let services = [];
    try {
      services = await sql`
        SELECT * FROM services
        WHERE seller_id = ${userId}
        AND status = 'active'
        ORDER BY created_at DESC
      `;
    } catch {
      services = [];
    }

    const productCount = products.length + services.length;

    const statsRows = await sql`
      SELECT
        COUNT(DISTINCT id) as total_orders,
        AVG(CASE WHEN status = 'completed' THEN 5 ELSE NULL END) as avg_rating
      FROM orders
      WHERE seller_id = ${userId}
    `;
    const stats = statsRows[0] || {};

    return Response.json({
      profile: {
        ...profile,
        username: handle,
        // TikTok-style: display name for UI, @username for handle
        display_name: profile.display_name || profile.name || handle,
        business_name: businessName,
        display_business_name: businessName || profile.display_name || handle,
        is_seller: isSeller,
        profile_url: `/${handle}`,
        stats: {
          products: productCount,
          rating: stats?.avg_rating || (isSeller ? 4.8 : 0),
          sales: stats?.total_orders || 0,
          followers: 0,
        },
      },
      products,
      services,
    });
  } catch (error) {
    console.error('Get user/seller error:', error);
    return Response.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}
