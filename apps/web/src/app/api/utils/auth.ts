import { getAuthAsync } from '@/lib/auth';
import { ensureAppUser } from '@/app/api/utils/ensureAppUser';

/**
 * Resolve user ID from web session cookie (Neon Managed Better Auth).
 */
export async function resolveUserId(request: Request): Promise<string | null> {
  try {
    const auth = await getAuthAsync();

    try {
      const result = await auth.getSession();
      const id = result?.data?.user?.id;
      if (id) {
        const user = result.data.user;
        // Provision Crestar profile row so downstream FKs work
        await ensureAppUser(String(id), {
          email: user?.email,
          name: user?.name,
          image: user?.image,
        }).catch((e) => console.warn('[resolveUserId] ensureAppUser:', e?.message));
        return String(id);
      }
    } catch (e) {
      console.error('[auth] getSession failed:', e);
    }

    try {
      const { auth: authProxy } = await import('@/lib/auth');
      const legacy = await authProxy.api.getSession({ headers: request.headers });
      const userId = (legacy as { user?: { id?: string } } | null)?.user?.id;
      if (userId) {
        const u = legacy as { user?: { email?: string; name?: string; image?: string } };
        await ensureAppUser(String(userId), {
          email: u?.user?.email,
          name: u?.user?.name,
          image: u?.user?.image,
        }).catch(() => {});
        return String(userId);
      }
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
