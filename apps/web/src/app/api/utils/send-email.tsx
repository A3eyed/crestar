// @ts-nocheck
import { getEnvString } from '@/lib/auth-env';

const DEFAULT_FROM = 'Crestar <onboarding@crestarhq.com>';

/** Physical mailing address required on marketing emails (CAN-SPAM / similar laws). */
const COMPANY_ADDRESS =
  process.env.COMPANY_PHYSICAL_ADDRESS ||
  process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
  'Crestar, Accra, Ghana';

const UNSUBSCRIBE_URL =
  process.env.MARKETING_UNSUBSCRIBE_URL || 'https://crestarhq.com/support?topic=unsubscribe';

async function getResendKey() {
  return (
    (await getEnvString('RESEND_API_KEY')) ||
    process.env.RESEND_API_KEY ||
    ''
  );
}

function marketingFooterHtml() {
  return `
    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.08);margin:28px 0 16px;" />
    <p style="font-size:12px;line-height:1.5;color:#666;margin:0 0 8px;">
      You received this email because you have a Crestar account.
      <a href="${UNSUBSCRIBE_URL}" style="color:#666;">Unsubscribe</a> from marketing emails.
    </p>
    <p style="font-size:12px;line-height:1.5;color:#666;margin:0;">
      ${COMPANY_ADDRESS}
    </p>
  `;
}

function marketingFooterText() {
  return `

---
Unsubscribe from marketing emails: ${UNSUBSCRIBE_URL}
${COMPANY_ADDRESS}
`;
}

/**
 * Send a single email via Resend API.
 * For marketing/promotional mail, pass isMarketing: true to attach
 * List-Unsubscribe headers and a required postal address footer.
 */
export async function sendEmail({
  to,
  from,
  subject,
  html,
  text,
  headers,
  attachments,
  isMarketing = false,
}) {
  const apiKey = await getResendKey();
  if (!apiKey) {
    console.error('[send-email] RESEND_API_KEY is not set on Worker');
    throw new Error('Email service is not configured');
  }

  let finalHtml = html;
  let finalText = text;
  const finalHeaders = { ...(headers || {}) };

  if (isMarketing) {
    if (finalHtml && !/unsubscribe/i.test(finalHtml)) {
      finalHtml = `${finalHtml}${marketingFooterHtml()}`;
    }
    if (finalText && !/unsubscribe/i.test(finalText)) {
      finalText = `${finalText}${marketingFooterText()}`;
    }
    if (!finalHeaders['List-Unsubscribe']) {
      finalHeaders['List-Unsubscribe'] = `<${UNSUBSCRIBE_URL}>`;
      finalHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }
  }

  const payload = {
    from: from || DEFAULT_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: finalHtml,
    text: finalText,
  };
  if (Object.keys(finalHeaders).length) payload.headers = finalHeaders;
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

/** Convenience wrapper that always treats the message as marketing. */
export async function sendMarketingEmail(options) {
  return sendEmail({ ...options, isMarketing: true });
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
