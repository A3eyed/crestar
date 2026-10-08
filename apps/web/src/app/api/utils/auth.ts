import { auth } from '@/lib/auth';

/**
 * Resolve user ID from either web session or mobile JWT bearer token.
 * Works for both iOS and Android apps, and web browsers.
 *
 * Uses Better Auth v2's built-in bearer() plugin to handle Authorization: Bearer tokens.
 * The bearer plugin automatically validates JWT tokens signed with AUTH_SECRET.
 *
 * @param {Request} request - The incoming request
 * @returns {Promise<string|null>} - User ID or null if not authenticated
 */
export async function resolveUserId(request: Request): Promise<string | null> {
  try {
    // Better Auth v2 handles both cookie sessions AND bearer tokens automatically
    // The bearer() plugin parses "Authorization: Bearer <token>" headers
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return null;
    }

    return String(session.user.id);
  } catch (error) {
    console.error('❌ Auth session resolution failed:', error);
    return null;
  }
}

/**
 * Get the full session object including user data.
 * Used by endpoints that need complete user information.
 *
 * @param {Request} request - The incoming request
 * @returns {Promise<Session|null>} - Session object or null
 */
export async function getSession(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    return session || null;
  } catch (error) {
    console.error('❌ Session retrieval failed:', error);
    return null;
  }
}
