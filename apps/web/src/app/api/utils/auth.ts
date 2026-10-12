import { getAuth } from '@/lib/auth';

/**
 * Resolve user ID from web session cookie (Neon Managed Better Auth).
 */
export async function resolveUserId(request: Request): Promise<string | null> {
  try {
    const result = await getAuth().getSession();
    const session = result?.data;
    if (!session?.user?.id) {
      // Fallback: some deployments expose session via api shim + request headers
      const { auth } = await import('@/lib/auth');
      const legacy = await auth.api.getSession({ headers: request.headers });
      const userId = (legacy as { user?: { id?: string } } | null)?.user?.id;
      return userId ? String(userId) : null;
    }
    return String(session.user.id);
  } catch (error) {
    console.error('❌ Auth session resolution failed:', error);
    return null;
  }
}

export async function getSession(request: Request) {
  try {
    const result = await getAuth().getSession();
    if (result?.data) return result.data;
    const { auth } = await import('@/lib/auth');
    return (await auth.api.getSession({ headers: request.headers })) || null;
  } catch (error) {
    console.error('❌ Session retrieval failed:', error);
    return null;
  }
}
