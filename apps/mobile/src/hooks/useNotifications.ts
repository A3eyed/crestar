// @ts-nocheck
/**
 * useNotifications Hook
 * Easy integration for sending notifications (email + future push) from the mobile app
 */
import { useState } from "react";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

export function useNotifications() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Send any type of notification
   */
  const sendNotification = async (type, data) => {
    try {
      setSending(true);
      setError(null);

      const response = await authenticatedFetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send notification");
      }

      return { success: true, ...result };
    } catch (err) {
      setError(err.message);
      console.error("Notification error:", err);
      return { success: false, error: err.message };
    } finally {
      setSending(false);
    }
  };

  // Specific helpers
  const sendOrderConfirmation = async (orderId) => {
    return sendNotification("order_confirmation", { orderId });
  };

  const sendOrderStatusUpdate = async (orderId, status) => {
    return sendNotification("order_status", { orderId, status });
  };

  const sendWalletNotification = async ({
    userId,
    transactionType,
    amount,
    balance,
    reference,
    description,
  }) => {
    return sendNotification("wallet", {
      userId,
      transactionType,
      amount,
      balance,
      reference,
      description,
    });
  };

  const sendSellerStatus = async ({
    userId,
    status,
    businessName,
    rejectionReason,
  }) => {
    return sendNotification("seller_status", {
      userId,
      status,
      businessName,
      rejectionReason,
    });
  };

  const sendLiveSessionNotification = async ({
    sellerId,
    sessionId,
    sessionTitle,
  }) => {
    return sendNotification("live_session", {
      sellerId,
      sessionId,
      sessionTitle,
    });
  };

  const sendDeliveryAssignment = async ({ delivererId, orderId, earnings }) => {
    return sendNotification("delivery_assignment", {
      delivererId,
      orderId,
      earnings,
    });
  };

  const sendAdminAlert = async ({
    alertType,
    title,
    message,
    metadata,
    actionUrl,
  }) => {
    return sendNotification("admin_alert", {
      alertType,
      title,
      message,
      metadata,
      actionUrl,
    });
  };

  const sendWelcomeEmail = async (userId) => {
    return sendNotification("welcome", { userId });
  };

  return {
    sending,
    error,
    sendNotification,
    sendOrderConfirmation,
    sendOrderStatusUpdate,
    sendWalletNotification,
    sendSellerStatus,
    sendLiveSessionNotification,
    sendDeliveryAssignment,
    sendAdminAlert,
    sendWelcomeEmail,
  };
}

/**
 * Quick notification helpers (non-hook)
 * Now also uses authenticatedFetch
 */
export const notifications = {
  async orderConfirmation(orderId) {
    const response = await authenticatedFetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "order_confirmation",
        data: { orderId },
      }),
    });
    return response.json();
  },

  async orderStatus(orderId, status) {
    const response = await authenticatedFetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "order_status",
        data: { orderId, status },
      }),
    });
    return response.json();
  },

  async wallet(data) {
    const response = await authenticatedFetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "wallet",
        data,
      }),
    });
    return response.json();
  },

  async liveSession(data) {
    const response = await authenticatedFetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "live_session",
        data,
      }),
    });
    return response.json();
  },

  async welcome(userId) {
    const response = await authenticatedFetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "welcome",
        data: { userId },
      }),
    });
    return response.json();
  },
};

export default useNotifications;