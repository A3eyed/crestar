// @ts-nocheck
import { getEnvString } from '@/lib/auth-env';

const DEFAULT_FROM = 'Crestar <onboarding@crestarhq.com>';

async function getResendKey() {
  return (
    (await getEnvString('RESEND_API_KEY')) ||
    process.env.RESEND_API_KEY ||
    ''
  );
}

/**
 * Send a single email via Resend API
 */
export async function sendEmail({
  to,
  from,
  subject,
  html,
  text,
  headers,
  attachments,
}) {
  const apiKey = await getResendKey();
  if (!apiKey) {
    console.error('[send-email] RESEND_API_KEY is not set on Worker');
    throw new Error('Email service is not configured');
  }

  const payload = {
    from: from || DEFAULT_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  };
  if (headers) payload.headers = headers;
  if (attachments) payload.attachments = attachments;

  console.log(`[send-email] Sending to ${payload.to.join(', ')} via ${payload.from}`);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`[send-email] Resend error ${response.status}:`, JSON.stringify(data));
    throw new Error(data.message || data.name || `Resend error ${response.status}`);
  }

  console.log(`[send-email] Sent — id: ${data.id}`);
  return { id: data.id };
}

export async function sendEmailWithRetry(options, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendEmail(options);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }
  throw lastError;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default sendEmail;
