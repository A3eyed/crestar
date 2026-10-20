// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { sendEmail } from '@/app/api/utils/send-email';

/**
 * Crestar notification helper
 * - createNotification: writes an in-app notification (notifications table)
 * - notifyWithEmail: in-app notification + best-effort email
 * - notifyNewOrderOnce: idempotent "new order" seller alert (in-app + email)
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

function formatDelivery(order) {
  const addr = order.delivery_address;
  if (!addr) return null;
  if (typeof addr === 'string') {
    try {
      return formatDelivery({ delivery_address: JSON.parse(addr) });
    } catch {
      return addr;
    }
  }
  if (typeof addr !== 'object') return null;

  // Pickup
  if (addr.type === 'pickup' || order.fulfillment_type === 'pickup') {
    return 'Buyer will pick up from your store';
  }

  const parts = [
    addr.line1 || addr.address || addr.street,
    addr.landmark || addr.store_landmark,
    addr.city || addr.town,
    addr.region || addr.state,
    addr.country,
  ].filter(Boolean);

  const phone = addr.phone || addr.buyer_phone || order.buyer_phone;
  const name = addr.name || addr.recipient_name || order.buyer_name;

  let line = parts.join(', ');
  if (name) line = `${name}${line ? ` · ${line}` : ''}`;
  if (phone) line = `${line}${line ? ' · ' : ''}${phone}`;
  return line || null;
}

/**
 * Idempotent seller alert for a newly-paid order.
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

    // Enrich from DB if caller only passed ids
    let full = order;
    try {
      const [row] = await sql`
        SELECT o.*,
               u.username AS buyer_username,
               COALESCE(u.display_name, u.name) AS buyer_name,
               u.phone AS buyer_phone
        FROM orders o
        LEFT JOIN auth_users u ON u.id::text = o.buyer_id
        WHERE o.id = ${order.id}
        LIMIT 1
      `;
      if (row) full = { ...order, ...row };
    } catch {}

    const amount = parseFloat(full.total_amount || 0).toFixed(2);
    const currency = full.currency || full.seller_currency || 'GHS';
    const orderLabel = full.order_number || `#${String(full.id).slice(0, 8)}`;
    const qty = full.quantity || 1;
    const itemTitle = full.item_title || 'Item';
    const deliveryLine = formatDelivery(full);
    const fulfillment =
      full.fulfillment_type ||
      full.delivery_type ||
      (deliveryLine && deliveryLine.includes('pick up') ? 'pickup' : 'delivery');

    const bodyParts = [
      `Order ${orderLabel}`,
      `${itemTitle} × ${qty}`,
      `${currency} ${amount}`,
    ];
    if (deliveryLine) bodyParts.push(deliveryLine);
    else bodyParts.push('Open My Sales for delivery details');

    await notifyWithEmail({
      userId: full.seller_id,
      type: 'new_order',
      title: '🛍️ New sale!',
      body: bodyParts.join(' · '),
      data: {
        order_id: full.id,
        order_number: full.order_number || null,
        amount,
        currency,
        item_title: itemTitle,
        quantity: qty,
        fulfillment_type: fulfillment,
        delivery_summary: deliveryLine,
        buyer_id: full.buyer_id || null,
      },
      emailSubject: `New sale ${orderLabel} — ${itemTitle} · ${currency} ${amount}`,
      emailHtml: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#111;color:#fff;border-radius:12px;">
        <h2 style="color:#D4AF37;margin-top:0;">You made a sale 🎉</h2>
        <p style="color:#ddd;line-height:1.6;">
          <strong>Order:</strong> ${orderLabel}<br/>
          <strong>Product:</strong> ${itemTitle}${qty > 1 ? ` × ${qty}` : ''}<br/>
          <strong>Total:</strong> ${currency} ${amount}<br/>
          <strong>Fulfillment:</strong> ${fulfillment || 'delivery'}<br/>
          ${deliveryLine ? `<strong>Delivery:</strong> ${deliveryLine}<br/>` : ''}
        </p>
        <p style="color:#ddd;line-height:1.6;">Payment is held in escrow and released when the buyer confirms delivery. Open <strong>Seller Center → Orders</strong> to fulfill.</p>
        <p style="color:#888;font-size:12px;margin-top:24px;">Crestar — Shop, Create, Earn Together</p>
      </div>`,
    });
  } catch (err) {
    console.error('[notify] notifyNewOrderOnce failed:', err);
  }
}

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
