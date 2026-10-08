// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { createNotification, notifyWithEmail, getUserDisplayName } from '@/app/api/utils/notify';

// Helper to get a consistent conversation ID between two users
function getConversationId(userId1, userId2) {
  const sorted = [userId1.toString(), userId2.toString()].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
}

// GET /api/messages?partnerId=XX — fetch messages with a specific user
export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const partnerId = url.searchParams.get('partnerId');

    if (!partnerId) {
      // Return conversation list
      const conversations = await sql(
        `SELECT DISTINCT ON (m.conversation_id)
          m.conversation_id,
          m.message_text AS last_message,
          m.created_at AS last_message_at,
          m.sender_user_id,
          CASE 
            WHEN m.sender_user_id = $1 THEN m.receiver_user_id
            ELSE m.sender_user_id
          END AS partner_id,
          u.username AS partner_username,
          u.display_name AS partner_display_name,
          u.profile_image AS partner_avatar,
          u.is_verified AS partner_verified,
          u.is_system_account AS partner_system,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = m.conversation_id AND receiver_user_id = $1 AND is_read = false)::int AS unread_count
        FROM messages m
        JOIN auth_users u ON u.id::text = CASE 
          WHEN m.sender_user_id = $1 THEN m.receiver_user_id
          ELSE m.sender_user_id
        END
        WHERE m.sender_user_id = $1 OR m.receiver_user_id = $1
        ORDER BY m.conversation_id, m.created_at DESC`,
        [userId]
      );

      return Response.json({ conversations });
    }

    // Fetch messages for a specific conversation
    const conversationId = getConversationId(userId, partnerId);

    const messages = await sql(
      `SELECT m.*, 
        su.username AS sender_username,
        su.display_name AS sender_display_name,
        su.is_verified AS sender_verified,
        su.is_system_account AS sender_system
      FROM messages m
      JOIN auth_users su ON su.id::text = m.sender_user_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
      LIMIT 100`,
      [conversationId]
    );

    // Mark received messages as read
    await sql(
      `UPDATE messages SET is_read = true 
       WHERE conversation_id = $1 AND receiver_user_id = $2 AND is_read = false`,
      [conversationId, userId]
    );

    // Get partner info
    const partnerRows = await sql(
      `SELECT id, username, display_name, profile_image, is_verified, is_system_account
       FROM auth_users WHERE id = $1`,
      [parseInt(partnerId)]
    );
    const partner = partnerRows[0] || null;

    return Response.json({ messages, partner });
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

    const body = await request.json();
    const { receiverId, message } = body;

    if (!receiverId || !message?.trim()) {
      return Response.json({ error: 'Receiver and message are required' }, { status: 400 });
    }

    const conversationId = getConversationId(userId, receiverId);

    const result = await sql(
      `INSERT INTO messages (conversation_id, sender_user_id, receiver_user_id, message_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [conversationId, userId, receiverId.toString(), message.trim()]
    );

    const newMessage = result[0];

    // Notification for the receiver (skip system accounts).
    // If the two users share an ACTIVE order, also send an email so sellers
    // never miss delivery questions from buyers (and vice versa).
    try {
      const receiverIsSystem = await sql(
        `SELECT 1 FROM auth_users WHERE id = $1 AND is_system_account = true`,
        [parseInt(receiverId)]
      );
      if (receiverIsSystem.length === 0) {
        const senderName = await getUserDisplayName(userId);
        const preview = message.trim().slice(0, 80);

        // Check for an active order between the two users (either direction)
        let activeOrder = null;
        try {
          const activeOrders = await sql(
            `SELECT id, order_number, item_title FROM orders
             WHERE ((buyer_id = $1 AND seller_id = $2) OR (buyer_id = $2 AND seller_id = $1))
               AND status IN ('paid', 'preparing', 'ready_for_pickup', 'in_transit', 'delivered')
             ORDER BY created_at DESC LIMIT 1`,
            [userId, receiverId.toString()]
          );
          activeOrder = activeOrders[0] || null;
        } catch (orderCheckErr) {
          console.warn('Active order check failed:', orderCheckErr?.message);
        }

        const notificationPayload = {
          userId: receiverId,
          type: 'message',
          title: '✉️ New Message',
          body: `${senderName}: "${preview}"`,
          data: {
            conversation_id: conversationId,
            from_user_id: userId,
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

    // If the receiver is a Crestar system account, auto-reply
    const systemAccounts = await sql(
      `SELECT id, username FROM auth_users WHERE is_system_account = true AND id = $1`,
      [parseInt(receiverId)]
    );

    if (systemAccounts.length > 0) {
      // Auto-reply from Crestar support after a brief moment
      const systemAccount = systemAccounts[0];
      const autoReplyText =
        'Thank you for reaching out! Our support team has received your message. A team member will review and respond to you shortly. In the meantime, feel free to share any additional details about your issue.';

      await sql(
        `INSERT INTO messages (conversation_id, sender_user_id, receiver_user_id, message_text)
         VALUES ($1, $2, $3, $4)`,
        [conversationId, receiverId.toString(), userId, autoReplyText]
      );
    }

    return Response.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    return Response.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
