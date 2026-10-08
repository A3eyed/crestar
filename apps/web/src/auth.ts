/**
 * V1 to V2 Migration Compatibility Shim
 *
 * This file provides a compatibility wrapper for Better Auth v2
 * so that old API routes that import from "@/auth" continue to work.
 *
 * Old pattern (V1):
 *   import { auth } from "@/auth";
 *   const session = await auth(); // or auth(request)
 *
 * New pattern (V2):
 *   import { auth } from "@/lib/auth";
 *   const session = await auth.api.getSession({ headers: request.headers });
 *
 * This shim provides the old `auth()` function pattern while using
 * Better Auth v2 under the hood.
 */
import { headers } from 'next/headers';
import { auth as betterAuth } from '@/lib/auth';

export type { Session } from '@/lib/auth';

/**
 * Compatibility wrapper for V1 auth() calls.
 * Accepts an optional Request and returns the session.
 */
export async function auth(request?: Request) {
  try {
    // If request is provided, use its headers directly
    if (request && request.headers) {
      return await betterAuth.api.getSession({ headers: request.headers });
    }

    // Otherwise fall back to Next.js headers() - works in server components and API routes
    const requestHeaders = await headers();
    return await betterAuth.api.getSession({ headers: requestHeaders });
  } catch (error) {
    console.error('Auth session retrieval error:', error);
    return null;
  }
}

// Re-export the Better Auth instance for direct access
export { betterAuth };
