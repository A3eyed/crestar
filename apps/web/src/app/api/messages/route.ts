// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { createNotification, notifyWithEmail, getUserDisplayName } from '@/app/api/utils/notify';

function getConversationId(userId1, userId2) {
  const sorted = [String(userId1), String(userId2)].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
}

async function resolvePartnerId(raw) {
  const key = String(raw || '').trim().replace(/^@+/, '');
  if (!key) return null;
  const [row] = await sql`
    SELECT id, username, display_name, name, profile_image, is_verified, is_system_account
    FROM auth_users
    WHERE id::text = ${key} OR lower(username) = lower(${key})
    LIMIT 1
  `;
  return row || null;
}

// GET /api/messages?partnerId=XX — fetch messages with a specific user
// GET /api/messages — conversation list (newest first)
export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const me = String(userId);

    const url = new URL(request.url);
    const partnerParam = url.searchParams.get('partnerId') || url.searchParams.get('userId');

    if (!partnerParam) {
      // Conversation list — order by last message time (TikTok-style)
      const conversations = await sql(
        `WITH latest AS (
           SELECT DISTINCT ON (m.conversation_id)
             m.conversation_id,
             m.message_text AS last_message,
             m.created_at AS last_message_at,
             m.sender_user_id,
             CASE
               WHEN m.sender_user_id = $1 THEN m.receiver_user_id
               ELSE m.sender_user_id
             END AS partner_id
           FROM messages m
           WHERE m.sender_user_id = $1 OR m.receiver_user_id = $1
           ORDER BY m.conversation_id, m.created_at DESC
         )
         SELECT
           l.*,
           u.username AS partner_username,
           COALESCE(u.display_name, u.name) AS partner_display_name,
           u.profile_image AS partner_avatar,
           u.is_verified AS partner_verified,
           u.is_system_account AS partner_system,
           (SELECT COUNT(*)::int FROM messages
             WHERE conversation_id = l.conversation_id
               AND receiver_user_id = $1 AND is_read = false) AS unread_count
         FROM latest l
         LEFT JOIN auth_users u ON u.id::text = l.partner_id
         ORDER BY l.last_message_at DESC`,
        [me],
      );

      return Response.json({ conversations });
    }

    const partner = await resolvePartnerId(partnerParam);
    if (!partner) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const partnerId = String(partner.id);

    // Support thread with @Crestar uses support_<userId>
    let conversationId = getConversationId(me, partnerId);
    if (partner.is_system_account || String(partner.username || '').toLowerCase() === 'crestar') {
      conversationId = `support_${me}`;
    }

    const messages = await sql(
      `SELECT m.*,
        su.username AS sender_username,
        COALESCE(su.display_name, su.name) AS sender_display_name,
        su.is_verified AS sender_verified,
        su.is_system_account AS sender_system
      FROM messages m
      LEFT JOIN auth_users su ON su.id::text = m.sender_user_id
      WHERE m.conversation_id = $1
         OR (m.conversation_id = $2)
      ORDER BY m.created_at ASC
      LIMIT 200`,
      [conversationId, getConversationId(me, partnerId)],
    );

    // Deduplicate if both ids matched somehow
    const seen = new Set();
    const unique = [];
    for (const m of messages) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      unique.push(m);
    }

    await sql(
      `UPDATE messages SET is_read = true
       WHERE (conversation_id = $1 OR conversation_id = $2)
         AND receiver_user_id = $3 AND is_read = false`,
      [conversationId, getConversationId(me, partnerId), me],
    );

    return Response.json({
      messages: unique,
      partner: {
        id: partnerId,
        username: partner.username,
        display_name: partner.display_name || partner.name,
        profile_image: partner.profile_image,
        is_verified: partner.is_verified,
        is_system_account: partner.is_system_account,
      },
      conversationId,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return Response.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/messages — send a message
export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const me = String(userId);

    const body = await request.json();
    const { receiverId, message } = body;

    if (!receiverId || !message?.trim()) {
      return Response.json({ error: 'Receiver and message are required' }, { status: 400 });
    }

    const partner = await resolvePartnerId(receiverId);
    if (!partner) {
      return Response.json({ error: 'Recipient not found' }, { status: 404 });
    }
    const toId = String(partner.id);

    if (toId === me) {
      return Response.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    let conversationId = getConversationId(me, toId);
    if (partner.is_system_account || String(partner.username || '').toLowerCase() === 'crestar') {
      conversationId = `support_${me}`;
    }

    const result = await sql(
      `INSERT INTO messages (conversation_id, sender_user_id, receiver_user_id, message_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [conversationId, me, toId, message.trim()],
    );

    const newMessage = result[0];

    try {
      if (!partner.is_system_account) {
        const senderName = await getUserDisplayName(me);
        const preview = message.trim().slice(0, 80);

        let activeOrder = null;
        try {
          const activeOrders = await sql(
            `SELECT id, order_number, item_title FROM orders
             WHERE ((buyer_id = $1 AND seller_id = $2) OR (buyer_id = $2 AND seller_id = $1))
               AND status IN ('paid', 'preparing', 'ready_for_pickup', 'in_transit', 'delivered')
             ORDER BY created_at DESC LIMIT 1`,
            [me, toId],
          );
          activeOrder = activeOrders[0] || null;
        } catch (orderCheckErr) {
          console.warn('Active order check failed:', orderCheckErr?.message);
        }

        const notificationPayload = {
          userId: toId,
          type: 'message',
          title: '✉️ New Message',
          body: `${senderName}: "${preview}"`,
          data: {
            conversation_id: conversationId,
            from_user_id: me,
            message_id: newMessage?.id || null,
            order_id: activeOrder?.id || null,
          },
        };

        if (activeOrder) {
          const orderLabel = activeOrder.order_number || `#${String(activeOrder.id).slice(0, 8)}`;
          await notifyWithEmail({
            ...notificationPayload,
            emailSubject: `New message about order ${orderLabel} on Crestar`,
            emailHtml: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#111;color:#fff;border-radius:12px;">
              <h2 style="color:#D4AF37;margin-top:0;">✉️ New message about your order</h2>
              <p style="color:#ddd;line-height:1.6;">
                <strong>${senderName}</strong> sent you a message regarding order <strong>${orderLabel}</strong>${activeOrder.item_title ? ` (${activeOrder.item_title})` : ''}:
              </p>
              <p style="color:#fff;background:#1c1c1c;border-left:3px solid #D4AF37;padding:12px 16px;border-radius:8px;line-height:1.6;">"${preview}"</p>
              <p style="color:#ddd;line-height:1.6;">Open your Crestar inbox to reply and keep the delivery on track.</p>
              <p style="color:#888;font-size:12px;margin-top:24px;">Crestar — Shop, Create, Earn Together</p>
            </div>`,
          });
        } else {
          await createNotification(notificationPayload);
        }
      }
    } catch (notifyErr) {
      console.error('Message notification failed:', notifyErr);
    }

    // Auto-reply from system accounts (support)
    if (partner.is_system_account) {
      const autoReplyText =
        'Thank you for reaching out! Our support team has received your message. A team member will review and respond to you shortly. In the meantime, feel free to share any additional details about your issue.';

      await sql(
        `INSERT INTO messages (conversation_id, sender_user_id, receiver_user_id, message_text)
         VALUES ($1, $2, $3, $4)`,
        [conversationId, toId, me, autoReplyText],
      );
    }

    return Response.json({ success: true, message: newMessage, conversationId });
  } catch (error) {
    console.error('Send message error:', error);
    return Response.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
