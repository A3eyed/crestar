/**
 * Compatibility shim: `import { auth } from '@/auth'`.
 * Uses Neon Managed Better Auth under the hood.
 */
import { headers } from 'next/headers';
import { auth as neonAuth, getAuth } from '@/lib/auth';

export type { Session } from '@/lib/auth';

/**
 * Returns the current session (or null).
 * Matches the legacy Crestar `auth()` helper shape.
 */
export async function auth(_request?: Request) {
  try {
    // Prefer Neon SDK session (reads Next cookies).
    const result = await getAuth().getSession();
    return result?.data ?? null;
  } catch (error) {
    console.error('Auth session retrieval error:', error);
    return null;
  }
}

export { neonAuth as betterAuth, getAuth };
