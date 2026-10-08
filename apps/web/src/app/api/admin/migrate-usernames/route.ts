// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

/**
 * POST /api/admin/migrate-usernames
 * One-time migration to populate usernames for existing users
 *
 * This endpoint:
 * 1. Finds all users without a username
 * 2. Generates username from their email prefix
 * 3. Handles collisions by appending random suffix
 * 4. Updates the database
 *
 * Only accessible to admin/owner accounts
 */

function sanitizeUsername(raw) {
  if (!raw || typeof raw !== "string") return null;
  let cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (cleaned.length < 3) return null;
  if (cleaned.length > 30) cleaned = cleaned.slice(0, 30);
  return cleaned;
}

export async function POST(request) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role || "user";
    if (userRole !== "admin" && userRole !== "owner") {
      return Response.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Find all users without a username
    const usersWithoutUsername = await sql`
      SELECT id, email, name
      FROM auth_users
      WHERE username IS NULL OR username = ''
      ORDER BY id
    `;

    if (usersWithoutUsername.length === 0) {
      return Response.json({
        success: true,
        message: "All users already have usernames",
        updated: 0,
      });
    }

    console.log(
      `[migrate-usernames] Found ${usersWithoutUsername.length} users without usernames`,
    );

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each user
    for (const user of usersWithoutUsername) {
      try {
        // Generate base username from email
        let baseUsername = null;
        if (user.email) {
          const emailPrefix = user.email.split("@")[0];
          baseUsername = sanitizeUsername(emailPrefix);
        }

        // Fallback if email is invalid
        if (!baseUsername) {
          baseUsername = `user${user.id}`;
        }

        // Find available username (handle collisions)
        let candidate = baseUsername;
        let attempt = 0;
        const MAX_ATTEMPTS = 10;

        while (attempt < MAX_ATTEMPTS) {
          const existing = await sql`
            SELECT id FROM auth_users
            WHERE LOWER(username) = LOWER(${candidate}) AND id != ${user.id}
            LIMIT 1
          `;

          if (existing.length === 0) break; // Available!

          // Append random suffix
          const suffix = Math.floor(1000 + Math.random() * 9000);
          candidate = `${baseUsername}_${suffix}`.slice(0, 30);
          attempt++;
        }

        if (attempt >= MAX_ATTEMPTS) {
          console.error(
            `[migrate-usernames] Could not find username for user ${user.id}`,
          );
          errorCount++;
          results.push({
            userId: user.id,
            email: user.email,
            success: false,
            error: "Could not find available username",
          });
          continue;
        }

        // Update user with new username
        await sql`
          UPDATE auth_users
          SET
            username = ${candidate},
            name = COALESCE(NULLIF(TRIM(name), ''), ${candidate}),
            display_name = COALESCE(NULLIF(TRIM(display_name), ''), ${candidate}),
            username_last_changed = NOW()
          WHERE id = ${user.id}
        `;

        successCount++;
        results.push({
          userId: user.id,
          email: user.email,
          username: candidate,
          success: true,
        });

        console.log(
          `[migrate-usernames] ✅ Set username @${candidate} for user ${user.id}`,
        );
      } catch (err) {
        console.error(
          `[migrate-usernames] Error processing user ${user.id}:`,
          err,
        );
        errorCount++;
        results.push({
          userId: user.id,
          email: user.email,
          success: false,
          error: err.message,
        });
      }
    }

    return Response.json({
      success: true,
      message: `Migration complete: ${successCount} users updated, ${errorCount} errors`,
      totalProcessed: usersWithoutUsername.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error("[migrate-usernames] Error:", error);
    return Response.json(
      { error: "Migration failed", detail: error.message },
      { status: 500 },
    );
  }
}
