// @ts-nocheck
/**
 * Notification Service for Crestar
 * Handles email + Expo push notifications
 */
import { sendEmail } from "./send-email";
import {
  orderConfirmationEmail,
  orderStatusUpdateEmail,
  walletTransactionEmail,
  sellerApplicationEmail,
  liveSessionNotificationEmail,
  deliveryAssignmentEmail,
  adminAlertEmail,
} from "./email-templates";
import sql from "./sql";

function escapeHtml(str) {
  if (!str) return str;
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getUserInfo(userId) {
  const [user] = await sql`
    SELECT email, name, display_name 
    FROM auth_users 
    WHERE id = ${userId}
  `;
  return {
    email: user?.email,
    name: escapeHtml(user?.display_name || user?.name || "there"),
  };
}

/** Load Expo push tokens for one or more users */
async function getPushTokens(userIds) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (!ids.length) return [];
  try {
    const rows = await sql`
      SELECT token FROM user_push_tokens
      WHERE user_id = ANY(${ids}::text[])
        AND token IS NOT NULL
        AND token <> ''
    `;
    return rows.map((r) => r.token).filter(Boolean);
  } catch (e) {
    // Table may not exist yet
    console.warn("[notification] push token lookup failed:", e.message);
    return [];
  }
}

/** Send Expo push notifications */
async function sendExpoPush(tokens, { title, body, data = {} }) {
  if (!tokens?.length) return { success: false, reason: "no_tokens" };

  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title,
    body,
    data,
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    const result = await res.json();
    console.log("[notification] Expo push result:", JSON.stringify(result));
    return { success: true, result };
  } catch (error) {
    console.error("[notification] Expo push error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Order Confirmation (email + push to buyer)
 */
export async function sendOrderConfirmation(orderId) {
  try {
    const [order] = await sql`
      SELECT 
        o.*,
        u.email as buyer_email,
        u.display_name as buyer_name,
        u.name as buyer_fallback_name
      FROM orders o
      LEFT JOIN auth_users u ON o.buyer_id = u.id
      WHERE o.id = ${orderId}
    `;
    if (!order) {
      return { success: false, reason: "order_not_found" };
    }

    const baseUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || "";
    const buyerName = order.buyer_name || order.buyer_fallback_name || "there";

    // Email
    if (order.buyer_email) {
      const { html, text } = orderConfirmationEmail({
        customerName: buyerName,
        orderNumber: order.order_number,
        items: [
          {
            title: order.item_title,
            quantity: order.quantity,
            price: parseFloat(order.unit_price),
          },
        ],
        total: parseFloat(order.total_amount),
        deliveryAddress: order.delivery_address?.full || null,
        orderUrl: `${baseUrl}/order-details?id=${orderId}`,
      });
      await sendEmail({
        to: order.buyer_email,
        subject: `Order Confirmed - ${order.order_number}`,
        html,
        text,
      });
    }

    // Push
    const tokens = await getPushTokens(order.buyer_id);
    await sendExpoPush(tokens, {
      title: "Order Confirmed",
      body: `Order ${order.order_number} is confirmed. Total GH₵${parseFloat(
        order.total_amount
      ).toFixed(2)}`,
      data: { type: "order_confirmation", orderId: String(orderId) },
    });

    // Also notify seller
    if (order.seller_id) {
      const sellerTokens = await getPushTokens(order.seller_id);
      await sendExpoPush(sellerTokens, {
        title: "New Order",
        body: `You have a new order ${order.order_number}`,
        data: { type: "new_order", orderId: String(orderId) },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[notification] Order confirmation error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Order Status Update (email + push)
 */
export async function sendOrderStatusUpdate(orderId, newStatus) {
  try {
    const [order] = await sql`
      SELECT 
        o.*,
        u.email as buyer_email,
        u.display_name as buyer_name,
        u.name as buyer_fallback_name
      FROM orders o
      LEFT JOIN auth_users u ON o.buyer_id = u.id
      WHERE o.id = ${orderId}
    `;
    if (!order) return { success: false, reason: "order_not_found" };

    const statusMessages = {
      paid: "Your payment has been confirmed! The seller will process your order shortly.",
      preparing: "The seller is preparing your order.",
      ready_for_pickup: "Your order is ready for pickup.",
      in_transit: "Your order is on the way!",
      delivered: "Your order has been delivered!",
      completed: "Order complete. Thank you for shopping on Crestar!",
      cancelled: "Your order has been cancelled.",
    };

    const baseUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || "";
    const msg =
      statusMessages[newStatus] || "Your order status has been updated.";

    if (order.buyer_email) {
      const { html, text } = orderStatusUpdateEmail({
        customerName: order.buyer_name || order.buyer_fallback_name || "there",
        orderNumber: order.order_number,
        status: newStatus,
        statusMessage: msg,
        trackingUrl: `${baseUrl}/order-details?id=${orderId}`,
      });
      await sendEmail({
        to: order.buyer_email,
        subject: `Order Update - ${order.order_number}`,
        html,
        text,
      });
    }

    const tokens = await getPushTokens(order.buyer_id);
    await sendExpoPush(tokens, {
      title: "Order Update",
      body: `${order.order_number}: ${msg}`,
      data: {
        type: "order_status",
        orderId: String(orderId),
        status: newStatus,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[notification] Order status update error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Wallet notification
 */
export async function sendWalletNotification({
  userId,
  transactionType,
  amount,
  balance,
  reference,
  description,
}) {
  try {
    const userInfo = await getUserInfo(userId);
    if (userInfo.email) {
      const { html, text } = walletTransactionEmail({
        userName: userInfo.name,
        transactionType,
        amount: parseFloat(amount),
        balance: parseFloat(balance),
        reference,
        description,
      });
      const subjectMap = {
        deposit: "Wallet Deposit Confirmed",
        withdrawal: "Withdrawal Processed",
        earning: "You Earned Money!",
        refund: "Refund Processed",
        transfer_in: "Money Received",
        transfer_out: "Transfer Sent",
      };
      await sendEmail({
        to: userInfo.email,
        subject: subjectMap[transactionType] || "Wallet Activity",
        html,
        text,
      });
    }

    const tokens = await getPushTokens(userId);
    await sendExpoPush(tokens, {
      title: "Wallet Update",
      body:
        description ||
        `GH₵${parseFloat(amount).toFixed(2)} — ${transactionType}`,
      data: { type: "wallet", transactionType },
    });

    return { success: true };
  } catch (error) {
    console.error("[notification] Wallet notification error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Seller application status
 */
export async function sendSellerApplicationStatus({
  userId,
  status,
  businessName,
  rejectionReason,
}) {
  try {
    const userInfo = await getUserInfo(userId);
    const baseUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || "";

    if (userInfo.email) {
      const { html, text } = sellerApplicationEmail({
        userName: userInfo.name,
        status,
        businessName,
        rejectionReason,
        dashboardUrl:
          status === "approved" ? `${baseUrl}/seller/dashboard` : null,
      });
      await sendEmail({
        to: userInfo.email,
        subject:
          status === "approved"
            ? "🎉 Seller Application Approved!"
            : "Seller Application Update",
        html,
        text,
      });
    }

    const tokens = await getPushTokens(userId);
    await sendExpoPush(tokens, {
      title:
        status === "approved"
          ? "Seller Application Approved"
          : "Seller Application Update",
      body:
        status === "approved"
          ? "You can now list products on Crestar."
          : rejectionReason || "Your application status was updated.",
      data: { type: "seller_status", status },
    });

    return { success: true };
  } catch (error) {
    console.error("[notification] Seller application error:", error);
    return { success: false, error: error.message };
  }
}

export async function sendLiveSessionNotification({
  sellerId,
  sessionId,
  sessionTitle,
}) {
  console.warn(
    "[notification] Live session notifications skipped: user_follows not implemented"
  );
  return { success: true, sent: 0 };
}

export async function sendDeliveryAssignment({
  delivererId,
  orderId,
  earnings,
}) {
  try {
    const [deliverer] = await sql`
      SELECT dp.*, u.email, u.display_name, u.name, u.id as user_id
      FROM deliverer_profiles dp
      LEFT JOIN auth_users u ON dp.user_id = u.id::text
      WHERE dp.id = ${delivererId}
    `;
    if (!deliverer) return { success: false, reason: "deliverer_not_found" };

    const [order] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
    if (!order) return { success: false, reason: "order_not_found" };

    const baseUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || "";
    if (deliverer.email) {
      const { html, text } = deliveryAssignmentEmail({
        delivererName:
          deliverer.display_name ||
          deliverer.name ||
          deliverer.full_name ||
          "there",
        orderNumber: order.order_number,
        pickupAddress: "Seller Location",
        deliveryAddress: order.delivery_address?.full || "Customer Location",
        earnings: parseFloat(earnings),
        acceptUrl: `${baseUrl}/deliverer/dashboard`,
      });
      await sendEmail({
        to: deliverer.email,
        subject: `New Delivery Request - GH₵${parseFloat(earnings).toFixed(2)}`,
        html,
        text,
      });
    }

    if (deliverer.user_id) {
      const tokens = await getPushTokens(deliverer.user_id);
      await sendExpoPush(tokens, {
        title: "New Delivery Request",
        body: `Order ${order.order_number} — earn GH₵${parseFloat(
          earnings
        ).toFixed(2)}`,
        data: { type: "delivery_assignment", orderId: String(orderId) },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[notification] Delivery assignment error:", error);
    return { success: false, error: error.message };
  }
}

export async function sendAdminAlert({
  alertType,
  title,
  message,
  metadata,
  actionUrl,
}) {
  try {
    const admins = await sql`
      SELECT id, email, display_name, name 
      FROM auth_users 
      WHERE is_admin = true AND email IS NOT NULL
    `;
    if (admins.length === 0) {
      return { success: false, reason: "no_admins" };
    }

    const { html, text } = adminAlertEmail({
      alertType,
      title,
      message,
      metadata,
      actionUrl,
    });
    await sendEmail({
      to: admins.map((a) => a.email),
      subject: `[Admin Alert] ${title}`,
      html,
      text,
    });

    const tokens = await getPushTokens(admins.map((a) => a.id));
    await sendExpoPush(tokens, {
      title: `[Admin] ${title}`,
      body: message,
      data: { type: "admin_alert", alertType },
    });

    return { success: true, sent: admins.length };
  } catch (error) {
    console.error("[notification] Admin alert error:", error);
    return { success: false, error: error.message };
  }
}

export async function sendWelcomeEmail(userId) {
  try {
    const userInfo = await getUserInfo(userId);
    if (!userInfo.email) return { success: false, reason: "no_email" };

    const baseUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || "";
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin: 0; padding: 0; background: #000000;">
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #000000; color: #FFFFFF;">
            <h1 style="font-size: 32px; font-weight: 800; letter-spacing: 4px; margin: 0 0 32px; text-align: center; color: #FFD700;">CRESTAR</h1>
            <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 32px;">
              <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 16px;">Welcome to Crestar! 🎉</h2>
              <p style="font-size: 16px; color: rgba(255,255,255,0.7); margin: 0 0 24px;">Hi ${userInfo.name},</p>
              <p style="font-size: 16px; color: rgba(255,255,255,0.7); margin: 0 0 24px;">
                We're excited to have you join the Crestar community!
              </p>
              <div style="text-align: center;">
                <a href="${baseUrl}/" style="display: inline-block; background: #FFD700; color: #000000; font-weight: 700; font-size: 16px; padding: 16px 40px; border-radius: 12px; text-decoration: none;">
                  Start Exploring
                </a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = `Welcome to Crestar!\n\nHi ${userInfo.name},\n\nStart exploring: ${baseUrl}/`;

    await sendEmail({
      to: userInfo.email,
      subject: "Welcome to Crestar! 🎉",
      html,
      text,
    });

    const tokens = await getPushTokens(userId);
    await sendExpoPush(tokens, {
      title: "Welcome to Crestar",
      body: "Your account is ready. Start shopping or selling today.",
      data: { type: "welcome" },
    });

    return { success: true };
  } catch (error) {
    console.error("[notification] Welcome email error:", error);
    return { success: false, error: error.message };
  }
}

export default {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendWalletNotification,
  sendSellerApplicationStatus,
  sendLiveSessionNotification,
  sendDeliveryAssignment,
  sendAdminAlert,
  sendWelcomeEmail,
};