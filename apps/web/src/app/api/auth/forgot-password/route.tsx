// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { sendEmail } from '@/app/api/utils/send-email';
import { randomBytes, randomUUID } from 'crypto';
import {
  assertLoginAllowed,
  guardDeniedResponse,
} from '@/app/api/utils/loginProtection';

function resolveAppUrl(request) {
  const fromEnv = (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    ''
  ).trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  try {
    const host =
      request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      '';
    if (host) {
      const proto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
      return `${proto}://${host.split(',')[0].trim()}`.replace(/\/$/, '');
    }
  } catch {
    /* ignore */
  }
  return 'https://crestarhq.com';
}

async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;

  try {
    const [row] = await sql`
      SELECT id, email, name, display_name
      FROM auth_users
      WHERE LOWER(email) = ${normalized}
      LIMIT 1
    `;
    if (row) {
      return {
        id: String(row.id),
        email: row.email || normalized,
        displayName: row.display_name || row.name || 'there',
        source: 'auth_users',
      };
    }
  } catch (e) {
    console.warn('[forgot-password] auth_users lookup:', e?.message || e);
  }

  try {
    const [row] = await sql`
      SELECT id, email, name
      FROM neon_auth."user"
      WHERE LOWER(email) = ${normalized}
      LIMIT 1
    `;
    if (row) {
      return {
        id: String(row.id),
        email: row.email || normalized,
        displayName: row.name || 'there',
        source: 'neon_auth',
      };
    }
  } catch (e) {
    console.warn('[forgot-password] neon_auth lookup:', e?.message || e);
  }

  try {
    const [row] = await sql`
      SELECT id, email, name, display_name
      FROM "user"
      WHERE LOWER(email) = ${normalized}
      LIMIT 1
    `;
    if (row) {
      return {
        id: String(row.id),
        email: row.email || normalized,
        displayName: row.display_name || row.name || 'there',
        source: 'user',
      };
    }
  } catch (e) {
    console.warn('[forgot-password] user lookup:', e?.message || e);
  }

  return null;
}

async function ensureVerificationTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS public.verification (
      id text PRIMARY KEY,
      identifier text NOT NULL,
      value text NOT NULL,
      "expiresAt" timestamp without time zone NOT NULL
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS verification_identifier_idx
    ON public.verification (identifier)
  `;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailRaw = body?.email;
    const email = String(emailRaw || '').trim().toLowerCase();

    const allowed = await assertLoginAllowed(request, {
      email,
      pathParts: ['forgot-password'],
    });
    if (!allowed.ok) return guardDeniedResponse(allowed);

    console.log('[forgot-password] Request for:', email || '(empty)');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      console.log('[forgot-password] No account for email (still returning success)');
      return Response.json({
        success: true,
        message: 'If an account exists, you will receive a password reset email',
      });
    }

    console.log('[forgot-password] User found via', user.source, user.id);

    await ensureVerificationTable();

    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await sql`DELETE FROM verification WHERE identifier = ${email}`;
    await sql`
      INSERT INTO verification (id, identifier, value, "expiresAt")
      VALUES (${randomUUID()}, ${email}, ${resetToken}, ${expiresAt})
    `;

    const baseUrl = resolveAppUrl(request);
    const resetUrl = `${baseUrl}/account/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    const displayName = user.displayName || 'there';

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#000000;color:#FFFFFF;border-radius:16px;">
        <h1 style="font-size:28px;font-weight:800;letter-spacing:4px;margin:0 0 24px;text-align:center;color:#D4AF37;">CRESTAR</h1>
        <p style="font-size:16px;color:rgba(255,255,255,0.7);margin:0 0 8px;">Hi ${displayName},</p>
        <p style="font-size:16px;color:rgba(255,255,255,0.7);margin:0 0 24px;">We received a request to reset your password. Tap the button below to choose a new one:</p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${resetUrl}" style="display:inline-block;background:#D4AF37;color:#000000;font-weight:700;font-size:16px;padding:14px 32px;border-radius:10px;text-decoration:none;">Reset Password</a>
        </div>
        <p style="font-size:13px;color:rgba(255,255,255,0.4);margin:0 0 8px;">This link expires in 1 hour.</p>
        <p style="font-size:13px;color:rgba(255,255,255,0.4);margin:0;">If you did not request this, you can ignore this email. Your password will not change.</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0;" />
        <p style="font-size:12px;color:rgba(255,255,255,0.3);margin:0;text-align:center;">Need help? WhatsApp support from the Crestar app or website.</p>
      </div>
    `;

    const text = `Hi ${displayName},\n\nReset your Crestar password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request this, ignore this email.`;

    try {
      await sendEmail({
        to: email,
        subject: 'Reset your Crestar password',
        html,
        text,
      });
      console.log('[forgot-password] Reset email sent to', email, 'link host', baseUrl);
    } catch (err) {
      console.error('[forgot-password] Resend error:', err?.message || err);
      return Response.json(
        { error: 'Could not send the email. Please try again in a moment.' },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      message: 'Password reset instructions sent to your email',
    });
  } catch (error) {
    console.error('[forgot-password] Error:', error);
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
