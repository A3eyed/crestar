// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

/**
 * Ensure the user has a profile row in auth_users.
 * Neon/Better Auth users land in "user"; Crestar profile lives in auth_users.
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

export async function POST(request) {
  try {
    const { displayName, bio, profileImage, email, phone } = await request.json();

    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureProfileRow(userId);

    if (displayName && displayName.length > 30) {
      return Response.json(
        { error: 'Display name must be 30 characters or less' },
        { status: 400 }
      );
    }

    if (bio && bio.length > 80) {
      return Response.json({ error: 'Bio must be 80 characters or less' }, { status: 400 });
    }

    if (email && !email.includes('@')) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (phone && phone.length < 10) {
      return Response.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    if (email) {
      const [existingUser] = await sql`
        SELECT id FROM auth_users
        WHERE email = ${email} AND id != ${userId}
      `;
      if (existingUser) {
        return Response.json({ error: 'Email already taken' }, { status: 400 });
      }
    }

    const [updatedUser] = await sql`
      UPDATE auth_users
      SET
        display_name = COALESCE(${displayName ?? null}, display_name),
        bio = COALESCE(${bio ?? null}, bio),
        profile_image = COALESCE(${profileImage ?? null}, profile_image),
        name = COALESCE(${displayName ?? null}, name),
        email = COALESCE(${email ?? null}, email),
        phone = COALESCE(${phone ?? null}, phone),
        updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id, username, email, display_name, bio, profile_image, name, phone, is_verified, role
    `;

    // Keep Better Auth / Neon "user" in sync so session surfaces show new name/photo
    await sql`
      UPDATE "user"
      SET
        name = COALESCE(${displayName ?? null}, name),
        display_name = COALESCE(${displayName ?? null}, display_name),
        image = COALESCE(${profileImage ?? null}, image),
        profile_image = COALESCE(${profileImage ?? null}, profile_image),
        email = COALESCE(${email ?? null}, email),
        "updatedAt" = NOW()
      WHERE id = ${userId}
    `;

    return Response.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return Response.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureProfileRow(userId);

    const [user] = await sql`
      SELECT
        id,
        username,
        email,
        display_name,
        bio,
        profile_image,
        name,
        username_last_changed,
        username_change_count,
        phone,
        role,
        is_verified
      FROM auth_users
      WHERE id = ${userId}
    `;

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Follower counts (best-effort)
    let followers_count = 0;
    let following_count = 0;
    try {
      const [fc] = await sql`
        SELECT
          (SELECT COUNT(*)::int FROM follows WHERE following_id = ${userId}) AS followers,
          (SELECT COUNT(*)::int FROM follows WHERE follower_id = ${userId}) AS following
      `;
      followers_count = fc?.followers ?? 0;
      following_count = fc?.following ?? 0;
    } catch {
      // follows table may not exist yet
    }

    let canChangeUsernameIn = 0;
    if (user?.username_last_changed) {
      const daysSinceLastChange = Math.floor(
        (Date.now() - new Date(user.username_last_changed).getTime()) / (1000 * 60 * 60 * 24)
      );
      canChangeUsernameIn = Math.max(0, 30 - daysSinceLastChange);
    }

    return Response.json({
      user: {
        ...user,
        followers_count,
        following_count,
        canChangeUsernameIn,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return Response.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}
