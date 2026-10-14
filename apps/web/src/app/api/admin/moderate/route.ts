// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

/**
 * POST /api/admin/moderate
 *
 * Unified moderation endpoint. Actions:
 *   - warn                 { userId, reason }
 *   - suspend              { userId, reason, days? }   // days omitted = permanent
 *   - unsuspend            { userId }
 *   - revoke_monetization  { userId, reason? }
 *   - restore_monetization { userId }
 *   - grant_verification   { userId }
 *   - revoke_verification  { userId }
 *   - broadcast            { title, body, target?: "all" | "sellers" | "buyers" }
 *   - set_role             { userId, role }            // owner-only for admin/owner
 *
 * All actions are logged to admin_logs.
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = session.user.id;

    const [admin] = await sql`
      SELECT id, role, username
      FROM auth_users
      WHERE id = ${adminId}
        AND (role IN ('admin', 'owner', 'moderator') OR is_admin = true)
    `;

    if (!admin) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { action, userId: targetId, reason, days, title, body: messageBody, target = "all", role: newRole } = body;

    if (!action) {
      return Response.json({ error: "action is required" }, { status: 400 });
    }

    // ── Broadcast (no target user) ──────────────────────────────────────────
    if (action === "broadcast") {
      if (!title || !messageBody) {
        return Response.json({ error: "title and body are required for broadcast" }, { status: 400 });
      }

      const [notif] = await sql`
        INSERT INTO notifications (
          user_id,
          type,
          title,
          body,
          data,
          created_at
        ) VALUES (
          NULL,
          'broadcast',
          ${title},
          ${messageBody},
          ${JSON.stringify({ target, sent_by: admin.username || adminId })},
          NOW()
        )
        RETURNING id
      `;

      if (target === "sellers") {
        await sql`
          INSERT INTO notifications (user_id, type, title, body, data, created_at)
          SELECT DISTINCT bc.owner_id, 'broadcast', ${title}, ${messageBody},
                 ${JSON.stringify({ target, sent_by: admin.username || adminId })}, NOW()
          FROM business_centers bc
          WHERE bc.status = 'approved' AND bc.owner_id IS NOT NULL
        `;
      }

      await logAction(adminId, "broadcast", null, {
        title,
        body: messageBody,
        target,
        notification_id: notif?.id,
      });

      return Response.json({ success: true, message: "Broadcast sent", notificationId: notif?.id });
    }

    if (!targetId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const [targetUser] = await sql`
      SELECT id, username, email, role, is_verified, is_admin,
             COALESCE(account_status, 'active') AS account_status,
             COALESCE(account_warning, 0) AS account_warning,
             COALESCE(monetization_revoked, false) AS monetization_revoked,
             suspended_until, suspended_reason
      FROM auth_users
      WHERE id = ${targetId}
    `;

    if (!targetUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "owner" && admin.role !== "owner") {
      return Response.json({ error: "Only the owner can moderate the owner account" }, { status: 403 });
    }

    let result = {};

    switch (action) {
      case "warn": {
        const newCount = (targetUser.account_warning || 0) + 1;
        await sql`
          UPDATE auth_users
          SET account_warning = ${newCount},
              updated_at = NOW()
          WHERE id = ${targetId}
        `;
        await sql`
          INSERT INTO notifications (user_id, type, title, body, data, created_at)
          VALUES (
            ${targetId},
            'warning',
            'Account Warning',
            ${reason || "You have received a warning from Crestar moderation."},
            ${JSON.stringify({ warning_count: newCount, admin: admin.username })},
            NOW()
          )
        `;
        result = { account_warning: newCount };
        await logAction(adminId, "warn", targetId, { reason, warning_count: newCount, username: targetUser.username });
        break;
      }

      case "suspend": {
        const until = days && Number(days) > 0
          ? new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000).toISOString()
          : null;
        await sql`
          UPDATE auth_users
          SET account_status = 'suspended',
              suspended_until = ${until},
              suspended_reason = ${reason || "Suspended by admin"},
              updated_at = NOW()
          WHERE id = ${targetId}
        `;
        await sql`
          INSERT INTO notifications (user_id, type, title, body, data, created_at)
          VALUES (
            ${targetId},
            'suspension',
            'Account Suspended',
            ${reason || "Your account has been suspended."},
            ${JSON.stringify({ until, admin: admin.username })},
            NOW()
          )
        `;
        result = { account_status: "suspended", suspended_until: until };
        await logAction(adminId, "suspend", targetId, { reason, days, until, username: targetUser.username });
        break;
      }

      case "unsuspend": {
        await sql`
          UPDATE auth_users
          SET account_status = 'active',
              suspended_until = NULL,
              suspended_reason = NULL,
              updated_at = NOW()
          WHERE id = ${targetId}
        `;
        await sql`
          INSERT INTO notifications (user_id, type, title, body, data, created_at)
          VALUES (
            ${targetId},
            'unsuspension',
            'Account Restored',
            'Your account suspension has been lifted.',
            ${JSON.stringify({ admin: admin.username })},
            NOW()
          )
        `;
        result = { account_status: "active" };
        await logAction(adminId, "unsuspend", targetId, { username: targetUser.username });
        break;
      }

      case "revoke_monetization": {
        await sql`
          UPDATE auth_users
          SET monetization_revoked = true,
              updated_at = NOW()
          WHERE id = ${targetId}
        `;
        try {
          await sql`
            UPDATE business_centers
            SET status = 'suspended'
            WHERE owner_id = ${targetId} AND status = 'approved'
          `;
        } catch (_) {}
        await sql`
          INSERT INTO notifications (user_id, type, title, body, data, created_at)
          VALUES (
            ${targetId},
            'monetization_revoked',
            'Monetization Access Revoked',
            ${reason || "Your ability to sell or earn on Crestar has been revoked."},
            ${JSON.stringify({ admin: admin.username })},
            NOW()
          )
        `;
        result = { monetization_revoked: true };
        await logAction(adminId, "revoke_monetization", targetId, { reason, username: targetUser.username });
        break;
      }

      case "restore_monetization": {
        await sql`
          UPDATE auth_users
          SET monetization_revoked = false,
              updated_at = NOW()
          WHERE id = ${targetId}
        `;
        result = { monetization_revoked: false };
        await logAction(adminId, "restore_monetization", targetId, { username: targetUser.username });
        break;
      }

      case "grant_verification": {
        await sql`
          UPDATE auth_users
          SET is_verified = true,
              updated_at = NOW()
          WHERE id = ${targetId}
        `;
        try {
          await sql`UPDATE "user" SET is_verified = true WHERE id = ${targetId}`;
        } catch (_) {}
        result = { is_verified: true };
        await logAction(adminId, "grant_verification", targetId, { username: targetUser.username });
        break;
      }

      case "revoke_verification": {
        await sql`
          UPDATE auth_users
          SET is_verified = false,
              updated_at = NOW()
          WHERE id = ${targetId}
        `;
        try {
          await sql`UPDATE "user" SET is_verified = false WHERE id = ${targetId}`;
        } catch (_) {}
        result = { is_verified: false };
        await logAction(adminId, "revoke_verification", targetId, { username: targetUser.username });
        break;
      }

      case "set_role": {
        if (!["user", "moderator", "admin", "owner"].includes(newRole)) {
          return Response.json({ error: "Invalid role" }, { status: 400 });
        }
        if (newRole === "owner" || newRole === "admin") {
          if (admin.role !== "owner") {
            return Response.json({ error: "Only the owner can assign admin/owner roles" }, { status: 403 });
          }
        }
        await sql`
          UPDATE auth_users
          SET role = ${newRole},
              is_admin = ${newRole === "admin" || newRole === "owner"},
              updated_at = NOW()
          WHERE id = ${targetId}
        `;
        result = { role: newRole };
        await logAction(adminId, "set_role", targetId, {
          previous_role: targetUser.role,
          new_role: newRole,
          username: targetUser.username,
        });
        break;
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return Response.json({
      success: true,
      action,
      userId: targetId,
      username: targetUser.username,
      ...result,
    });
  } catch (error) {
    console.error("Admin moderate error:", error);
    return Response.json({ error: "Moderation action failed", details: String(error?.message || error) }, { status: 500 });
  }
}

async function logAction(adminId, actionType, targetUserId, details) {
  try {
    await sql`
      INSERT INTO admin_logs (admin_id, action_type, target_user_id, target_entity_type, details, created_at)
      VALUES (
        ${adminId},
        ${actionType},
        ${targetUserId},
        'user',
        ${JSON.stringify(details || {})},
        NOW()
      )
    `;
  } catch (e) {
    console.error("Failed to write admin_logs:", e);
  }
}

/**
 * GET /api/admin/moderate?q=...&limit=20
 * Search users with moderation-relevant fields.
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = session.user.id;
    const [admin] = await sql`
      SELECT id FROM auth_users
      WHERE id = ${adminId}
        AND (role IN ('admin', 'owner', 'moderator') OR is_admin = true)
    `;
    if (!admin) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "30", 10), 100);
    const statusFilter = url.searchParams.get("status");

    let users;
    if (q) {
      users = await sql`
        SELECT
          id, username, email, name, role,
          is_verified, is_admin,
          COALESCE(account_status, 'active') AS account_status,
          COALESCE(account_warning, 0) AS account_warning,
          COALESCE(monetization_revoked, false) AS monetization_revoked,
          suspended_until, suspended_reason,
          created_at, profile_image
        FROM auth_users
        WHERE
          username ILIKE ${"%" + q + "%"}
          OR email ILIKE ${"%" + q + "%"}
          OR name ILIKE ${"%" + q + "%"}
          OR id = ${q}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else if (statusFilter === "suspended") {
      users = await sql`
        SELECT
          id, username, email, name, role,
          is_verified, is_admin,
          COALESCE(account_status, 'active') AS account_status,
          COALESCE(account_warning, 0) AS account_warning,
          COALESCE(monetization_revoked, false) AS monetization_revoked,
          suspended_until, suspended_reason,
          created_at, profile_image
        FROM auth_users
        WHERE COALESCE(account_status, 'active') = 'suspended'
        ORDER BY updated_at DESC NULLS LAST
        LIMIT ${limit}
      `;
    } else if (statusFilter === "warned") {
      users = await sql`
        SELECT
          id, username, email, name, role,
          is_verified, is_admin,
          COALESCE(account_status, 'active') AS account_status,
          COALESCE(account_warning, 0) AS account_warning,
          COALESCE(monetization_revoked, false) AS monetization_revoked,
          suspended_until, suspended_reason,
          created_at, profile_image
        FROM auth_users
        WHERE COALESCE(account_warning, 0) > 0
        ORDER BY account_warning DESC
        LIMIT ${limit}
      `;
    } else {
      users = await sql`
        SELECT
          id, username, email, name, role,
          is_verified, is_admin,
          COALESCE(account_status, 'active') AS account_status,
          COALESCE(account_warning, 0) AS account_warning,
          COALESCE(monetization_revoked, false) AS monetization_revoked,
          suspended_until, suspended_reason,
          created_at, profile_image
        FROM auth_users
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }

    return Response.json({ success: true, users });
  } catch (error) {
    console.error("Admin moderate GET error:", error);
    return Response.json({ error: "Failed to search users" }, { status: 500 });
  }
}
