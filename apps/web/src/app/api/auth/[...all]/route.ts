/**
 * Better Auth catch-all handler (Crestar).
 *
 * Handlers are created on first request so `next build` / OpenNext does not
 * require DATABASE_URL or BETTER_AUTH_SECRET at build time.
 *
 * If Worker secrets are missing, return a clear JSON 500 instead of an empty body.
 */
import { getAuth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

let handlers: ReturnType<typeof toNextJsHandler> | null = null;

function missingEnvMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('DATABASE_URL')) {
    return 'DATABASE_URL is not set on the Cloudflare Worker. Set it under Workers & Pages → crestar → Settings → Variables and Secrets.';
  }
  if (msg.includes('BETTER_AUTH_SECRET') || msg.includes('AUTH_SECRET')) {
    return 'BETTER_AUTH_SECRET is not set (or too short) on the Cloudflare Worker. Set a 32+ character secret under Workers & Pages → crestar → Settings → Variables and Secrets.';
  }
  return msg || 'Auth failed to initialize';
}

function getHandlers() {
  if (!handlers) {
    handlers = toNextJsHandler(getAuth());
  }
  return handlers;
}

async function safeHandle(
  method: 'GET' | 'POST',
  request: Request,
): Promise<Response> {
  try {
    const h = getHandlers();
    return await h[method](request);
  } catch (err) {
    console.error('[auth] handler init/request failed:', err);
    return Response.json(
      {
        error: 'AUTH_INIT_FAILED',
        message: missingEnvMessage(err),
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
