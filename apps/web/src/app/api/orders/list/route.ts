// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

// Statuses that represent a finished (no longer actionable) order
const TERMINAL_STATUSES = `('delivered', 'completed', 'cancelled', 'refunded')`;

// Resolve a seller's business name through BOTH profile tables.
// business_centers links to the user via identity_accounts (the canonical
// mapping) — joining on auth_users.identity_id alone silently fails.
const BUSINESS_NAME_JOIN = `
  LEFT JOIN professional_profiles pp ON pp.user_id = o.seller_id
  LEFT JOIN LATERAL (
    SELECT bc.business_name
    FROM business_centers bc
    WHERE bc.identity_id IN (
      SELECT identity_id FROM identity_accounts WHERE user_id = o.seller_id
      UNION
      SELECT identity_id FROM auth_users WHERE id = o.seller_id AND identity_id IS NOT NULL
    )
    LIMIT 1
  ) bc ON true
`;

// GET /api/orders/list?role=buyer|seller&status=all|active|completed&limit=20&offset=0&orderId=uuid
export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    // If orderId is provided, fetch single order
    if (orderId) {
      const order = await sql(
        `SELECT o.*, 
          au.name as seller_name, 
          au.profile_image as seller_image,
          COALESCE(pp.business_name, bc.business_name, au.display_name, au.name) as seller_business_name,
          bu.name as buyer_name,
          bu.profile_image as buyer_image,
          bu.phone as buyer_phone
        FROM orders o
        LEFT JOIN auth_users au ON au.id::text = o.seller_id
        ${BUSINESS_NAME_JOIN}
        LEFT JOIN auth_users bu ON bu.id::text = o.buyer_id
        WHERE o.id = $1 AND (o.buyer_id = $2 OR o.seller_id = $2)`,
        [orderId, userId]
      );

      if (order.length === 0) {
        return Response.json({ error: 'Order not found' }, { status: 404 });
      }

      return Response.json({ order: order[0] });
    }

    const role = searchParams.get('role') || 'buyer'; // 'buyer' or 'seller'
    const statusFilter = searchParams.get('status') || 'all'; // 'all', 'active', 'completed'
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query based on role and status filter
    let queryStr = '';
    let queryParams = [];
    let paramIdx = 1;

    if (role === 'seller') {
      queryStr = `SELECT o.*, au.name as buyer_name, au.profile_image as buyer_image, au.phone as buyer_phone
        FROM orders o
        LEFT JOIN auth_users au ON au.id::text = o.buyer_id
        WHERE o.seller_id = $${paramIdx} AND o.status != 'pending_payment'`;
    } else {
      queryStr = `SELECT o.*, au.name as seller_name, au.profile_image as seller_image,
          COALESCE(pp.business_name, bc.business_name, au.display_name, au.name) as seller_business_name
        FROM orders o
        LEFT JOIN auth_users au ON au.id::text = o.seller_id
        ${BUSINESS_NAME_JOIN}
        WHERE o.buyer_id = $${paramIdx}`;
    }
    queryParams.push(userId);
    paramIdx++;

    // Status filter.
    // IMPORTANT: "active" must EXCLUDE finished orders rather than whitelist a
    // few statuses — the old whitelist silently hid paid orders sitting in
    // statuses like 'processing', 'shipped' or 'confirmed' from the seller.
    if (statusFilter === 'active') {
      if (role === 'seller') {
        // Sellers only see orders once payment is confirmed
        queryStr += ` AND o.status NOT IN ${TERMINAL_STATUSES}`;
      } else {
        queryStr += ` AND o.status NOT IN ${TERMINAL_STATUSES}`;
      }
    } else if (statusFilter === 'completed') {
      queryStr += ` AND o.status IN ${TERMINAL_STATUSES}`;
    }

    queryStr += ` ORDER BY o.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    queryParams.push(limit, offset);

    const orders = await sql(queryStr, queryParams);

    // Get total count for pagination
    let countStr = '';
    let countParams = [userId];

    if (role === 'seller') {
      countStr = `SELECT COUNT(*) as total FROM orders WHERE seller_id = $1 AND status != 'pending_payment'`;
    } else {
      countStr = `SELECT COUNT(*) as total FROM orders WHERE buyer_id = $1`;
    }

    if (statusFilter === 'active') {
      countStr += ` AND status NOT IN ${TERMINAL_STATUSES}`;
    } else if (statusFilter === 'completed') {
      countStr += ` AND status IN ${TERMINAL_STATUSES}`;
    }

    const countResult = await sql(countStr, countParams);
    const total = parseInt(countResult[0]?.total || 0);

    return Response.json({
      orders,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('List orders error:', error);
    return Response.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
