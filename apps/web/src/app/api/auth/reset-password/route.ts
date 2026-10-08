// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { hashPassword } from '@/app/api/utils/password';

export async function POST(request) {
  try {
    const body = await request.json();
    const { token, email, password } = body;

    console.log('[reset-password] 🔐 Request received for:', email);

    if (!token || !email || !password) {
      console.error('[reset-password] ❌ Missing required fields');
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      console.error('[reset-password] ❌ Password too short');
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Verify token
    const [verificationToken] = await sql`
      SELECT * FROM verification
      WHERE identifier = ${email} AND value = ${token}
      AND "expiresAt" > NOW()
    `;

    if (!verificationToken) {
      console.error('[reset-password] ❌ Invalid or expired token');
      return Response.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    console.log('[reset-password] ✅ Token verified');

    // Get user
    const [user] = await sql`
      SELECT id FROM "user" WHERE email = ${email}
    `;

    if (!user) {
      console.error('[reset-password] ❌ User not found');
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[reset-password] ✅ User found:', user.id);

    // Hash new password in Better Auth's format so signIn.email can verify it
    const hashedPassword = await hashPassword(password);

    // Update password in account table
    const updateResult = await sql`
      UPDATE account
      SET password = ${hashedPassword},
          "updatedAt" = NOW()
      WHERE "userId" = ${user.id}
      AND "providerId" = 'credential'
      RETURNING id
    `;

    if (updateResult.length === 0) {
      console.error('[reset-password] ⚠️ No credentials account found for user');
      // This can happen if the user signed up with OAuth only
      return Response.json(
        { error: 'Cannot reset password for this account type' },
        { status: 400 }
      );
    }

    console.log('[reset-password] ✅ Password updated');

    // Delete used token
    await sql`
      DELETE FROM verification
      WHERE identifier = ${email} AND value = ${token}
    `;

    console.log('[reset-password] ✅ Token deleted, reset complete');

    return Response.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('[reset-password] ❌ Error:', error);
    return Response.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
