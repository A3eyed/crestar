// @ts-nocheck
// Default "from" address — must match a verified domain in your Resend account.
// Go to resend.com/domains and make sure crestarhq.com is verified with SPF + DKIM.
const DEFAULT_FROM = "Crestar <onboarding@crestarhq.com>";

/**
 * Send a single email via Resend API
 *
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.from - Sender email (optional, defaults to DEFAULT_FROM)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content
 * @param {Object} options.headers - Custom headers (optional)
 * @param {Object} options.attachments - Attachments (optional)
 * @returns {Promise<{id: string}>}
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
  if (!process.env.RESEND_API_KEY) {
    console.error("[send-email] ❌ RESEND_API_KEY is not set");
    throw new Error("Email service is not configured");
  }

  const payload = {
    from: from || DEFAULT_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  };

  // Add optional fields
  if (headers) payload.headers = headers;
  if (attachments) payload.attachments = attachments;

  console.log(
    `[send-email] Sending to ${payload.to.join(", ")} via ${payload.from}`,
  );

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    // Surface the full Resend error — statusCode + message shows domain issues, invalid keys, etc.
    console.error(
      `[send-email] ❌ Resend error ${response.status}:`,
      JSON.stringify(data),
    );
    throw new Error(
      data.message || data.name || `Resend error ${response.status}`,
    );
  }

  console.log(`[send-email] ✅ Sent successfully — id: ${data.id}`);
  return { id: data.id };
}

/**
 * Send batch emails to multiple recipients
 * Uses Resend's batch API for efficient bulk sending
 *
 * @param {Array<Object>} emails - Array of email objects
 * @returns {Promise<{ids: string[], errors: Array}>}
 */
export async function sendBatchEmails(emails) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[send-email] ❌ RESEND_API_KEY is not set");
    throw new Error("Email service is not configured");
  }

  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error("Batch emails must be a non-empty array");
  }

  const payload = emails.map((email) => ({
    from: email.from || DEFAULT_FROM,
    to: Array.isArray(email.to) ? email.to : [email.to],
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: email.headers,
    attachments: email.attachments,
  }));

  console.log(`[send-email] Sending batch of ${emails.length} emails`);

  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(
      `[send-email] ❌ Batch send error ${response.status}:`,
      JSON.stringify(data),
    );
    throw new Error(
      data.message || data.name || `Resend error ${response.status}`,
    );
  }

  // Resend batch API returns array of { id } or { error }
  const successful = data.data?.filter((item) => item.id) || [];
  const failed = data.data?.filter((item) => item.error) || [];

  console.log(
    `[send-email] ✅ Batch sent: ${successful.length} successful, ${failed.length} failed`,
  );

  return {
    ids: successful.map((item) => item.id),
    errors: failed,
    total: emails.length,
    successful: successful.length,
    failed: failed.length,
  };
}

/**
 * Send email with retry logic
 * Automatically retries failed sends up to maxRetries times
 *
 * @param {Object} options - Same as sendEmail
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<{id: string}>}
 */
export async function sendEmailWithRetry(options, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendEmail(options);
      if (attempt > 1) {
        console.log(`[send-email] ✅ Succeeded on retry attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      console.error(
        `[send-email] ❌ Attempt ${attempt}/${maxRetries} failed:`,
        error.message,
      );

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[send-email] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Validate email address format
 *
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default sendEmail;
