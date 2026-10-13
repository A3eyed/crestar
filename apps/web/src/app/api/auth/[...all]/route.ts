/**
 * Neon Managed Better Auth catch-all.
 * Proxies all /api/auth/* traffic to the Neon Auth base URL.
 */
import { getAuthAsync } from '@/lib/auth';
import { safeErrorInfo } from '@/lib/auth-env';

function missingEnvMessage(err: unknown): string {
  const { message } = safeErrorInfo(err);
  if (message.includes('NEON_AUTH_BASE_URL')) {
    return 'NEON_AUTH_BASE_URL is not set on the Cloudflare Worker (Production). Add it under Workers → crestar → Settings → Variables and Secrets.';
  }
  if (message.includes('NEON_AUTH_COOKIE_SECRET')) {
    return 'NEON_AUTH_COOKIE_SECRET is missing or too short (32+ chars) on the Cloudflare Worker (Production).';
  }
  if (message.includes('Auth not initialized')) {
    return message;
  }
  return message || 'Auth failed to initialize';
}

async function safeHandle(
  method: 'GET' | 'POST',
  request: Request,
): Promise<Response> {
  try {
    const authInstance = await getAuthAsync();
    const handlers = authInstance.handler() as {
      GET: (req: Request) => Promise<Response>;
      POST: (req: Request) => Promise<Response>;
    };
    return await handlers[method](request);
  } catch (err) {
    const info = safeErrorInfo(err);
    // Safe diagnostics only — no secrets, cookies, bodies
    console.error(
      '[auth] Neon Auth handler failed:',
      info.name,
      info.message,
      info.causeMessage ? `cause=${info.causeMessage}` : '',
    );
    return Response.json(
      {
        error: 'AUTH_INIT_FAILED',
        message: missingEnvMessage(err),
        name: info.name,
        status: 500,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return safeHandle('GET', request);
}

export async function POST(request: Request) {
  return safeHandle('POST', request);
}
