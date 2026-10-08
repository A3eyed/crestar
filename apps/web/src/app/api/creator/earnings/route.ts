// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { resolveUserId } from "@/app/api/utils/auth";

/**
 * GET /api/creator/earnings
 * Returns real-time creator affiliate earnings, commission breakdown, and withdrawal history.
 */
export async function GET(request) {
  try {
    const creatorId = await resolveUserId(request);
    if (!creatorId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // All orders attributed to this creator (paid/completed/delivered/in_transit/preparing)
    const attributedOrders = await sql(
      `SELECT 
        o.id,
        o.order_number,
        o.item_title,
        o.subtotal,
        o.creator_commission,
        o.origin_video_id,
        o.status,
        o.created_at,
        o.completed_at
       FROM orders o
       WHERE o.origin_creator_id = $1
         AND o.status NOT IN ('pending_payment', 'cancelled', 'refunded')
       ORDER BY o.created_at DESC`,
      [creatorId],
    );

    // Total lifetime earned (commissions from completed/delivered orders)
    const completedOrders = attributedOrders.filter((o) =>
      [
        "completed",
        "delivered",
        "in_transit",
        "paid",
        "preparing",
        "ready_for_pickup",
      ].includes(o.status),
    );

    const totalEarned = completedOrders.reduce(
      (sum, o) => sum + parseFloat(o.creator_commission || 0),
      0,
    );

    // Pending (orders that haven't completed escrow yet)
    const pendingCommission = attributedOrders
      .filter((o) =>
        ["paid", "preparing", "ready_for_pickup", "in_transit"].includes(
          o.status,
        ),
      )
      .reduce((sum, o) => sum + parseFloat(o.creator_commission || 0), 0);

    // Available (completed orders)
    const availableCommission = attributedOrders
      .filter((o) => ["completed", "delivered"].includes(o.status))
      .reduce((sum, o) => sum + parseFloat(o.creator_commission || 0), 0);

    // Per-video breakdown
    const videoMap = {};
    for (const order of attributedOrders) {
      const vid = order.origin_video_id || "direct";
      if (!videoMap[vid]) {
        videoMap[vid] = {
          videoId: vid,
          salesCount: 0,
          totalSalesValue: 0,
          totalCommission: 0,
        };
      }
      videoMap[vid].salesCount += 1;
      videoMap[vid].totalSalesValue += parseFloat(order.subtotal || 0);
      videoMap[vid].totalCommission += parseFloat(
        order.creator_commission || 0,
      );
    }

    const videoBreakdown = Object.values(videoMap).sort(
      (a, b) => b.totalCommission - a.totalCommission,
    );

    // Wallet transactions (withdrawal history) from crestar_wallet_transactions
    const userIdentity = await sql(
      `SELECT identity_id FROM auth_users WHERE id = $1`,
      [creatorId],
    );

    let withdrawalHistory = [];
    if (userIdentity.length > 0 && userIdentity[0].identity_id) {
      const walletAccount = await sql(
        `SELECT id FROM wallet_accounts WHERE identity_id = $1`,
        [userIdentity[0].identity_id],
      );
      if (walletAccount.length > 0) {
        withdrawalHistory = await sql(
          `SELECT 
            id,
            transaction_type,
            amount,
            currency,
            actual_balance_before,
            actual_balance_after,
            description,
            status,
            created_at,
            completed_at
           FROM crestar_wallet_transactions
           WHERE wallet_account_id = $1
             AND transaction_type IN ('withdrawal', 'creator_commission', 'p2p_transfer_out')
           ORDER BY created_at DESC
           LIMIT 50`,
          [walletAccount[0].id],
        );

        // Fetch current balance
        const balance = await sql(
          `SELECT actual_balance, pending_balance FROM wallet_accounts WHERE id = $1`,
          [walletAccount[0].id],
        );

        return Response.json({
          success: true,
          earnings: {
            totalEarned,
            availableCommission,
            pendingCommission,
            currentBalance: parseFloat(balance[0]?.actual_balance || 0),
            pendingBalance: parseFloat(balance[0]?.pending_balance || 0),
          },
          attributedOrders: attributedOrders.slice(0, 20).map((o) => ({
            id: o.id,
            orderNumber: o.order_number,
            itemTitle: o.item_title,
            subtotal: parseFloat(o.subtotal),
            commission: parseFloat(o.creator_commission || 0),
            status: o.status,
            videoId: o.origin_video_id,
            createdAt: o.created_at,
          })),
          videoBreakdown,
          withdrawalHistory: withdrawalHistory.map((t) => ({
            id: t.id,
            type: t.transaction_type,
            amount: parseFloat(t.amount),
            currency: t.currency,
            description: t.description,
            status: t.status,
            createdAt: t.created_at,
            completedAt: t.completed_at,
          })),
        });
      }
    }

    return Response.json({
      success: true,
      earnings: {
        totalEarned,
        availableCommission,
        pendingCommission,
        currentBalance: 0,
        pendingBalance: 0,
      },
      attributedOrders: attributedOrders.slice(0, 20).map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        itemTitle: o.item_title,
        subtotal: parseFloat(o.subtotal),
        commission: parseFloat(o.creator_commission || 0),
        status: o.status,
        videoId: o.origin_video_id,
        createdAt: o.created_at,
      })),
      videoBreakdown,
      withdrawalHistory: [],
    });
  } catch (error) {
    console.error("Creator earnings error:", error);
    return Response.json(
      { error: "Failed to fetch earnings" },
      { status: 500 },
    );
  }
}
