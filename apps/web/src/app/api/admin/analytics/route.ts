// @ts-nocheck
import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';

/**
 * GET /api/admin/analytics
 * Real platform analytics for the admin dashboard (no mock / Anything AI data).
 * Queries live Neon tables only.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [admin] = await sql`
      SELECT id, role FROM auth_users
      WHERE id = ${session.user.id}
        AND (role IN ('admin', 'owner', 'moderator') OR is_admin = true)
    `;
    if (!admin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Run queries individually so one missing table doesn't kill the whole response
    let revenueRows = [];
    let userGrowthRows = [];
    let sellerGrowthRows = [];
    let delivererGrowthRows = [];
    let categoryRows = [];
    let typeRows = [];
    let totals = {
      users: 0,
      paid_orders: 0,
      gmv: 0,
      platform_fees: 0,
      videos: 0,
      products: 0,
    };

    try {
      revenueRows = await sql`
        SELECT
          to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
          COALESCE(SUM(total_amount), 0) as gmv,
          COALESCE(SUM(platform_fee), 0) as fees,
          COUNT(*) as orders
        FROM orders
        WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
          AND payment_status = 'paid'
        GROUP BY 1
        ORDER BY 1
      `;
    } catch (e) {
      console.error('analytics revenue:', e?.message || e);
    }

    try {
      userGrowthRows = await sql`
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') as month, COUNT(*) as total
        FROM auth_users
        WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
        GROUP BY 1 ORDER BY 1
      `;
    } catch (e) {
      console.error('analytics users:', e?.message || e);
    }

    try {
      sellerGrowthRows = await sql`
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') as month, COUNT(*) as total
        FROM professional_profiles
        WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
        GROUP BY 1 ORDER BY 1
      `;
    } catch (e) {
      console.error('analytics sellers:', e?.message || e);
    }

    try {
      delivererGrowthRows = await sql`
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') as month, COUNT(*) as total
        FROM deliverer_profiles
        WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
        GROUP BY 1 ORDER BY 1
      `;
    } catch (e) {
      console.error('analytics deliverers:', e?.message || e);
    }

    try {
      categoryRows = await sql`
        SELECT COALESCE(NULLIF(p.category, ''), 'Other') as name,
               COALESCE(SUM(o.total_amount), 0) as value
        FROM orders o
        LEFT JOIN products p ON o.item_id::text = p.id::text AND o.item_type = 'product'
        WHERE o.payment_status = 'paid'
        GROUP BY 1
        ORDER BY value DESC
        LIMIT 8
      `;
    } catch (e) {
      console.error('analytics categories:', e?.message || e);
    }

    try {
      typeRows = await sql`
        SELECT COALESCE(NULLIF(item_type, ''), 'other') as name,
               COALESCE(SUM(total_amount), 0) as value
        FROM orders
        WHERE payment_status = 'paid'
        GROUP BY 1
        ORDER BY value DESC
      `;
    } catch (e) {
      console.error('analytics types:', e?.message || e);
    }

    try {
      const [t] = await sql`
        SELECT
          (SELECT COUNT(*) FROM auth_users) as users,
          (SELECT COUNT(*) FROM orders WHERE payment_status = 'paid') as paid_orders,
          (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'paid') as gmv,
          (SELECT COALESCE(SUM(platform_fee), 0) FROM orders WHERE payment_status = 'paid') as platform_fees,
          (SELECT COUNT(*) FROM videos WHERE status = 'active' OR status IS NULL) as videos,
          (SELECT COUNT(*) FROM products WHERE status = 'active' OR status IS NULL) as products
      `;
      if (t) totals = t;
    } catch (e) {
      console.error('analytics totals:', e?.message || e);
    }

    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: d.toLocaleString('en-US', { month: 'short' }) });
    }

    const byMonth = (rows, field = 'total') => {
      const map = {};
      for (const r of rows || []) map[r.month] = parseFloat(r[field]) || 0;
      return map;
    };

    const revGmv = byMonth(revenueRows, 'gmv');
    const revFees = byMonth(revenueRows, 'fees');
    const revOrders = byMonth(revenueRows, 'orders');
    const growthUsers = byMonth(userGrowthRows);
    const growthSellers = byMonth(sellerGrowthRows);
    const growthDeliverers = byMonth(delivererGrowthRows);

    const platformRevenue = months.map((m) => ({
      month: m.label,
      gmv: revGmv[m.key] || 0,
      fees: revFees[m.key] || 0,
    }));

    const orderVolume = months.map((m) => ({
      month: m.label,
      orders: revOrders[m.key] || 0,
    }));

    const userGrowth = months.map((m) => ({
      month: m.label,
      users: growthUsers[m.key] || 0,
      sellers: growthSellers[m.key] || 0,
      deliverers: growthDeliverers[m.key] || 0,
    }));

    const categoryDistribution = (categoryRows || []).map((r) => ({
      name: r.name || 'Other',
      value: parseFloat(r.value) || 0,
    }));

    const revenueByType = (typeRows || []).map((r) => ({
      name: r.name || 'other',
      value: parseFloat(r.value) || 0,
    }));

    return Response.json({
      platformRevenue,
      orderVolume,
      userGrowth,
      categoryDistribution,
      revenueByType,
      totals: {
        users: parseInt(totals.users) || 0,
        paidOrders: parseInt(totals.paid_orders) || 0,
        gmv: parseFloat(totals.gmv) || 0,
        platformFees: parseFloat(totals.platform_fees) || 0,
        videos: parseInt(totals.videos) || 0,
        products: parseInt(totals.products) || 0,
      },
    });
  } catch (error) {
    console.error('Admin analytics GET error:', error);
    return Response.json(
      { error: 'Failed to load analytics', details: String(error?.message || error) },
      { status: 500 }
    );
  }
}
