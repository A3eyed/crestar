/**
 * Neon Managed Better Auth catch-all.
 *
 * Must be named [...path] — the SDK does:
 *   const handler = async (request, { params }) => {
 *     path: (await params).path.join("/")
 *   }
 *
 * Do not wrap as GET(request) only; Next must pass the context object.
 */
import { getAuthAsync } from '@/lib/auth';
import { safeErrorInfo } from '@/lib/auth-env';

type RouteContext = { params: Promise<{ path: string[] }> };

type NeonHandlers = {
  GET: (req: Request, ctx: RouteContext) => Promise<Response>;
  POST: (req: Request, ctx: RouteContext) => Promise<Response>;
  PUT: (req: Request, ctx: RouteContext) => Promise<Response>;
  DELETE: (req: Request, ctx: RouteContext) => Promise<Response>;
  PATCH: (req: Request, ctx: RouteContext) => Promise<Response>;
};

let handlers: NeonHandlers | null = null;

async function getHandlers(): Promise<NeonHandlers> {
  if (!handlers) {
    const auth = await getAuthAsync();
    handlers = auth.handler() as NeonHandlers;
  }
  return handlers;
}

function clientMessage(err: unknown): string {
  const { message } = safeErrorInfo(err);
  if (message.includes('NEON_AUTH_BASE_URL')) {
    return 'NEON_AUTH_BASE_URL is not set on the Cloudflare Worker (Production).';
  }
  if (message.includes('NEON_AUTH_COOKIE_SECRET')) {
    return 'NEON_AUTH_COOKIE_SECRET is missing or too short (32+ chars) on the Worker.';
  }
  if (message.includes('params')) {
    return 'Auth route misconfigured: Neon handler requires [...path] and Next.js route context.';
  }
  return message || 'Auth request failed';
}

async function safeHandle(
  method: keyof NeonHandlers,
  request: Request,
  ctx: RouteContext,
): Promise<Response> {
  try {
    const h = await getHandlers();
    return await h[method](request, ctx);
  } catch (err) {
    const info = safeErrorInfo(err);
    console.error(
      '[auth] Neon Auth handler failed:',
      info.name,
      info.message,
      info.causeMessage ? `cause=${info.causeMessage}` : '',
    );
    return Response.json(
      {
        error: 'AUTH_HANDLER_FAILED',
        message: clientMessage(err),
        name: info.name,
        status: 500,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request, ctx: RouteContext) {
  return safeHandle('GET', request, ctx);
}

export async function POST(request: Request, ctx: RouteContext) {
  return safeHandle('POST', request, ctx);
}

export async function PUT(request: Request, ctx: RouteContext) {
  return safeHandle('PUT', request, ctx);
}

export async function DELETE(request: Request, ctx: RouteContext) {
  return safeHandle('DELETE', request, ctx);
}

export async function PATCH(request: Request, ctx: RouteContext) {
  return safeHandle('PATCH', request, ctx);
}
