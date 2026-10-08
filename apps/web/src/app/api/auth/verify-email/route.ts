// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

// Verify a 6-digit code. POST /api/auth/verify-email  body: { code }
//
// Reads and writes the Better Auth `user` table (the v2 source of truth).
// The `auth_users` projection is kept in sync automatically by the
// trg_sync_user_to_auth_users database trigger.
export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const code = String(body?.code || '').trim();

    if (!code || !/^\d{6}$/.test(code)) {
      return Response.json({ error: 'Invalid code format' }, { status: 400 });
    }

    const [user] = await sql`
      SELECT id, "emailVerified", email_verification_code,
             email_verification_expires, email_verification_attempts
      FROM "user" WHERE id = ${userId}
    `;
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.emailVerified) {
      return Response.json({ success: true, alreadyVerified: true });
    }

    if (!user.email_verification_code) {
      return Response.json(
        { error: 'No verification code on file. Request a new one.' },
        { status: 400 }
      );
    }

    if ((user.email_verification_attempts || 0) >= 5) {
      return Response.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    if (user.email_verification_expires && new Date(user.email_verification_expires) < new Date()) {
      return Response.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
    }

    if (code !== user.email_verification_code) {
      await sql`
        UPDATE "user"
        SET email_verification_attempts = COALESCE(email_verification_attempts, 0) + 1
        WHERE id = ${userId}
      `;
      return Response.json({ error: 'Incorrect code.' }, { status: 400 });
    }

    await sql`
      UPDATE "user"
      SET "emailVerified" = TRUE,
          email_verification_code = NULL,
          email_verification_expires = NULL,
          email_verification_attempts = 0,
          "updatedAt" = NOW()
      WHERE id = ${userId}
    `;

    console.log(`[verify-email] ✅ Verified user ${userId}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[verify-email] error:', error);
    return Response.json({ error: 'Verification failed', detail: error.message }, { status: 500 });
  }
}
