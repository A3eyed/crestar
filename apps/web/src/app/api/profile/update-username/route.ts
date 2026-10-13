// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

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
 * TikTok-style: 2–24 chars, letters/numbers/._ , once every 30 days.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    let username = String(body?.username || '')
      .trim()
      .replace(/^@+/, '')
      .toLowerCase();

    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureProfileRow(userId);

    const usernameRegex = /^[a-z0-9_.]{2,24}$/;
    if (!usernameRegex.test(username)) {
      return Response.json(
        {
          error:
            'Username must be 2-24 characters and contain only letters, numbers, underscore, or period',
        },
        { status: 400 }
      );
    }

    const reserved = new Set([
      'admin',
      'crestar',
      'support',
      'help',
      'api',
      'www',
      'account',
      'settings',
      'profile',
      'edit-profile',
      'seller',
      'live',
      'cart',
      'checkout',
    ]);
    if (reserved.has(username)) {
      return Response.json({ error: 'That username is not available' }, { status: 400 });
    }

    const [existing] = await sql`
      SELECT id FROM auth_users
      WHERE LOWER(username) = ${username}
      AND id != ${userId}
    `;

    if (existing) {
      return Response.json({ error: 'Username already taken' }, { status: 400 });
    }

    const [currentUser] = await sql`
      SELECT username, username_last_changed, username_change_count
      FROM auth_users
      WHERE id = ${userId}
    `;

    if (currentUser?.username && currentUser.username.toLowerCase() === username) {
      return Response.json({
        success: true,
        user: currentUser,
        message: 'Username unchanged',
      });
    }

    if (currentUser?.username_last_changed) {
      const daysSinceLastChange = Math.floor(
        (Date.now() - new Date(currentUser.username_last_changed).getTime()) /
          (1000 * 60 * 60 * 24)
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

    const [updatedUser] = await sql`
      UPDATE auth_users
      SET
        username = ${username},
        username_last_changed = NOW(),
        username_change_count = COALESCE(username_change_count, 0) + 1,
        updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id, username, email, display_name, bio, profile_image, name
    `;

    await sql`
      UPDATE "user"
      SET username = ${username}, "updatedAt" = NOW()
      WHERE id = ${userId}
    `;

    return Response.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update username error:', error);
    if (String(error?.message || '').includes('unique') || error?.code === '23505') {
      return Response.json({ error: 'Username already taken' }, { status: 400 });
    }
    return Response.json({ error: 'Failed to update username' }, { status: 500 });
  }
}
