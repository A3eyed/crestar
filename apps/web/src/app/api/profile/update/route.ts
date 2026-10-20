// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId, getSession } from '@/app/api/utils/auth';
import { ensureAppUser } from '@/app/api/utils/ensureAppUser';
import { ensureCoreSchema } from '@/app/api/utils/ensureSchema';

export async function POST(request) {
  try {
    await ensureCoreSchema();

    const body = await request.json();
    const displayName =
      body.displayName != null ? String(body.displayName).trim() : undefined;
    const bio = body.bio != null ? String(body.bio).trim() : undefined;
    const profileImage =
      body.profileImage != null ? String(body.profileImage).trim() : undefined;
    const email = body.email != null ? String(body.email).trim() : undefined;
    const phone = body.phone != null ? String(body.phone).trim() : undefined;

    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized — please sign in again' }, { status: 401 });
    }

    const session = await getSession(request);
    await ensureAppUser(userId, {
      email: session?.user?.email,
      name: session?.user?.name,
      image: session?.user?.image,
    });

    if (displayName !== undefined && displayName.length > 30) {
      return Response.json(
        { error: 'Display name must be 30 characters or less' },
        { status: 400 },
      );
    }

    if (bio !== undefined && bio.length > 80) {
      return Response.json({ error: 'Bio must be 80 characters or less' }, { status: 400 });
    }

    if (email !== undefined && email && !email.includes('@')) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (phone !== undefined && phone && phone.length < 10) {
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

    // Explicit field updates (avoid CASE + null param edge cases)
    const [current] = await sql`
      SELECT id, username, email, display_name, bio, profile_image, name, phone, is_verified, role
      FROM auth_users WHERE id = ${userId}
    `;
    if (!current) {
      return Response.json({ error: 'Profile row not found' }, { status: 404 });
    }

    const nextDisplayName = displayName !== undefined ? displayName : current.display_name;
    const nextName = displayName !== undefined ? displayName : current.name;
    const nextBio = bio !== undefined ? bio : current.bio;
    const nextImage = profileImage !== undefined ? profileImage || null : current.profile_image;
    const nextEmail = email !== undefined ? email : current.email;
    const nextPhone = phone !== undefined ? phone : current.phone;

    const [updatedUser] = await sql`
      UPDATE auth_users
      SET
        display_name = ${nextDisplayName},
        name = ${nextName},
        bio = ${nextBio},
        profile_image = ${nextImage},
        email = ${nextEmail},
        phone = ${nextPhone},
        updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id, username, email, display_name, bio, profile_image, name, phone, is_verified, role
    `;

    // Best-effort sync name/image into Neon Auth user (session avatar)
    try {
      if (nextDisplayName || nextImage) {
        await sql`
          UPDATE neon_auth."user"
          SET
            name = COALESCE(${nextDisplayName}, name),
            image = COALESCE(${nextImage}, image),
            "updatedAt" = NOW()
          WHERE id = ${userId}
        `;
      }
    } catch {
      try {
        if (nextDisplayName || nextImage) {
          await sql`
            UPDATE neon_auth.user
            SET
              name = COALESCE(${nextDisplayName}, name),
              image = COALESCE(${nextImage}, image),
              "updatedAt" = NOW()
            WHERE id = ${userId}
          `;
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
    await ensureCoreSchema();

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
