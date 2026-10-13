// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId, getSession } from '@/app/api/utils/auth';
import { ensureAppUser } from '@/app/api/utils/ensureAppUser';

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

    const session = await getSession(request);
    await ensureAppUser(userId, {
      email: session?.user?.email,
      name: session?.user?.name,
      image: session?.user?.image,
    });

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
      return Response.json({ error: 'Profile row not found' }, { status: 404 });
    }

    // Best-effort sync to Neon Auth name/image (public API preferred later)
    try {
      if (displayName) {
        await sql`UPDATE neon_auth."user" SET name = ${displayName}, "updatedAt" = NOW() WHERE id = ${userId}`;
      }
    } catch {
      try {
        if (displayName) {
          await sql`UPDATE neon_auth.user SET name = ${displayName}, "updatedAt" = NOW() WHERE id = ${userId}`;
        }
      } catch {
        /* ignore */
      }
    }

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

    const session = await getSession(request);
    await ensureAppUser(userId, {
      email: session?.user?.email,
      name: session?.user?.name,
      image: session?.user?.image,
    });

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
      /* optional */
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
