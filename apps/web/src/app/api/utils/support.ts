// @ts-nocheck
import sql from '@/app/api/utils/sql';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SUPPORT ROUTING — everything goes to @Crestar, only two people can answer
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Support messages used to be written with the literal string `'admin'` as the
 * sender/receiver id. No such user exists, so those threads were orphaned: the
 * user saw their message vanish and nobody could reply to it.
 *
 * Every support thread now belongs to the real @Crestar system account, and
 * only @Crestar and @Abdallah are allowed to post into one as support.
 *
 * messages table columns (004_messages_deliverers_live.sql):
 *   conversation_id, sender_user_id, receiver_user_id, message_text, is_read, created_at
 * Do not insert sender_id / receiver_id / content / is_support — they are not in schema.
 */

/** The only handles permitted to answer a support thread. */
export const SUPPORT_AGENT_HANDLES = ['crestar', 'abdallah'];

/** Public WhatsApp support line. */
export const SUPPORT_WHATSAPP_NUMBER = '233543799308';

/**
 * Build the WhatsApp deep link for support / dispute / order-resolution screens.
 */
export function buildWhatsAppLink({ orderNumber, topic = 'Support' } = {}) {
  const lines = [
    `Hello Crestar Support, I need help with ${String(topic).toLowerCase()}.`,
    orderNumber ? `Order ID: ${orderNumber}` : null,
  ].filter(Boolean);

  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
}

/** Resolve the @Crestar system account that owns every support thread. */
export async function getSupportAccount() {
  const [byHandle] = await sql`
    SELECT id, username, display_name, business_name, profile_image
    FROM auth_users
    WHERE LOWER(username) = 'crestar'
    LIMIT 1
  `;
  if (byHandle) return byHandle;

  const [systemAccount] = await sql`
    SELECT id, username, display_name, business_name, profile_image
    FROM auth_users
    WHERE is_system_account = true
    ORDER BY created_at
    LIMIT 1
  `;
  return systemAccount || null;
}

/** Is this user allowed to reply as support? */
export async function isSupportAgent(userId) {
  if (!userId) return false;
  const [user] = await sql`
    SELECT LOWER(username) AS handle, is_admin, role
    FROM auth_users WHERE id = ${String(userId)} LIMIT 1
  `;
  if (!user) return false;
  return SUPPORT_AGENT_HANDLES.includes(user.handle);
}

/** One stable thread per user, always with @Crestar. */
export function supportConversationId(userId) {
  return `support_${String(userId)}`;
}

/**
 * Write a message into a user's support thread.
 *
 * `direction: 'inbound'`  — the user writing to @Crestar
 * `direction: 'outbound'` — @Crestar / @Abdallah replying to the user
 */
export async function sendSupportMessage({ userId, text, direction = 'inbound', agentId = null }) {
  const support = await getSupportAccount();
  if (!support) {
    throw new Error('Support account (@Crestar) is not configured');
  }

  const conversationId = supportConversationId(userId);
  const inbound = direction === 'inbound';

  // Replies are always attributed to @Crestar so the user only ever sees one
  // support identity, no matter which agent typed it.
  const senderId = inbound ? String(userId) : String(support.id);
  const receiverId = inbound ? String(support.id) : String(userId);

  const [row] = await sql`
    INSERT INTO messages (
      conversation_id, sender_user_id, receiver_user_id, message_text, is_read, created_at
    ) VALUES (
      ${conversationId}, ${senderId}, ${receiverId}, ${text}, false, now()
    )
    RETURNING id, conversation_id, sender_user_id, receiver_user_id, message_text, created_at
  `;

  if (!inbound && agentId) {
    try {
      await sql`
        INSERT INTO admin_logs (admin_id, action_type, target_user_id, target_entity_type, details)
        VALUES (${String(agentId)}, 'support_reply', ${String(userId)}, 'support_thread',
                ${JSON.stringify({ conversationId })})
      `;
    } catch (logErr) {
      console.warn('[sendSupportMessage] admin_logs insert skipped:', logErr?.message);
    }
  }

  return { message: row, support };
}

/** Read a user's support thread. */
export async function getSupportThread(userId, limit = 100) {
  const conversationId = supportConversationId(userId);
  return sql`
    SELECT id, conversation_id, sender_user_id, receiver_user_id,
           message_text, is_read, created_at
    FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
}
