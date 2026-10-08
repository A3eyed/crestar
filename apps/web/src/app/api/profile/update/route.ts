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

export async function POST(request) {
  try {
    const { displayName, bio, profileImage, email, phone } = await request.json();

    // Get authenticated user (supports both web and mobile)
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-provision profile row for better-auth users
    await ensureProfileRow(userId);

    // Validate inputs
    if (displayName && displayName.length > 30) {
      return Response.json(
        { error: 'Display name must be 30 characters or less' },
        { status: 400 }
      );
    }

    if (bio && bio.length > 80) {
      return Response.json({ error: 'Bio must be 80 characters or less' }, { status: 400 });
    }

    // Validate email if provided
    if (email && !email.includes('@')) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate phone if provided
    if (phone && phone.length < 10) {
      return Response.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Check if email is already taken by another user
    if (email) {
      const [existingUser] = await sql`
        SELECT id FROM auth_users 
        WHERE email = ${email} AND id != ${userId}
      `;
      if (existingUser) {
        return Response.json({ error: 'Email already taken' }, { status: 400 });
      }
    }

    // Update profile - only update fields that are provided
    const [updatedUser] = await sql`
      UPDATE auth_users 
      SET 
        display_name = COALESCE(${displayName}, display_name),
        bio = COALESCE(${bio}, bio),
        profile_image = COALESCE(${profileImage}, profile_image),
        name = COALESCE(${displayName}, name),
        email = COALESCE(${email}, email),
        phone = COALESCE(${phone}, phone)
      WHERE id = ${userId}
      RETURNING id, username, email, display_name, bio, profile_image, name, phone
    `;

    return Response.json({
      success: true,
      user: updatedUser,
      message: email
        ? 'Profile and email updated successfully'
        : phone
          ? 'Profile and phone updated successfully'
          : 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return Response.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    // FIXED: Use the same resolveUserId function to support both web and mobile
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-provision profile row for better-auth users
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

    // Calculate days until can change username
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
        followers_count: 0,
        following_count: 0,
        canChangeUsernameIn,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return Response.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}
