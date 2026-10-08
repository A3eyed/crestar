// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';

// GET - Fetch deliverer's assignments
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const userId = session.user.id.toString();

    // Get active assignments — fee amounts shown to the deliverer are NET of
    // Crestar's flat 3% platform fee (orders.deliverer_fee is already net;
    // the raw assignment fee is gross so we net it here).
    const activeAssignments = await sql`
      SELECT 
        da.*,
        COALESCE(NULLIF(o.deliverer_fee, 0), ROUND(COALESCE(da.delivery_fee, 0) * 0.97, 2)) AS net_delivery_fee,
        o.order_number,
        o.item_title,
        o.total_amount,
        o.buyer_id,
        o.seller_id,
        o.delivery_pin
      FROM delivery_assignments da
      JOIN orders o ON da.order_id = o.id
      WHERE da.deliverer_user_id = ${userId}
      AND da.status IN ('accepted', 'picked_up', 'in_transit')
      ORDER BY da.created_at DESC
    `;

    // Get available assignments (pending, near deliverer)
    const availableAssignments = await sql`
      SELECT 
        da.*,
        COALESCE(NULLIF(o.deliverer_fee, 0), ROUND(COALESCE(da.delivery_fee, 0) * 0.97, 2)) AS net_delivery_fee,
        o.order_number,
        o.item_title,
        o.total_amount
      FROM delivery_assignments da
      JOIN orders o ON da.order_id = o.id
      WHERE da.status = 'pending'
      AND da.deliverer_user_id IS NULL
      ORDER BY da.created_at DESC
      LIMIT 10
    `;

    // Get completed deliveries (last 7 days)
    const completedDeliveries = await sql`
      SELECT 
        da.*,
        COALESCE(NULLIF(o.deliverer_fee, 0), ROUND(COALESCE(da.delivery_fee, 0) * 0.97, 2)) AS net_delivery_fee,
        o.order_number,
        o.item_title
      FROM delivery_assignments da
      JOIN orders o ON da.order_id = o.id
      WHERE da.deliverer_user_id = ${userId}
      AND da.status = 'delivered'
      AND da.delivered_at >= NOW() - INTERVAL '7 days'
      ORDER BY da.delivered_at DESC
    `;

    // Deliverer earnings — single source of truth: delivered assignments,
    // always NET of the 3% platform fee.
    const [earnings] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN DATE(t.delivered_at) = CURRENT_DATE THEN t.net_fee ELSE 0 END), 0) AS today,
        COALESCE(SUM(CASE WHEN t.delivered_at >= DATE_TRUNC('week', CURRENT_DATE) THEN t.net_fee ELSE 0 END), 0) AS week,
        COALESCE(SUM(t.net_fee), 0) AS total
      FROM (
        SELECT
          da.delivered_at,
          COALESCE(NULLIF(o.deliverer_fee, 0), ROUND(COALESCE(da.delivery_fee, 0) * 0.97, 2)) AS net_fee
        FROM delivery_assignments da
        JOIN orders o ON da.order_id = o.id
        WHERE da.deliverer_user_id = ${userId}
          AND da.status = 'delivered'
      ) t
    `;

    return Response.json({
      activeAssignments,
      availableAssignments,
      completedDeliveries,
      earnings: {
        today: parseFloat(earnings.today),
        week: parseFloat(earnings.week),
        total: parseFloat(earnings.total),
      },
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    return Response.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

// POST - Accept assignment
export async function POST(request) {
  try {
    const body = await request.json();
    const { assignmentId } = body;

    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const userId = session.user.id.toString();

    // Verify deliverer is approved
    const [deliverer] = await sql`
      SELECT * FROM deliverer_profiles 
      WHERE user_id = ${userId} 
      AND verification_status = 'approved'
      AND is_available = true
    `;

    if (!deliverer) {
      return Response.json(
        { error: 'You must be an approved and available deliverer' },
        { status: 403 }
      );
    }

    // Accept the assignment
    const [assignment] = await sql`
      UPDATE delivery_assignments
      SET 
        deliverer_user_id = ${userId},
        status = 'accepted',
        accepted_at = NOW()
      WHERE id = ${assignmentId}
      AND status = 'pending'
      RETURNING *
    `;

    if (!assignment) {
      return Response.json({ error: 'Assignment not available' }, { status: 404 });
    }

    // Update order status
    await sql`
      UPDATE orders
      SET 
        deliverer_id = ${userId},
        status = 'in_transit'
      WHERE id = ${assignment.order_id}
    `;

    return Response.json({
      success: true,
      assignment,
    });
  } catch (error) {
    console.error('Accept assignment error:', error);
    return Response.json({ error: 'Failed to accept assignment' }, { status: 500 });
  }
}
