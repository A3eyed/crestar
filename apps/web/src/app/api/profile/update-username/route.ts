// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

/**
 * Ensure the user has a profile row in auth_users.
 * Users created via better-auth only get a row in the "user" table,
 * so we auto-provision their auth_users profile row on first access.
 */
async function ensureProfileRow(userId) {
  await sql`
    INSERT INTO auth_users (id, email, name, username, display_name, profile_image)
    SELECT
      u.id,
      u.email,
      u.name,
      LOWER(REGEXP_REPLACE(COALESCE(u.username, split_part(u.email, '@', 1)), '[^a-zA-Z0-9._]', '', 'g')),
      COALESCE(u.display_name, u.name),
      COALESCE(u.profile_image, u.image)
    FROM "user" u
    WHERE u.id = ${userId}
      AND NOT EXISTS (SELECT 1 FROM auth_users a WHERE a.id = u.id)
  `;
}

/**
 * POST /api/profile/update-username
 *
 * Allows users to manually change their username from the default email-based username.
 * By default, usernames are auto-generated from email prefix during signup.
 * This endpoint tracks username changes and enforces a 30-day cooldown between changes.
 */
export async function POST(request) {
  try {
    const { username } = await request.json();

    // Get authenticated user (supports both web and mobile)
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-provision profile row for better-auth users
    await ensureProfileRow(userId);

    // Validate username format (TikTok-style: alphanumeric, underscore, dot, 2-24 chars)
    const usernameRegex = /^[a-zA-Z0-9_.]{2,24}$/;
    if (!usernameRegex.test(username)) {
      return Response.json(
        {
          error:
            'Username must be 2-24 characters and contain only letters, numbers, underscore, or period',
        },
        { status: 400 }
      );
    }

    // Check if username is already taken
    const [existing] = await sql`
      SELECT id FROM auth_users 
      WHERE LOWER(username) = LOWER(${username}) 
      AND id != ${userId}
    `;

    if (existing) {
      return Response.json({ error: 'Username already taken' }, { status: 400 });
    }

    // Check username change cooldown (90 days as requested)
    const [currentUser] = await sql`
      SELECT username_last_changed, username_change_count 
      FROM auth_users 
      WHERE id = ${userId}
    `;

    if (currentUser?.username_last_changed) {
      const daysSinceLastChange = Math.floor(
        (Date.now() - new Date(currentUser.username_last_changed).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastChange < 30) {
        return Response.json(
          {
            error: `You can change your username again in ${30 - daysSinceLastChange} days`,
          },
          { status: 400 }
        );
      }
    }

    // Update username
    const [updatedUser] = await sql`
      UPDATE auth_users 
      SET 
        username = ${username},
        username_last_changed = NOW(),
        username_change_count = COALESCE(username_change_count, 0) + 1
      WHERE id = ${userId}
      RETURNING id, username, email, display_name, bio, profile_image
    `;

    // Keep the better-auth "user" table in sync so every surface shows the new username
    await sql`
      UPDATE "user" SET username = ${username} WHERE id = ${userId}
    `;

    return Response.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update username error:', error);
    return Response.json({ error: 'Failed to update username' }, { status: 500 });
  }
}
