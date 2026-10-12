/**
 * Neon Managed Better Auth catch-all.
 * Proxies all /api/auth/* traffic to the Neon Auth base URL.
 */
import { getAuth } from '@/lib/auth';

let handlers: ReturnType<ReturnType<typeof getAuth>['handler']> | null = null;

function getHandlers() {
  if (!handlers) {
    handlers = getAuth().handler();
  }
  return handlers;
}

function missingEnvMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('NEON_AUTH_BASE_URL')) {
    return 'NEON_AUTH_BASE_URL is not set on the Cloudflare Worker. Enable Better Auth in Neon Console and set the Auth URL as a Worker secret/var.';
  }
  if (msg.includes('NEON_AUTH_COOKIE_SECRET')) {
    return 'NEON_AUTH_COOKIE_SECRET is missing or too short (32+ chars) on the Cloudflare Worker.';
  }
  return msg || 'Auth failed to initialize';
}

async function safeHandle(
  method: 'GET' | 'POST',
  request: Request,
): Promise<Response> {
  try {
    const h = getHandlers() as {
      GET: (req: Request) => Promise<Response>;
      POST: (req: Request) => Promise<Response>;
    };
    return await h[method](request);
  } catch (err) {
    console.error('[auth] Neon Auth handler failed:', err);
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
