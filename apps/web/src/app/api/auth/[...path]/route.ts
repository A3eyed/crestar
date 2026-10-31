/**
 * Neon Managed Better Auth catch-all.
 *
 * Must be named [...path] — the SDK does:
 *   const handler = async (request, { params }) => {
 *     path: (await params).path.join("/")
 *   }
 *
 * Login endpoints are wrapped with IP rate limiting + account soft lockout.
 */
import { getAuthAsync } from '@/lib/auth';
import { safeErrorInfo } from '@/lib/auth-env';
import {
  assertLoginAllowed,
  guardDeniedResponse,
  isAuthSensitivePath,
  isCredentialSignInPath,
  peekEmailFromRequest,
  recordAuthFailure,
  recordAuthSuccess,
} from '@/app/api/utils/loginProtection';

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
  let pathParts: string[] = [];
  try {
    const params = await ctx.params;
    pathParts = params?.path || [];
  } catch {
    pathParts = [];
  }

  if (isAuthSensitivePath(pathParts)) {
    const email = await peekEmailFromRequest(request);
    const allowed = await assertLoginAllowed(request, { email, pathParts });
    if (!allowed.ok) {
      return guardDeniedResponse(allowed);
    }

    const response = await safeHandle('POST', request, ctx);

    // Track credential sign-in outcomes for account soft lockout
    if (isCredentialSignInPath(pathParts) && email) {
      if (response.ok) {
        await recordAuthSuccess(email);
      } else if (response.status === 401 || response.status === 400 || response.status === 403) {
        await recordAuthFailure(email);
      }
    }

    return response;
  }

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
