// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { sendEmail } from '@/app/api/utils/send-email';
import { randomBytes, randomUUID } from 'crypto';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    console.log('[forgot-password] 📧 Request received for:', email);

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    const [user] = await sql`
      SELECT id, email, name, display_name FROM "user"
      WHERE email = ${email}
    `;

    // For security, always return success even if email not found
    if (!user) {
      console.log('[forgot-password] ⚠️ Email not found:', email);
      return Response.json({
        success: true,
        message: 'If an account exists, you will receive a password reset email',
      });
    }

    console.log('[forgot-password] ✅ User found:', user.id);

    // Generate secure reset token
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Delete any existing reset tokens for this email first (prevents stale token accumulation)
    await sql`
      DELETE FROM verification WHERE identifier = ${email}
    `;

    // Store the new reset token.
    // Better Auth's verification table is (id, identifier, value, "expiresAt")
    // and `id` has no default — it must be supplied.
    await sql`
      INSERT INTO verification (id, identifier, value, "expiresAt")
      VALUES (${randomUUID()}, ${email}, ${resetToken}, ${expiresAt})
    `;

    console.log('[forgot-password] 🔑 Reset token generated');

    const baseUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || '';
    const resetUrl = `${baseUrl}/account/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    const displayName = user.display_name || user.name || 'there';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #000000; color: #FFFFFF; border-radius: 16px;">
        <h1 style="font-size: 28px; font-weight: 800; letter-spacing: 4px; margin: 0 0 24px; text-align: center;">CRESTAR</h1>
        <p style="font-size: 16px; color: rgba(255,255,255,0.7); margin: 0 0 8px;">Hi ${displayName},</p>
        <p style="font-size: 16px; color: rgba(255,255,255,0.7); margin: 0 0 24px;">We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetUrl}" style="display: inline-block; background: #FFFFFF; color: #000000; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 10px; text-decoration: none; letter-spacing: 0.5px;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: rgba(255,255,255,0.4); margin: 0 0 8px;">This link expires in 1 hour.</p>
        <p style="font-size: 13px; color: rgba(255,255,255,0.4); margin: 0;">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
        <p style="font-size: 12px; color: rgba(255,255,255,0.3); margin: 0; text-align: center;">Need help? Contact us at <a href="mailto:hello@crestarhq.com" style="color: rgba(255,255,255,0.5);">hello@crestarhq.com</a></p>
      </div>
    `;

    const text = `Hi ${displayName},\n\nReset your Crestar password by visiting this link:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.\n\nCrestar Support: hello@crestarhq.com`;

    if (process.env.RESEND_API_KEY) {
      await sendEmail({
        to: email,
        from: 'Crestar <hello@crestarhq.com>',
        subject: 'Reset your Crestar password',
        html,
        text,
      });
      console.log('[forgot-password] ✅ Reset email sent to:', email);
    } else {
      console.log('[forgot-password] ⚠️ RESEND_API_KEY not set. Reset URL:', resetUrl);
    }

    return Response.json({
      success: true,
      message: 'Password reset instructions sent to your email',
    });
  } catch (error) {
    console.error('[forgot-password] ❌ Error:', error);
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
