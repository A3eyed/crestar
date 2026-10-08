// @ts-nocheck
/**
 * API Endpoint for Manual Notification Sending
 * Allows triggering various email notifications on-demand
 * RESTRICTED: Only authenticated admin users can use this endpoint
 */

import {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendWalletNotification,
  sendSellerApplicationStatus,
  sendLiveSessionNotification,
  sendDeliveryAssignment,
  sendAdminAlert,
  sendWelcomeEmail,
} from "@/app/api/utils/notification-service";
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

/**
 * POST /api/notifications/send
 *
 * Body shape:
 * {
 *   type: 'order_confirmation' | 'order_status' | 'wallet' | 'seller_status' |
 *         'live_session' | 'delivery_assignment' | 'admin_alert' | 'welcome',
 *   data: { ... type-specific data }
 * }
 */
export async function POST(request) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require admin role
    const [user] = await sql`
      SELECT role, is_admin FROM auth_users WHERE id = ${session.user.id}
    `;
    if (
      !user ||
      (!user.is_admin && user.role !== "admin" && user.role !== "owner")
    ) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return Response.json({ error: "Missing type or data" }, { status: 400 });
    }

    let result;

    switch (type) {
      case "order_confirmation":
        if (!data.orderId) {
          return Response.json(
            { error: "orderId is required" },
            { status: 400 },
          );
        }
        result = await sendOrderConfirmation(data.orderId);
        break;

      case "order_status":
        if (!data.orderId || !data.status) {
          return Response.json(
            { error: "orderId and status are required" },
            { status: 400 },
          );
        }
        result = await sendOrderStatusUpdate(data.orderId, data.status);
        break;

      case "wallet":
        if (
          !data.userId ||
          !data.transactionType ||
          data.amount === undefined ||
          data.balance === undefined
        ) {
          return Response.json(
            {
              error:
                "userId, transactionType, amount, and balance are required",
            },
            { status: 400 },
          );
        }
        result = await sendWalletNotification(data);
        break;

      case "seller_status":
        if (!data.userId || !data.status || !data.businessName) {
          return Response.json(
            { error: "userId, status, and businessName are required" },
            { status: 400 },
          );
        }
        result = await sendSellerApplicationStatus(data);
        break;

      case "live_session":
        if (!data.sellerId || !data.sessionId) {
          return Response.json(
            { error: "sellerId and sessionId are required" },
            { status: 400 },
          );
        }
        result = await sendLiveSessionNotification(data);
        break;

      case "delivery_assignment":
        if (!data.delivererId || !data.orderId || data.earnings === undefined) {
          return Response.json(
            { error: "delivererId, orderId, and earnings are required" },
            { status: 400 },
          );
        }
        result = await sendDeliveryAssignment(data);
        break;

      case "admin_alert":
        if (!data.alertType || !data.title || !data.message) {
          return Response.json(
            { error: "alertType, title, and message are required" },
            { status: 400 },
          );
        }
        result = await sendAdminAlert(data);
        break;

      case "welcome":
        if (!data.userId) {
          return Response.json(
            { error: "userId is required" },
            { status: 400 },
          );
        }
        result = await sendWelcomeEmail(data.userId);
        break;

      default:
        return Response.json(
          { error: `Unknown notification type: ${type}` },
          { status: 400 },
        );
    }

    if (!result.success) {
      return Response.json(
        {
          error: "Failed to send notification",
          reason: result.reason,
          detail: result.error,
        },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      type,
      sent: result.sent || 1,
    });
  } catch (error) {
    console.error("Send notification error:", error);
    return Response.json(
      { error: "Failed to send notification", detail: error.message },
      { status: 500 },
    );
  }
}
