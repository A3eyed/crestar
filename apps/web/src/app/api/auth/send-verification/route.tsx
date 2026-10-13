// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { sendEmail } from '@/app/api/utils/send-email';
import { resolveUserId, getSession } from '@/app/api/utils/auth';
import { ensureAppUser } from '@/app/api/utils/ensureAppUser';
import { ensureCoreSchema } from '@/app/api/utils/ensureSchema';

/**
 * POST /api/auth/send-verification
 * Sends a 6-digit code. Stores code on auth_users (Crestar profile),
 * email resolved from session / neon_auth / auth_users.
 */
export async function POST(request) {
  try {
    await ensureCoreSchema();
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Please sign in to continue.' }, { status: 401 });
    }

    const session = await getSession(request);
    await ensureAppUser(userId, {
      email: session?.user?.email,
      name: session?.user?.name,
      image: session?.user?.image,
    });

    // Resolve email + name
    let email = session?.user?.email || null;
    let displayName = session?.user?.name || 'there';
    let alreadyVerified = !!session?.user?.emailVerified;

    const [profile] = await sql`
      SELECT id, email, display_name, name, email_verified,
             email_verification_expires, is_verified
      FROM auth_users WHERE id = ${userId}
    `;
    if (profile) {
      email = email || profile.email;
      displayName = profile.display_name || profile.name || displayName;
      alreadyVerified = alreadyVerified || !!profile.email_verified || !!profile.is_verified;
    }

    if (!email) {
      try {
        const [nu] = await sql`
          SELECT email, name, "emailVerified" FROM neon_auth."user" WHERE id = ${userId}
        `;
        if (nu) {
          email = nu.email;
          displayName = nu.name || displayName;
          alreadyVerified = alreadyVerified || !!nu.emailVerified;
        }
      } catch {
        /* ignore */
      }
    }

    // Legacy public.user
    if (!email) {
      try {
        const [pu] = await sql`
          SELECT email, name, "emailVerified" FROM "user" WHERE id = ${userId}
        `;
        if (pu) {
          email = pu.email;
          displayName = pu.name || displayName;
          alreadyVerified = alreadyVerified || !!pu.emailVerified;
        }
      } catch {
        /* ignore */
      }
    }

    if (!email) {
      return Response.json(
        { error: 'No email on your account. Add an email in settings first.' },
        { status: 400 },
      );
    }

    if (alreadyVerified) {
      return Response.json({ success: true, alreadyVerified: true });
    }

    // Rate limit
    if (profile?.email_verification_expires) {
      const expiresAt = new Date(profile.email_verification_expires);
      const secondsRemaining = (expiresAt.getTime() - Date.now()) / 1000;
      const COOLDOWN = 60;
      if (secondsRemaining > 0 && secondsRemaining > 900 - COOLDOWN) {
        const wait = Math.ceil(secondsRemaining - (900 - COOLDOWN));
        return Response.json(
          { error: `Please wait ${wait}s before requesting a new code.`, cooldown: wait },
          { status: 429 },
        );
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await sql`
      UPDATE auth_users
      SET email_verification_code = ${code},
          email_verification_expires = ${expires.toISOString()},
          email_verification_attempts = 0,
          email = COALESCE(email, ${email}),
          updated_at = NOW()
      WHERE id = ${userId}
    `;

    // Best-effort mirror on public.user for legacy readers
    try {
      await sql`
        UPDATE "user"
        SET email_verification_code = ${code},
            email_verification_expires = ${expires.toISOString()},
            email_verification_attempts = 0
        WHERE id = ${userId}
      `;
    } catch {
      /* ignore */
    }

    try {
      await sendEmail({
        to: email,
        subject: 'Verify your Crestar email',
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#000;color:#fff;border-radius:16px;">
            <h1 style="font-size:28px;font-weight:800;letter-spacing:4px;margin:0 0 24px;text-align:center;">CRESTAR</h1>
            <p style="font-size:16px;color:rgba(255,255,255,0.7);margin:0 0 8px;">Hi ${displayName},</p>
            <p style="font-size:16px;color:rgba(255,255,255,0.7);margin:0 0 24px;">Use this code to verify your email:</p>
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <div style="font-size:36px;font-weight:800;letter-spacing:8px;">${code}</div>
            </div>
            <p style="font-size:13px;color:rgba(255,255,255,0.4);margin:0;">Expires in 15 minutes.</p>
          </div>`,
        text: `Your Crestar verification code is: ${code}\n\nExpires in 15 minutes.`,
      });
    } catch (err) {
      console.error('[send-verification] Resend error:', err);
      return Response.json(
        { error: 'Could not send the email. Please try again in a moment.' },
        { status: 500 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('send-verification error:', error);
    return Response.json(
      { error: 'Could not send verification. Please try again.' },
      { status: 500 },
    );
  }
}
