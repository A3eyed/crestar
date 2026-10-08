// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { sendEmail } from '@/app/api/utils/send-email';

/**
 * Crestar notification helper
 * - createNotification: writes an in-app notification (notifications table)
 * - notifyWithEmail: in-app notification + best-effort email
 * - notifyNewOrderOnce: idempotent "new order" seller alert (in-app + email)
 *
 * All functions are fire-and-forget safe: they never throw, so callers
 * (likes, comments, follows, messages, payments) can't fail because of a
 * notification problem.
 */

export async function createNotification({ userId, type, title, body, data }) {
  try {
    if (!userId || !type) return null;
    const [row] = await sql`
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (${userId.toString()}, ${type}, ${title || null}, ${body || null}, ${JSON.stringify(data || {})})
      RETURNING id
    `;
    return row?.id || null;
  } catch (err) {
    console.error('[notify] createNotification failed:', err);
    return null;
  }
}

export async function notifyWithEmail({
  userId,
  type,
  title,
  body,
  data,
  emailSubject,
  emailHtml,
}) {
  const notificationId = await createNotification({
    userId,
    type,
    title,
    body,
    data,
  });

  // Best-effort email — never blocks or throws
  try {
    if (!emailSubject) return notificationId;
    const rows = await sql`
      SELECT email FROM auth_users WHERE id = ${userId.toString()} LIMIT 1
    `;
    const email = rows[0]?.email;
    if (email) {
      await sendEmail({
        to: email,
        subject: emailSubject,
        html:
          emailHtml ||
          `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#111;color:#fff;border-radius:12px;">
            <h2 style="color:#D4AF37;margin-top:0;">${title || 'Crestar'}</h2>
            <p style="color:#ddd;line-height:1.6;">${body || ''}</p>
            <p style="color:#888;font-size:12px;margin-top:24px;">Crestar — Shop, Create, Earn Together</p>
          </div>`,
      });
    }
  } catch (err) {
    console.error('[notify] email send failed:', err);
  }

  return notificationId;
}

/**
 * Idempotent seller alert for a newly-paid order. Safe to call from both
 * the payment verify route and the Paystack webhook — only the first call
 * creates the notification.
 */
export async function notifyNewOrderOnce(order) {
  try {
    if (!order?.id || !order?.seller_id) return;

    const existing = await sql`
      SELECT id FROM notifications
      WHERE type = 'new_order' AND user_id = ${order.seller_id.toString()}
        AND data->>'order_id' = ${order.id.toString()}
      LIMIT 1
    `;
    if (existing.length > 0) return;

    const amount = parseFloat(order.total_amount || 0).toFixed(2);
    const currency = order.currency || 'GHS';
    const orderLabel = order.order_number || `#${String(order.id).slice(0, 8)}`;

    await notifyWithEmail({
      userId: order.seller_id,
      type: 'new_order',
      title: '🛍️ New Order Received!',
      body: `Order ${orderLabel} — ${order.item_title || 'Item'} for ${currency} ${amount}. Open My Sales to view the buyer's delivery details.`,
      data: {
        order_id: order.id,
        order_number: order.order_number || null,
        amount,
        currency,
      },
      emailSubject: `New order ${orderLabel} on Crestar — ${currency} ${amount}`,
      emailHtml: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#111;color:#fff;border-radius:12px;">
        <h2 style="color:#D4AF37;margin-top:0;">You have a new order! 🎉</h2>
        <p style="color:#ddd;line-height:1.6;">
          <strong>Order:</strong> ${orderLabel}<br/>
          <strong>Item:</strong> ${order.item_title || 'Item'}${order.quantity ? ` × ${order.quantity}` : ''}<br/>
          <strong>Total:</strong> ${currency} ${amount}
        </p>
        <p style="color:#ddd;line-height:1.6;">Payment is held in escrow and released when the buyer confirms delivery. Open <strong>My Sales</strong> to see the buyer's delivery details and start fulfilling.</p>
        <p style="color:#888;font-size:12px;margin-top:24px;">Crestar — Shop, Create, Earn Together</p>
      </div>`,
    });
  } catch (err) {
    console.error('[notify] notifyNewOrderOnce failed:', err);
  }
}

/** Fetch a user's display name for notification copy */
export async function getUserDisplayName(userId) {
  try {
    const rows = await sql`
      SELECT COALESCE(display_name, username, name, 'Someone') AS dname
      FROM auth_users WHERE id = ${userId.toString()} LIMIT 1
    `;
    return rows[0]?.dname || 'Someone';
  } catch (err) {
    return 'Someone';
  }
}
