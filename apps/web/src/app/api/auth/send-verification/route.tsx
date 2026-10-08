// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { sendEmail } from '@/app/api/utils/send-email';
import { resolveUserId } from '@/app/api/utils/auth';

// Send a 6-digit verification code to the current user's email.
// POST /api/auth/send-verification
export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [user] = await sql`
      SELECT id, email, "emailVerified", display_name, name, email_verification_expires
      FROM "user" WHERE id = ${userId}
    `;
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    if (!user.email) {
      return Response.json({ error: 'No email on file' }, { status: 400 });
    }
    // Check BOTH columns — handles legacy data inconsistency
    if (user.emailVerified) {
      return Response.json({ success: true, alreadyVerified: true });
    }

    // ── Server-side rate limit ───────────────────────────────────────────
    // Code expires in 15 min (900s). Reject re-send within 60s of last send.
    if (user.email_verification_expires) {
      const expiresAt = new Date(user.email_verification_expires);
      const secondsRemaining = (expiresAt.getTime() - Date.now()) / 1000;
      const COOLDOWN = 60;
      // Only enforce cooldown if the previous code is still alive
      if (secondsRemaining > 0 && secondsRemaining > 900 - COOLDOWN) {
        const wait = Math.ceil(secondsRemaining - (900 - COOLDOWN));
        return Response.json(
          {
            error: `Please wait ${wait}s before requesting a new code.`,
            cooldown: wait,
          },
          { status: 429 }
        );
      }
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await sql`
      UPDATE "user"
      SET email_verification_code = ${code},
          email_verification_expires = ${expires.toISOString()},
          email_verification_attempts = 0
      WHERE id = ${userId}
    `;

    const displayName = user.display_name || user.name || 'there';

    if (!process.env.RESEND_API_KEY) {
      console.warn('[send-verification] RESEND_API_KEY not set; logging code instead.');
      console.log(`[VERIFICATION CODE] ${user.email}: ${code}`);
      return Response.json({
        success: true,
        warning: 'RESEND_API_KEY missing — code logged on server only.',
      });
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #000000; color: #FFFFFF; border-radius: 16px;">
        <h1 style="font-size: 28px; font-weight: 800; letter-spacing: 4px; margin: 0 0 24px; text-align: center;">CRESTAR</h1>
        <p style="font-size: 16px; color: rgba(255,255,255,0.7); margin: 0 0 8px;">Hi ${displayName},</p>
        <p style="font-size: 16px; color: rgba(255,255,255,0.7); margin: 0 0 24px;">Use this code to verify your email address:</p>
        <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #FFFFFF;">${code}</div>
        </div>
        <p style="font-size: 13px; color: rgba(255,255,255,0.4); margin: 0;">This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;
    const text = `Your Crestar verification code is: ${code}\n\nThis code expires in 15 minutes.`;

    try {
      // Use the default DEFAULT_FROM in send-email.js — single source of truth
      await sendEmail({
        to: user.email,
        subject: 'Verify your Crestar email',
        html,
        text,
      });
    } catch (err) {
      console.error('[send-verification] Resend error:', err);
      return Response.json(
        {
          error: 'Could not send verification email. Please try again.',
          detail: err.message,
        },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('send-verification error:', error);
    return Response.json({ error: 'Failed to send verification' }, { status: 500 });
  }
}
