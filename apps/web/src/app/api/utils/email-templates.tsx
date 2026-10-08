// @ts-nocheck
/**
 * Email Templates for Crestar
 * Consistent branded templates for all email notifications
 */

/**
 * Escape HTML to prevent injection in email templates
 */
function escapeHtml(unsafe) {
  if (unsafe == null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const BRAND_COLORS = {
  primary: "#FFD700",
  black: "#000000",
  white: "#FFFFFF",
  text: "rgba(255,255,255,0.9)",
  textSecondary: "rgba(255,255,255,0.6)",
  textTertiary: "rgba(255,255,255,0.4)",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
  background: ${BRAND_COLORS.black};
  color: ${BRAND_COLORS.white};
`;

const headerStyle = `
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 4px;
  margin: 0 0 32px;
  text-align: center;
  color: ${BRAND_COLORS.primary};
`;

const cardStyle = `
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
`;

const buttonStyle = `
  display: inline-block;
  background: ${BRAND_COLORS.primary};
  color: ${BRAND_COLORS.black};
  font-weight: 700;
  font-size: 16px;
  padding: 16px 40px;
  border-radius: 12px;
  text-decoration: none;
  letter-spacing: 0.5px;
`;

const footerStyle = `
  font-size: 12px;
  color: ${BRAND_COLORS.textTertiary};
  text-align: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.1);
`;

/**
 * Base Email Wrapper
 */
function wrapEmail(content) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background: #000000;">
        <div style="${baseStyle}">
          <h1 style="${headerStyle}">CRESTAR</h1>
          ${content}
          <div style="${footerStyle}">
            <p style="margin: 0 0 8px;">Need help? Contact us at <a href="mailto:hello@crestarhq.com" style="color: ${BRAND_COLORS.textSecondary};">hello@crestarhq.com</a></p>
            <p style="margin: 0;">© ${new Date().getFullYear()} Crestar. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Order Confirmation Email
 */
export function orderConfirmationEmail({
  customerName,
  orderNumber,
  items,
  total,
  deliveryAddress,
  orderUrl,
}) {
  const itemsList = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="font-weight: 600; margin-bottom: 4px;">${escapeHtml(item.title)}</div>
        <div style="font-size: 13px; color: ${BRAND_COLORS.textSecondary};">Qty: ${parseInt(item.quantity) || 0}</div>
      </td>
      <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="font-weight: 700;">GH₵${(parseFloat(item.price) || 0).toFixed(2)}</div>
      </td>
    </tr>
  `,
    )
    .join("");

  const html = wrapEmail(`
    <div style="${cardStyle}">
      <p style="font-size: 16px; color: ${BRAND_COLORS.textSecondary}; margin: 0 0 8px;">Hi ${escapeHtml(customerName)},</p>
      <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 24px; color: ${BRAND_COLORS.white};">Order Confirmed! 🎉</h2>
      
      <div style="background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: ${BRAND_COLORS.textSecondary};">Order Number</p>
        <p style="margin: 4px 0 0; font-size: 20px; font-weight: 800; letter-spacing: 1px;">${escapeHtml(orderNumber)}</p>
      </div>

      <table style="width: 100%; margin-bottom: 24px;">
        ${itemsList}
        <tr>
          <td style="padding: 16px 0 0;">
            <strong>Total</strong>
          </td>
          <td style="padding: 16px 0 0; text-align: right;">
            <strong style="font-size: 20px; color: ${BRAND_COLORS.primary};">GH₵${(parseFloat(total) || 0).toFixed(2)}</strong>
          </td>
        </tr>
      </table>

      ${
        deliveryAddress
          ? `
        <div style="margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: ${BRAND_COLORS.textSecondary};">Delivery Address</p>
          <p style="margin: 0; color: ${BRAND_COLORS.text};">${escapeHtml(deliveryAddress)}</p>
        </div>
      `
          : ""
      }

      ${
        orderUrl
          ? `
        <div style="text-align: center;">
          <a href="${orderUrl}" style="${buttonStyle}">Track Order</a>
        </div>
      `
          : ""
      }
    </div>
  `);

  const text = `Order Confirmed!\n\nHi ${customerName},\n\nYour order #${orderNumber} has been confirmed.\n\nTotal: GH₵${(parseFloat(total) || 0).toFixed(2)}\n${deliveryAddress ? `\nDelivery to: ${deliveryAddress}` : ""}\n\n${orderUrl ? `Track your order: ${orderUrl}` : ""}\n\nCrestar Team`;

  return { html, text };
}

/**
 * Order Status Update Email
 */
export function orderStatusUpdateEmail({
  customerName,
  orderNumber,
  status,
  statusMessage,
  trackingUrl,
}) {
  const statusEmoji = {
    paid: "💰",
    confirmed: "✅",
    processing: "📦",
    shipped: "🚚",
    out_for_delivery: "🛵",
    delivered: "🎊",
    cancelled: "❌",
  };

  const html = wrapEmail(`
    <div style="${cardStyle}">
      <div style="text-align: center; font-size: 48px; margin-bottom: 16px;">
        ${statusEmoji[status] || "📮"}
      </div>
      <p style="font-size: 16px; color: ${BRAND_COLORS.textSecondary}; margin: 0 0 8px;">Hi ${escapeHtml(customerName)},</p>
      <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 16px; color: ${BRAND_COLORS.white};">Order Update</h2>
      
      <p style="font-size: 16px; color: ${BRAND_COLORS.text}; margin: 0 0 24px;">
        ${escapeHtml(statusMessage)}
      </p>

      <div style="background: rgba(255,255,255,0.04); border-radius: 8px; padding: 12px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: ${BRAND_COLORS.textSecondary};">Order Number</p>
        <p style="margin: 4px 0 0; font-size: 16px; font-weight: 700;">${escapeHtml(orderNumber)}</p>
      </div>

      ${
        trackingUrl
          ? `
        <div style="text-align: center;">
          <a href="${trackingUrl}" style="${buttonStyle}">View Details</a>
        </div>
      `
          : ""
      }
    </div>
  `);

  const text = `Order Update\n\nHi ${customerName},\n\n${statusMessage}\n\nOrder #${orderNumber}\n\n${trackingUrl ? `View details: ${trackingUrl}` : ""}\n\nCrestar Team`;

  return { html, text };
}

/**
 * Wallet Transaction Email
 */
export function walletTransactionEmail({
  userName,
  transactionType,
  amount,
  balance,
  reference,
  description,
}) {
  const typeEmoji = {
    deposit: "💵",
    withdrawal: "💸",
    earning: "🎉",
    refund: "↩️",
    transfer_in: "📥",
    transfer_out: "📤",
  };

  const typeColor = {
    deposit: BRAND_COLORS.success,
    earning: BRAND_COLORS.success,
    transfer_in: BRAND_COLORS.success,
    withdrawal: BRAND_COLORS.warning,
    transfer_out: BRAND_COLORS.warning,
    refund: BRAND_COLORS.primary,
  };

  const html = wrapEmail(`
    <div style="${cardStyle}">
      <div style="text-align: center; font-size: 48px; margin-bottom: 16px;">
        ${typeEmoji[transactionType] || "💰"}
      </div>
      <p style="font-size: 16px; color: ${BRAND_COLORS.textSecondary}; margin: 0 0 8px;">Hi ${escapeHtml(userName)},</p>
      <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 24px; color: ${BRAND_COLORS.white};">Wallet Activity</h2>
      
      ${
        description
          ? `
        <p style="font-size: 16px; color: ${BRAND_COLORS.text}; margin: 0 0 24px;">
          ${escapeHtml(description)}
        </p>
      `
          : ""
      }

      <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <div style="margin-bottom: 16px;">
          <p style="margin: 0; font-size: 13px; color: ${BRAND_COLORS.textSecondary};">Amount</p>
          <p style="margin: 4px 0 0; font-size: 32px; font-weight: 800; color: ${typeColor[transactionType] || BRAND_COLORS.primary};">
            GH₵${(parseFloat(amount) || 0).toFixed(2)}
          </p>
        </div>
        
        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
          <p style="margin: 0; font-size: 13px; color: ${BRAND_COLORS.textSecondary};">New Balance</p>
          <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700;">GH₵${(parseFloat(balance) || 0).toFixed(2)}</p>
        </div>

        ${
          reference
            ? `
          <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; margin-top: 16px;">
            <p style="margin: 0; font-size: 11px; color: ${BRAND_COLORS.textTertiary};">Reference: ${escapeHtml(reference)}</p>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `);

  const text = `Wallet Activity\n\nHi ${userName},\n\n${description || ""}\n\nAmount: GH₵${(parseFloat(amount) || 0).toFixed(2)}\nNew Balance: GH₵${(parseFloat(balance) || 0).toFixed(2)}\n${reference ? `Reference: ${reference}` : ""}\n\nCrestar Team`;

  return { html, text };
}

/**
 * Seller Application Status Email
 */
export function sellerApplicationEmail({
  userName,
  status,
  businessName,
  rejectionReason,
  dashboardUrl,
}) {
  const isApproved = status === "approved";

  const html = wrapEmail(`
    <div style="${cardStyle}">
      <div style="text-align: center; font-size: 48px; margin-bottom: 16px;">
        ${isApproved ? "🎉" : "📋"}
      </div>
      <p style="font-size: 16px; color: ${BRAND_COLORS.textSecondary}; margin: 0 0 8px;">Hi ${escapeHtml(userName)},</p>
      <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 16px; color: ${BRAND_COLORS.white};">
        ${isApproved ? "Welcome to Crestar Sellers!" : "Application Update"}
      </h2>
      
      ${
        isApproved
          ? `
        <p style="font-size: 16px; color: ${BRAND_COLORS.text}; margin: 0 0 24px;">
          Congratulations! Your seller application for <strong>${escapeHtml(businessName)}</strong> has been approved. You can now start listing products and growing your business on Crestar.
        </p>
        
        <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 700;">Next Steps:</h3>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Complete your seller profile</li>
            <li>Upload your first products</li>
            <li>Set up delivery zones</li>
            <li>Start selling!</li>
          </ul>
        </div>
        
        ${
          dashboardUrl
            ? `
          <div style="text-align: center;">
            <a href="${dashboardUrl}" style="${buttonStyle}">Go to Dashboard</a>
          </div>
        `
            : ""
        }
      `
          : `
        <p style="font-size: 16px; color: ${BRAND_COLORS.text}; margin: 0 0 24px;">
          Thank you for your interest in becoming a seller on Crestar. We've reviewed your application for <strong>${escapeHtml(businessName)}</strong>.
        </p>
        
        ${
          rejectionReason
            ? `
          <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.text};">
              <strong>Status:</strong> ${escapeHtml(rejectionReason)}
            </p>
          </div>
        `
            : ""
        }
        
        <p style="font-size: 14px; color: ${BRAND_COLORS.textSecondary}; margin: 0;">
          If you have questions, please contact our support team at hello@crestarhq.com
        </p>
      `
      }
    </div>
  `);

  const text = isApproved
    ? `Welcome to Crestar Sellers!\n\nHi ${userName},\n\nCongratulations! Your seller application for ${businessName} has been approved.\n\nNext steps:\n- Complete your seller profile\n- Upload your first products\n- Set up delivery zones\n- Start selling!\n\n${dashboardUrl ? `Dashboard: ${dashboardUrl}` : ""}\n\nCrestar Team`
    : `Application Update\n\nHi ${userName},\n\nThank you for applying to sell on Crestar. Your application for ${businessName} is currently under review.\n\n${rejectionReason || ""}\n\nFor questions, contact: hello@crestarhq.com\n\nCrestar Team`;

  return { html, text };
}

/**
 * Live Session Notification Email
 */
export function liveSessionNotificationEmail({
  followerName,
  sellerName,
  sessionTitle,
  sessionUrl,
}) {
  const html = wrapEmail(`
    <div style="${cardStyle}">
      <div style="text-align: center; font-size: 48px; margin-bottom: 16px;">🔴</div>
      <p style="font-size: 16px; color: ${BRAND_COLORS.textSecondary}; margin: 0 0 8px;">Hi ${escapeHtml(followerName)},</p>
      <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 16px; color: ${BRAND_COLORS.white};">
        ${escapeHtml(sellerName)} is Live!
      </h2>
      
      <p style="font-size: 16px; color: ${BRAND_COLORS.text}; margin: 0 0 24px;">
        ${escapeHtml(sessionTitle || `${sellerName} just started a live session`)}
      </p>
      
      <div style="text-align: center;">
        <a href="${sessionUrl}" style="${buttonStyle}">Join Live Session</a>
      </div>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.textTertiary}; margin: 24px 0 0; text-align: center;">
        Don't miss out on exclusive deals and products!
      </p>
    </div>
  `);

  const text = `${sellerName} is Live!\n\nHi ${followerName},\n\n${sessionTitle || `${sellerName} just started a live session`}\n\nJoin now: ${sessionUrl}\n\nCrestar Team`;

  return { html, text };
}

/**
 * Delivery Assignment Email (for deliverers)
 */
export function deliveryAssignmentEmail({
  delivererName,
  orderNumber,
  pickupAddress,
  deliveryAddress,
  earnings,
  acceptUrl,
}) {
  const html = wrapEmail(`
    <div style="${cardStyle}">
      <div style="text-align: center; font-size: 48px; margin-bottom: 16px;">🛵</div>
      <p style="font-size: 16px; color: ${BRAND_COLORS.textSecondary}; margin: 0 0 8px;">Hi ${escapeHtml(delivererName)},</p>
      <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 24px; color: ${BRAND_COLORS.white};">
        New Delivery Request
      </h2>
      
      <div style="background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: ${BRAND_COLORS.textSecondary};">Earnings</p>
        <p style="margin: 4px 0 0; font-size: 28px; font-weight: 800; color: ${BRAND_COLORS.primary};">
          GH₵${(parseFloat(earnings) || 0).toFixed(2)}
        </p>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px; font-size: 13px; color: ${BRAND_COLORS.textSecondary};">Order Number</p>
          <p style="margin: 0; font-weight: 700;">${escapeHtml(orderNumber)}</p>
        </div>
        
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px; font-size: 13px; color: ${BRAND_COLORS.textSecondary};">📍 Pickup From</p>
          <p style="margin: 0;">${escapeHtml(pickupAddress)}</p>
        </div>
        
        <div>
          <p style="margin: 0 0 4px; font-size: 13px; color: ${BRAND_COLORS.textSecondary};">📍 Deliver To</p>
          <p style="margin: 0;">${escapeHtml(deliveryAddress)}</p>
        </div>
      </div>
      
      ${
        acceptUrl
          ? `
        <div style="text-align: center;">
          <a href="${acceptUrl}" style="${buttonStyle}">Accept Delivery</a>
        </div>
      `
          : ""
      }
    </div>
  `);

  const text = `New Delivery Request\n\nHi ${delivererName},\n\nEarnings: GH₵${(parseFloat(earnings) || 0).toFixed(2)}\nOrder: ${orderNumber}\n\nPickup: ${pickupAddress}\nDeliver to: ${deliveryAddress}\n\n${acceptUrl ? `Accept: ${acceptUrl}` : ""}\n\nCrestar Team`;

  return { html, text };
}

/**
 * Admin Alert Email
 */
export function adminAlertEmail({
  alertType,
  title,
  message,
  actionUrl,
  metadata,
}) {
  const alertEmoji = {
    report: "⚠️",
    fraud: "🚨",
    high_value: "💎",
    system: "⚙️",
    verification: "✅",
  };

  const html = wrapEmail(`
    <div style="${cardStyle}">
      <div style="text-align: center; font-size: 48px; margin-bottom: 16px;">
        ${alertEmoji[alertType] || "📢"}
      </div>
      <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 16px; color: ${BRAND_COLORS.white};">
        ${escapeHtml(title)}
      </h2>
      
      <p style="font-size: 16px; color: ${BRAND_COLORS.text}; margin: 0 0 24px;">
        ${escapeHtml(message)}
      </p>
      
      ${
        metadata
          ? `
        <div style="background: rgba(255,255,255,0.04); border-radius: 8px; padding: 16px; margin-bottom: 24px; font-family: monospace; font-size: 13px;">
          <pre style="margin: 0; color: ${BRAND_COLORS.textSecondary}; white-space: pre-wrap;">${escapeHtml(JSON.stringify(metadata, null, 2))}</pre>
        </div>
      `
          : ""
      }
      
      ${
        actionUrl
          ? `
        <div style="text-align: center;">
          <a href="${actionUrl}" style="${buttonStyle}">Take Action</a>
        </div>
      `
          : ""
      }
    </div>
  `);

  const text = `${title}\n\n${message}\n\n${metadata ? `Details:\n${JSON.stringify(metadata, null, 2)}` : ""}\n\n${actionUrl ? `Action: ${actionUrl}` : ""}\n\nCrestar Admin`;

  return { html, text };
}

export default {
  orderConfirmationEmail,
  orderStatusUpdateEmail,
  walletTransactionEmail,
  sellerApplicationEmail,
  liveSessionNotificationEmail,
  deliveryAssignmentEmail,
  adminAlertEmail,
};
