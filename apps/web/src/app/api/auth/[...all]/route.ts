/**
 * @deprecated Use [...path] only. Neon SDK reads params.path, not params.all.
 * This file re-exports the same handlers so old deploys that still resolve
 * [...all] do not 404, but production should use [...path].
 *
 * Next.js cannot have two competing catch-alls under the same segment in a
 * stable way — prefer deleting this file after deploy confirms [...path].
 * Kept as a thin shim that builds path from the URL when context is wrong.
 */
import { getAuthAsync } from '@/lib/auth';
import { safeErrorInfo } from '@/lib/auth-env';

type RouteContext = { params: Promise<{ all?: string[]; path?: string[] }> };

function pathFromUrl(request: Request): string[] {
  const url = new URL(request.url);
  const prefix = '/api/auth/';
  const idx = url.pathname.indexOf(prefix);
  const rest =
    idx >= 0 ? url.pathname.slice(idx + prefix.length) : url.pathname.replace(/^\//, '');
  return rest.split('/').filter(Boolean);
}

async function normalizeContext(
  request: Request,
  ctx: RouteContext | undefined,
): Promise<{ params: Promise<{ path: string[] }> }> {
  try {
    const raw = ctx?.params ? await ctx.params : undefined;
    const segments = raw?.path?.length
      ? raw.path
      : raw?.all?.length
        ? raw.all
        : pathFromUrl(request);
    return { params: Promise.resolve({ path: segments }) };
  } catch {
    return { params: Promise.resolve({ path: pathFromUrl(request) }) };
  }
}

async function safeHandle(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  request: Request,
  ctx: RouteContext | undefined,
): Promise<Response> {
  try {
    const auth = await getAuthAsync();
    const handlers = auth.handler() as Record<
      string,
      (req: Request, c: { params: Promise<{ path: string[] }> }) => Promise<Response>
    >;
    const normalized = await normalizeContext(request, ctx);
    return await handlers[method](request, normalized);
  } catch (err) {
    const info = safeErrorInfo(err);
    console.error('[auth] Neon Auth [...all] shim failed:', info.name, info.message);
    return Response.json(
      {
        error: 'AUTH_HANDLER_FAILED',
        message: info.message,
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
