// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

/**
 * Provision Crestar profile row from Neon Auth "user".
 * Only touches columns that exist on a stock Better Auth user table
 * (id, email, name, image) — extra Crestar columns on "user" are optional.
 */
async function ensureProfileRow(userId) {
  // Prefer a full insert from "user"; fall back if optional columns missing
  try {
    await sql`
      INSERT INTO auth_users (id, email, name, username, display_name, profile_image)
      SELECT
        u.id,
        u.email,
        u.name,
        LOWER(
          REGEXP_REPLACE(
            COALESCE(NULLIF(u.username, ''), split_part(u.email, '@', 1)),
            '[^a-zA-Z0-9._]',
            '',
            'g'
          )
        ),
        COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)),
        u.image
      FROM "user" u
      WHERE u.id = ${userId}
        AND NOT EXISTS (SELECT 1 FROM auth_users a WHERE a.id = u.id)
    `;
    return;
  } catch (e) {
    console.warn('[profile] ensureProfileRow primary insert failed, trying minimal:', e?.message);
  }

  try {
    await sql`
      INSERT INTO auth_users (id, email, name, username, display_name)
      SELECT
        u.id,
        u.email,
        u.name,
        LOWER(REGEXP_REPLACE(split_part(u.email, '@', 1), '[^a-zA-Z0-9._]', '', 'g')),
        COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1))
      FROM "user" u
      WHERE u.id = ${userId}
        AND NOT EXISTS (SELECT 1 FROM auth_users a WHERE a.id = u.id)
    `;
  } catch (e) {
    console.error('[profile] ensureProfileRow minimal insert failed:', e?.message);
    throw e;
  }
}

async function syncNeonUser(userId, { displayName, profileImage, email }) {
  // Only update columns that always exist on Managed Better Auth "user"
  try {
    if (displayName != null && displayName !== '') {
      await sql`
        UPDATE "user"
        SET name = ${displayName}, "updatedAt" = NOW()
        WHERE id = ${userId}
      `;
    }
  } catch (e) {
    console.warn('[profile] sync name failed:', e?.message);
  }
  try {
    if (profileImage != null && profileImage !== '') {
      await sql`
        UPDATE "user"
        SET image = ${profileImage}, "updatedAt" = NOW()
        WHERE id = ${userId}
      `;
    }
  } catch (e) {
    console.warn('[profile] sync image failed:', e?.message);
  }
  try {
    if (email != null && email !== '') {
      await sql`
        UPDATE "user"
        SET email = ${email}, "updatedAt" = NOW()
        WHERE id = ${userId}
      `;
    }
  } catch (e) {
    console.warn('[profile] sync email failed:', e?.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const displayName =
      body.displayName != null ? String(body.displayName).trim() : null;
    const bio = body.bio != null ? String(body.bio).trim() : null;
    const profileImage =
      body.profileImage != null ? String(body.profileImage).trim() : null;
    const email = body.email != null ? String(body.email).trim() : null;
    const phone = body.phone != null ? String(body.phone).trim() : null;

    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureProfileRow(userId);

    if (displayName && displayName.length > 30) {
      return Response.json(
        { error: 'Display name must be 30 characters or less' },
        { status: 400 },
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

    // Explicit field updates (avoid COALESCE swallowing intentional clears incorrectly)
    const [updatedUser] = await sql`
      UPDATE auth_users
      SET
        display_name = CASE WHEN ${displayName}::text IS NOT NULL THEN ${displayName} ELSE display_name END,
        name = CASE WHEN ${displayName}::text IS NOT NULL THEN ${displayName} ELSE name END,
        bio = CASE WHEN ${bio}::text IS NOT NULL THEN ${bio} ELSE bio END,
        profile_image = CASE WHEN ${profileImage}::text IS NOT NULL THEN ${profileImage} ELSE profile_image END,
        email = CASE WHEN ${email}::text IS NOT NULL THEN ${email} ELSE email END,
        phone = CASE WHEN ${phone}::text IS NOT NULL THEN ${phone} ELSE phone END,
        updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id, username, email, display_name, bio, profile_image, name, phone, is_verified, role
    `;

    if (!updatedUser) {
      return Response.json(
        { error: 'Profile row not found after provision. Please try again.' },
        { status: 404 },
      );
    }

    await syncNeonUser(userId, { displayName, profileImage, email });

    return Response.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return Response.json(
      { error: 'Failed to update profile', detail: String(error?.message || error) },
      { status: 500 },
    );
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
      // follows optional
    }

    let canChangeUsernameIn = 0;
    if (user?.username_last_changed) {
      const daysSinceLastChange = Math.floor(
        (Date.now() - new Date(user.username_last_changed).getTime()) /
          (1000 * 60 * 60 * 24),
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
    return Response.json(
      { error: 'Failed to get profile', detail: String(error?.message || error) },
      { status: 500 },
    );
  }
}
