// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { isSupportAgent, sendSupportMessage, supportConversationId } from '@/app/api/utils/support';

function classify(text) {
  const value = String(text || '').toLowerCase();
  if (
    value.includes('report') ||
    value.includes('inappropriate') ||
    value.includes('violation')
  ) {
    return { type: 'report', priority: 'high' };
  }
  if (
    value.includes('dispute') ||
    value.includes('refund') ||
    value.includes('order')
  ) {
    return { type: 'dispute', priority: 'high' };
  }
  return { type: 'support', priority: 'normal' };
}

async function requireAgent(request) {
  const userId = await resolveUserId(request);
  if (!userId) return null;
  if (!(await isSupportAgent(userId))) {
    // Also allow role-based admins
    const [admin] = await sql`
      SELECT id, role, username FROM auth_users
      WHERE id::text = ${String(userId)}
        AND (role IN ('admin', 'owner', 'moderator') OR is_admin = true)
    `;
    if (!admin) return null;
    return { id: String(admin.id), username: admin.username, role: admin.role };
  }
  const [u] = await sql`SELECT id, role, username FROM auth_users WHERE id::text = ${String(userId)}`;
  return u ? { id: String(u.id), username: u.username, role: u.role } : { id: String(userId) };
}

/**
 * GET  — recent Crestar support threads (conversation_id = support_<userId>)
 * POST — mark_read | reply (as Crestar into the same support_* thread)
 */
export async function GET(request) {
  try {
    const agent = await requireAgent(request);
    if (!agent) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 100);

    // Latest message per support thread
    const messages = await sql`
      SELECT DISTINCT ON (m.conversation_id)
        m.id,
        m.conversation_id,
        m.sender_user_id,
        m.receiver_user_id,
        m.message_text,
        m.is_read,
        m.created_at,
        CASE
          WHEN m.conversation_id LIKE 'support_%'
            THEN REPLACE(m.conversation_id, 'support_', '')
          ELSE CASE
            WHEN m.sender_user_id = ${agent.id} THEN m.receiver_user_id
            ELSE m.sender_user_id
          END
        END AS thread_user_id
      FROM messages m
      WHERE m.conversation_id LIKE 'support_%'
         OR m.conversation_id LIKE 'admin_support_%'
      ORDER BY m.conversation_id, m.created_at DESC
      LIMIT ${limit * 3}
    `;

    // Attach usernames
    const enriched = [];
    for (const msg of messages.slice(0, limit)) {
      const uid = String(msg.thread_user_id || '').trim();
      let username = null;
      let email = null;
      let name = null;
      if (uid) {
        const [u] = await sql`
          SELECT username, email, display_name, name
          FROM auth_users WHERE id::text = ${uid} LIMIT 1
        `;
        username = u?.username || null;
        email = u?.email || null;
        name = u?.display_name || u?.name || null;
      }
      const meta = classify(msg.message_text);
      if (type !== 'all' && meta.type !== type) continue;
      enriched.push({
        ...msg,
        ...meta,
        sender_username: username,
        sender_email: email,
        sender_name: name,
        username,
        userId: uid,
      });
    }

    // Sort by time desc for the UI
    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const [stats] = await sql`
      SELECT
        COUNT(*)::int AS total_messages,
        COUNT(*) FILTER (WHERE is_read = false)::int AS unread_count,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS recent_count
      FROM messages
      WHERE conversation_id LIKE 'support_%'
    `;

    return Response.json({
      success: true,
      messages: enriched,
      inbox: enriched,
      supportChannel: 'whatsapp:+233543799308',
      stats: {
        total: stats?.total_messages || 0,
        unread: stats?.unread_count || 0,
        recent: stats?.recent_count || 0,
      },
    });
  } catch (error) {
    console.error('Admin support inbox error:', error);
    return Response.json({ error: 'Failed to fetch support messages' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const agent = await requireAgent(request);
    if (!agent) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { messageId, action, replyText, userId: targetUserId } = body;

    if (action === 'mark_read' && messageId) {
      await sql`UPDATE messages SET is_read = true WHERE id = ${messageId}`;
      return Response.json({ success: true });
    }

    if (action === 'reply' && replyText) {
      let threadUserId = targetUserId ? String(targetUserId) : null;

      if (!threadUserId && messageId) {
        const [original] = await sql`
          SELECT sender_user_id, receiver_user_id, conversation_id
          FROM messages WHERE id = ${messageId}
        `;
        if (!original) {
          return Response.json({ error: 'Original message not found' }, { status: 404 });
        }
        if (String(original.conversation_id || '').startsWith('support_')) {
          threadUserId = String(original.conversation_id).replace(/^support_/, '');
        } else if (String(original.conversation_id || '').startsWith('admin_support_')) {
          threadUserId = String(original.conversation_id).replace(/^admin_support_/, '');
        } else {
          // Prefer the non-agent participant
          threadUserId =
            String(original.sender_user_id) === agent.id
              ? String(original.receiver_user_id)
              : String(original.sender_user_id);
        }
      }

      if (!threadUserId) {
        return Response.json({ error: 'Could not resolve user for reply' }, { status: 400 });
      }

      // Always reply into support_<userId> as Crestar (not as the admin's personal id)
      const { message } = await sendSupportMessage({
        userId: threadUserId,
        text: String(replyText).trim(),
        direction: 'outbound',
        agentId: agent.id,
      });

      if (messageId) {
        await sql`UPDATE messages SET is_read = true WHERE id = ${messageId}`;
      }

      return Response.json({
        success: true,
        message: 'Reply sent as Crestar Support',
        conversationId: supportConversationId(threadUserId),
        sent: message,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin support inbox POST error:', error);
    return Response.json(
      { error: error.message || 'Failed to process support action' },
      { status: 500 },
    );
  }
}
