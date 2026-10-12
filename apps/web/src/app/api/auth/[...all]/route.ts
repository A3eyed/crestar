/**
 * Better Auth catch-all handler (Crestar).
 *
 * Handlers are created on first request so `next build` / OpenNext does not
 * require DATABASE_URL or BETTER_AUTH_SECRET at build time.
 */
import { getAuth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

let handlers: ReturnType<typeof toNextJsHandler> | null = null;

function getHandlers() {
  if (!handlers) {
    handlers = toNextJsHandler(getAuth());
  }
  return handlers;
}

export async function GET(request: Request) {
  return getHandlers().GET(request);
}

export async function POST(request: Request) {
  return getHandlers().POST(request);
}
