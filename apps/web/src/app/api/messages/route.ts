// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { createNotification, notifyWithEmail, getUserDisplayName } from '@/app/api/utils/notify';
import { getSupportAccount } from '@/app/api/utils/support';

function getConversationId(userId1, userId2) {
  const sorted = [String(userId1), String(userId2)].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
}

function isCrestarPartner(partner) {
  if (!partner) return false;
  if (partner.is_system_account) return true;
  const handle = String(partner.username || '').toLowerCase();
  return handle === 'crestar' || handle === 'crestarhq' || handle === 'support';
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
// GET /api/messages?conversationId=support_… — open a known thread
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
    const conversationParam = url.searchParams.get('conversationId');

    if (!partnerParam && !conversationParam) {
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
           COALESCE(u.display_name, u.name, u.username) AS partner_display_name,
           u.profile_image AS partner_avatar,
           u.is_verified AS partner_verified,
           COALESCE(u.is_system_account, false) AS partner_system,
           (SELECT COUNT(*)::int FROM messages
             WHERE conversation_id = l.conversation_id
               AND receiver_user_id = $1 AND is_read = false) AS unread_count
         FROM latest l
         LEFT JOIN auth_users u ON u.id::text = l.partner_id
         ORDER BY l.last_message_at DESC`,
        [me],
      );

      // Normalize Crestar / system threads for the UI
      const normalized = (conversations || []).map((c) => {
        const isSupport =
          String(c.conversation_id || '').startsWith('support_') ||
          c.partner_system;
        if (!isSupport) return c;
        return {
          ...c,
          partner_display_name: c.partner_display_name || 'Crestar',
          partner_username: c.partner_username || 'crestar',
          partner_system: true,
        };
      });

      return Response.json({ conversations: normalized });
    }

    // Direct conversation id (admin/support deep links)
    if (conversationParam && !partnerParam) {
      const cid = String(conversationParam);
      // Users may only open their own support thread; agents use /api/support/chat
      if (cid.startsWith('support_') && cid !== `support_${me}`) {
        return Response.json({ error: 'Access denied' }, { status: 403 });
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
        ORDER BY m.created_at ASC
        LIMIT 200`,
        [cid],
      );
      await sql(
        `UPDATE messages SET is_read = true
         WHERE conversation_id = $1 AND receiver_user_id = $2 AND is_read = false`,
        [cid, me],
      );
      const support = await getSupportAccount();
      return Response.json({
        messages,
        conversationId: cid,
        partner: support
          ? {
              id: String(support.id),
              username: support.username || 'crestar',
              display_name: support.business_name || support.display_name || 'Crestar',
              profile_image: support.profile_image,
              is_verified: true,
              is_system_account: true,
            }
          : null,
      });
    }

    const partner = await resolvePartnerId(partnerParam);
    if (!partner) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const partnerId = String(partner.id);
    const peerConv = getConversationId(me, partnerId);
    const supportConv = `support_${me}`;
    const isSupport = isCrestarPartner(partner);

    // Pull every message between the two parties OR the support thread.
    // This fixes empty threads when conversation_id was support_* vs conv_*.
    const messages = await sql(
      `SELECT m.*,
        su.username AS sender_username,
        COALESCE(su.display_name, su.name) AS sender_display_name,
        su.is_verified AS sender_verified,
        su.is_system_account AS sender_system
      FROM messages m
      LEFT JOIN auth_users su ON su.id::text = m.sender_user_id
      WHERE
        m.conversation_id = $1
        OR m.conversation_id = $2
        OR (
          (m.sender_user_id = $3 AND m.receiver_user_id = $4)
          OR (m.sender_user_id = $4 AND m.receiver_user_id = $3)
        )
      ORDER BY m.created_at ASC
      LIMIT 300`,
      [peerConv, isSupport ? supportConv : peerConv, me, partnerId],
    );

    // If partner is Crestar, also force-include support_${me} even when ids differ
    let merged = messages || [];
    if (isSupport) {
      const supportOnly = await sql(
        `SELECT m.*,
          su.username AS sender_username,
          COALESCE(su.display_name, su.name) AS sender_display_name,
          su.is_verified AS sender_verified,
          su.is_system_account AS sender_system
        FROM messages m
        LEFT JOIN auth_users su ON su.id::text = m.sender_user_id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at ASC
        LIMIT 300`,
        [supportConv],
      );
      const byId = new Map();
      for (const m of [...merged, ...(supportOnly || [])]) {
        byId.set(m.id, m);
      }
      merged = Array.from(byId.values()).sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      );
    } else {
      const seen = new Set();
      merged = [];
      for (const m of messages || []) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        merged.push(m);
      }
    }

    await sql(
      `UPDATE messages SET is_read = true
       WHERE receiver_user_id = $1 AND is_read = false
         AND (
           conversation_id = $2
           OR conversation_id = $3
           OR (sender_user_id = $4 AND receiver_user_id = $1)
         )`,
      [me, peerConv, isSupport ? supportConv : peerConv, partnerId],
    );

    return Response.json({
      messages: merged,
      partner: {
        id: partnerId,
        username: partner.username,
        display_name: isSupport
          ? partner.display_name || partner.name || 'Crestar'
          : partner.display_name || partner.name,
        profile_image: partner.profile_image,
        is_verified: partner.is_verified || isSupport,
        is_system_account: isSupport || !!partner.is_system_account,
      },
      conversationId: isSupport ? supportConv : peerConv,
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

    const isSupport = isCrestarPartner(partner);
    const conversationId = isSupport ? `support_${me}` : getConversationId(me, toId);

    const result = await sql(
      `INSERT INTO messages (conversation_id, sender_user_id, receiver_user_id, message_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [conversationId, me, toId, message.trim()],
    );

    const newMessage = result[0];

    try {
      if (!isSupport) {
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
              <p style="color:#ddd;line-height:1.6;">Open your Crestar inbox to reply.</p>
            </div>`,
          });
        } else {
          await createNotification(notificationPayload);
        }
      }
    } catch (notifyErr) {
      console.error('Message notification failed:', notifyErr);
    }

    return Response.json({ success: true, message: newMessage, conversationId });
  } catch (error) {
    console.error('Send message error:', error);
    return Response.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
