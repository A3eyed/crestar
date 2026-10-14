// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

/**
 * POST /api/auth/verify-email
 * Verify a 6-digit code. body: { code }
 *
 * Source of truth for the code is auth_users (same table send-verification writes).
 * Also updates public."user".emailVerified for Better Auth session consumers.
 */
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

    // Primary: auth_users (where send-verification stores the code)
    const [profile] = await sql`
      SELECT id, email_verified, email_verification_code,
             email_verification_expires, email_verification_attempts
      FROM auth_users WHERE id = ${userId}
    `;

    // Fallback: public."user" if auth_users row missing
    let row = profile;
    let source = 'auth_users';
    if (!row) {
      const [u] = await sql`
        SELECT id, "emailVerified" AS email_verified,
               email_verification_code, email_verification_expires,
               email_verification_attempts
        FROM "user" WHERE id = ${userId}
      `;
      row = u;
      source = 'user';
    }

    if (!row) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (row.email_verified) {
      return Response.json({ success: true, alreadyVerified: true });
    }

    if (!row.email_verification_code) {
      return Response.json(
        { error: 'No verification code on file. Request a new one.' },
        { status: 400 },
      );
    }

    if ((row.email_verification_attempts || 0) >= 5) {
      return Response.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429 },
      );
    }

    if (
      row.email_verification_expires &&
      new Date(row.email_verification_expires) < new Date()
    ) {
      return Response.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
    }

    if (code !== row.email_verification_code) {
      if (source === 'auth_users') {
        await sql`
          UPDATE auth_users
          SET email_verification_attempts = COALESCE(email_verification_attempts, 0) + 1,
              updated_at = NOW()
          WHERE id = ${userId}
        `;
      }
      try {
        await sql`
          UPDATE "user"
          SET email_verification_attempts = COALESCE(email_verification_attempts, 0) + 1
          WHERE id = ${userId}
        `;
      } catch {
        /* ignore */
      }
      return Response.json({ error: 'Incorrect code.' }, { status: 400 });
    }

    // Success — mark both tables verified and clear code
    await sql`
      UPDATE auth_users
      SET email_verified = TRUE,
          is_verified = TRUE,
          email_verification_code = NULL,
          email_verification_expires = NULL,
          email_verification_attempts = 0,
          updated_at = NOW()
      WHERE id = ${userId}
    `;

    try {
      await sql`
        UPDATE "user"
        SET "emailVerified" = TRUE,
            email_verification_code = NULL,
            email_verification_expires = NULL,
            email_verification_attempts = 0,
            "updatedAt" = NOW()
        WHERE id = ${userId}
      `;
    } catch {
      /* ignore */
    }

    console.log(`[verify-email] ✅ Verified user ${userId}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[verify-email] error:', error);
    return Response.json({ error: 'Verification failed', detail: error.message }, { status: 500 });
  }
}
