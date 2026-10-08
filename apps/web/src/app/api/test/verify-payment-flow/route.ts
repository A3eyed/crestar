// @ts-nocheck
import sql from '@/app/api/utils/sql';

/**
 * GET /api/test/verify-payment-flow
 *
 * Test endpoint to verify the payment flow is working correctly
 * Shows recent orders, their status, and seller visibility
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');

    if (orderId) {
      // Test specific order
      const orders = await sql(
        `SELECT o.*, 
                au.username as seller_username,
                au2.username as buyer_username
         FROM orders o
         LEFT JOIN auth_users au ON au.id::text = o.seller_id
         LEFT JOIN auth_users au2 ON au2.id::text = o.buyer_id
         WHERE o.id = $1`,
        [orderId]
      );

      if (orders.length === 0) {
        return Response.json({ error: 'Order not found' }, { status: 404 });
      }

      const order = orders[0];

      // Check if order appears in seller dashboard query
      const sellerView = await sql(
        `SELECT o.id, o.order_number, o.status, o.payment_status, o.total_amount
         FROM orders o
         WHERE o.seller_id = $1 AND o.status != 'pending_payment'
         ORDER BY o.created_at DESC`,
        [order.seller_id]
      );

      const appearsInSellerDashboard = sellerView.some((o) => o.id === order.id);

      // Check notifications
      const notifications = await sql(
        `SELECT * FROM notifications
         WHERE user_id = $1 AND type = 'new_order' 
               AND data->>'order_id' = $2`,
        [order.seller_id, order.id]
      );

      // Check wallet entries
      const walletEntries = await sql(
        `SELECT * FROM crestar_wallet_transactions
         WHERE related_order_id = $1
         ORDER BY created_at DESC`,
        [order.id]
      );

      return Response.json({
        success: true,
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          payment_status: order.payment_status,
          total_amount: order.total_amount,
          seller_payout: order.seller_payout,
          seller_id: order.seller_id,
          seller_username: order.seller_username,
          buyer_id: order.buyer_id,
          buyer_username: order.buyer_username,
          payment_reference: order.payment_reference,
          metadata: order.metadata,
          created_at: order.created_at,
        },
        visibility: {
          appearsInSellerDashboard,
          sellerDashboardFilter: "status != 'pending_payment'",
          currentStatus: order.status,
          wouldBeVisible: order.status !== 'pending_payment',
        },
        notifications: {
          count: notifications.length,
          latest: notifications[0] || null,
        },
        walletEntries: {
          count: walletEntries.length,
          entries: walletEntries,
        },
      });
    }

    // Show recent orders summary
    const recentOrders = await sql(
      `SELECT o.id, o.order_number, o.status, o.payment_status, 
              o.total_amount, o.seller_id, o.buyer_id, o.created_at,
              au.username as seller_username
       FROM orders o
       LEFT JOIN auth_users au ON au.id::text = o.seller_id
       ORDER BY o.created_at DESC
       LIMIT 10`
    );

    const ordersByStatus = {};
    for (const order of recentOrders) {
      if (!ordersByStatus[order.status]) {
        ordersByStatus[order.status] = [];
      }
      ordersByStatus[order.status].push({
        id: order.id,
        order_number: order.order_number,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        seller_username: order.seller_username,
        created_at: order.created_at,
      });
    }

    // Check for recent payments that might have failed to create orders
    const recentPayments = await sql(
      `SELECT DISTINCT payment_reference, COUNT(*) as order_count
       FROM orders 
       WHERE payment_reference IS NOT NULL 
             AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY payment_reference
       ORDER BY MAX(created_at) DESC
       LIMIT 10`
    );

    return Response.json({
      success: true,
      summary: {
        totalRecent: recentOrders.length,
        byStatus: Object.keys(ordersByStatus).map((status) => ({
          status,
          count: ordersByStatus[status].length,
        })),
      },
      recentOrders: ordersByStatus,
      recentPayments,
      note: 'Use ?orderId=<uuid> to check specific order visibility',
    });
  } catch (error) {
    console.error('Verify payment flow error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
