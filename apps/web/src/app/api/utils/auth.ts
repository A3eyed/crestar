import { getAuthAsync } from '@/lib/auth';

/**
 * Resolve user ID from web session cookie (Neon Managed Better Auth).
 * Always uses getAuthAsync so the SDK is initialized on cold Workers isolates.
 */
export async function resolveUserId(request: Request): Promise<string | null> {
  try {
    const auth = await getAuthAsync();

    // Preferred: SDK session (reads Next cookies()/headers in App Router)
    try {
      const result = await auth.getSession();
      const id = result?.data?.user?.id;
      if (id) return String(id);
    } catch (e) {
      console.error('[auth] getSession failed:', e);
    }

    // Fallback: compatibility shim used elsewhere in the app
    try {
      const { auth: authProxy } = await import('@/lib/auth');
      const legacy = await authProxy.api.getSession({ headers: request.headers });
      const userId = (legacy as { user?: { id?: string } } | null)?.user?.id;
      if (userId) return String(userId);
    } catch (e) {
      console.error('[auth] legacy getSession failed:', e);
    }

    return null;
  } catch (error) {
    console.error('❌ Auth session resolution failed:', error);
    return null;
  }
}

export async function getSession(request: Request) {
  try {
    const auth = await getAuthAsync();
    const result = await auth.getSession();
    if (result?.data) return result.data;

    const { auth: authProxy } = await import('@/lib/auth');
    return (await authProxy.api.getSession({ headers: request.headers })) || null;
  } catch (error) {
    console.error('❌ Session retrieval failed:', error);
    return null;
  }
}
