// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { hashPassword, verifyPassword } from '@/app/api/utils/password';
import { resolveUserId } from '@/app/api/utils/auth';

export async function POST(request) {
  try {
    const { currentPassword, newPassword } = await request.json();

    // Get authenticated user (supports both web and mobile)
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validation
    if (!currentPassword || !newPassword) {
      return Response.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return Response.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Get current user with password
    const [user] = await sql`
      SELECT au.id, aa.password
      FROM "user" au
      LEFT JOIN account aa ON au.id = aa."userId"
        AND aa."providerId" = 'credential'
      WHERE au.id = ${userId}
    `;

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.password) {
      return Response.json({ error: 'No password set. Please contact support.' }, { status: 400 });
    }

    // Verify current password (handles both Better Auth scrypt and legacy argon2)
    try {
      const isCurrentPasswordValid = await verifyPassword(user.password, currentPassword);
      if (!isCurrentPasswordValid) {
        return Response.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
    } catch (error) {
      console.error('Password verification error:', error);
      return Response.json({ error: 'Error verifying current password' }, { status: 500 });
    }

    // Hash new password in Better Auth's format
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password in account table
    await sql`
      UPDATE account
      SET password = ${hashedNewPassword},
          "updatedAt" = NOW()
      WHERE "userId" = ${userId}
        AND "providerId" = 'credential'
    `;

    return Response.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return Response.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
