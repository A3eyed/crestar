// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

function classify(text) {
  const value = String(text || "").toLowerCase();
  if (
    value.includes("report") ||
    value.includes("inappropriate") ||
    value.includes("violation")
  ) {
    return { type: "report", priority: "high" };
  }
  if (
    value.includes("dispute") ||
    value.includes("refund") ||
    value.includes("order")
  ) {
    return { type: "dispute", priority: "high" };
  }
  return { type: "support", priority: "normal" };
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [admin] = await sql`
    SELECT id, role, username FROM auth_users
    WHERE id = ${session.user.id}
      AND (role IN ('admin', 'owner', 'moderator') OR is_admin = true)
  `;
  return admin || null;
}

/** Resolve all inboxes that should receive platform support messages */
async function supportReceiverIds() {
  const admins = await sql`
    SELECT id FROM auth_users
    WHERE (role IN ('admin', 'owner') OR is_admin = true)
       OR lower(username) IN ('abdallah', 'support')
  `;
  const ids = admins.map((a) => a.id);
  // Legacy string receivers used by older clients
  ids.push("admin", "Crestar", "support");
  return [...new Set(ids)];
}

export async function GET(request) {
  try {
    const admin = await requireAdmin();
    if (!admin)
      return Response.json({ error: "Admin access required" }, { status: 403 });

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "all";
    const type = url.searchParams.get("type") || "all";
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50", 10) || 50,
      100
    );

    const receivers = await supportReceiverIds();

    const messages = await sql`
      SELECT m.id, m.sender_user_id, m.receiver_user_id, m.message_text, m.is_read, m.created_at,
             u.username AS sender_username, u.email AS sender_email, u.name AS sender_name
      FROM messages m
      LEFT JOIN auth_users u ON m.sender_user_id = u.id::text OR m.sender_user_id = u.id
      WHERE m.receiver_user_id = ANY(${receivers})
        AND (${status}::text = 'all' OR m.is_read = false)
      ORDER BY m.created_at DESC
      LIMIT ${limit}
    `;

    const processed = messages
      .map((msg) => ({ ...msg, ...classify(msg.message_text) }))
      .filter((msg) => type === "all" || msg.type === type);

    const [stats] = await sql`
      SELECT COUNT(*) AS total_messages,
             COUNT(*) FILTER (WHERE is_read = false) AS unread_count,
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS recent_count
      FROM messages
      WHERE receiver_user_id = ANY(${receivers})
    `;

    return Response.json({
      success: true,
      messages: processed,
      supportChannel: "whatsapp:+233543799308",
      stats: {
        total: parseInt(stats?.total_messages || 0, 10),
        unread: parseInt(stats?.unread_count || 0, 10),
        recent: parseInt(stats?.recent_count || 0, 10),
      },
    });
  } catch (error) {
    console.error("Admin support inbox error:", error);
    return Response.json(
      { error: "Failed to fetch support messages" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin();
    if (!admin)
      return Response.json({ error: "Admin access required" }, { status: 403 });
    const { messageId, action, replyText } = await request.json();

    if (action === "mark_read" && messageId) {
      await sql`UPDATE messages SET is_read = true WHERE id = ${messageId}`;
      return Response.json({ success: true });
    }

    if (action === "reply" && messageId && replyText) {
      const [original] =
        await sql`SELECT sender_user_id FROM messages WHERE id = ${messageId}`;
      if (!original)
        return Response.json(
          { error: "Original message not found" },
          { status: 404 }
        );
      await sql`
        INSERT INTO messages (conversation_id, sender_user_id, receiver_user_id, message_text, is_read, created_at)
        VALUES (
          ${"admin_support_" + original.sender_user_id},
          ${admin.id},
          ${original.sender_user_id},
          ${replyText},
          false,
          NOW()
        )
      `;
      await sql`UPDATE messages SET is_read = true WHERE id = ${messageId}`;
      return Response.json({
        success: true,
        message:
          "Reply sent in the app. User support also reaches WhatsApp +233543799308.",
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin support inbox POST error:", error);
    return Response.json(
      { error: "Failed to process support action" },
      { status: 500 }
    );
  }
}
