// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { hashPassword } from '@/app/api/utils/password';
import {
  assertLoginAllowed,
  guardDeniedResponse,
  recordAuthSuccess,
} from '@/app/api/utils/loginProtection';

export async function POST(request) {
  try {
    const body = await request.json();
    const { token, email, password } = body;

    const allowed = await assertLoginAllowed(request, {
      email,
      pathParts: ['reset-password'],
    });
    if (!allowed.ok) return guardDeniedResponse(allowed);

    console.log('[reset-password] Request received for:', email);

    if (!token || !email || !password) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const [verificationToken] = await sql`
      SELECT * FROM verification
      WHERE identifier = ${normalizedEmail} AND value = ${token}
      AND "expiresAt" > NOW()
    `;

    if (!verificationToken) {
      return Response.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    // Resolve user across auth stores
    let userId = null;
    try {
      const [u] = await sql`SELECT id FROM "user" WHERE LOWER(email) = ${normalizedEmail} LIMIT 1`;
      if (u) userId = u.id;
    } catch {}
    if (!userId) {
      try {
        const [u] = await sql`SELECT id FROM neon_auth."user" WHERE LOWER(email) = ${normalizedEmail} LIMIT 1`;
        if (u) userId = u.id;
      } catch {}
    }
    if (!userId) {
      try {
        const [u] = await sql`SELECT id FROM auth_users WHERE LOWER(email) = ${normalizedEmail} LIMIT 1`;
        if (u) userId = u.id;
      } catch {}
    }

    if (!userId) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const hashedPassword = await hashPassword(password);

    const updateResult = await sql`
      UPDATE account
      SET password = ${hashedPassword},
          "updatedAt" = NOW()
      WHERE "userId" = ${userId}
      AND "providerId" = 'credential'
      RETURNING id
    `;

    if (updateResult.length === 0) {
      return Response.json(
        { error: 'Cannot reset password for this account type' },
        { status: 400 },
      );
    }

    await sql`
      DELETE FROM verification
      WHERE identifier = ${normalizedEmail} AND value = ${token}
    `;

    // Password reset succeeds — clear any soft lockout so they can sign in
    await recordAuthSuccess(normalizedEmail);

    return Response.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('[reset-password] Error:', error);
    return Response.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
