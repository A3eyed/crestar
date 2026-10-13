/**
 * Compatibility shim: `import { auth } from '@/auth'`.
 * Uses Neon Managed Better Auth under the hood.
 */
import { auth as neonAuth, getAuthAsync } from '@/lib/auth';

export type { Session } from '@/lib/auth';

/**
 * Returns the current session (or null).
 * Matches the legacy Crestar `auth()` helper shape: { user: { id, ... } }
 */
export async function auth(_request?: Request) {
  try {
    const instance = await getAuthAsync();
    const result = await instance.getSession();
    return result?.data ?? null;
  } catch (error) {
    console.error('Auth session retrieval error:', error);
    return null;
  }
}

export { neonAuth as betterAuth, getAuthAsync as getAuth };
