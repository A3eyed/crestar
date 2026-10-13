/**
 * Crestar — Neon Managed Better Auth (server)
 *
 * Auth is hosted by Neon (Managed Better Auth). This app proxies
 * /api/auth/* to NEON_AUTH_BASE_URL and signs session cookies with
 * NEON_AUTH_COOKIE_SECRET.
 *
 * Env is only required at request time (not during `next build`).
 */
import { createNeonAuth } from '@neondatabase/auth/next/server';
import { getEnvString } from '@/lib/auth-env';

type NeonAuth = ReturnType<typeof createNeonAuth>;

let _auth: NeonAuth | null = null;
let _authPromise: Promise<NeonAuth> | null = null;

async function assertNeonAuthEnv() {
  const baseUrl = await getEnvString('NEON_AUTH_BASE_URL');
  const secret = await getEnvString('NEON_AUTH_COOKIE_SECRET');

  if (!baseUrl) {
    throw new Error(
      'NEON_AUTH_BASE_URL is not set on the Worker. Enable Better Auth in the Neon Console (Branch → Auth) and copy the Auth URL into Cloudflare Worker secrets (Production).',
    );
  }
  if (!secret || secret.length < 32) {
    throw new Error(
      'NEON_AUTH_COOKIE_SECRET is missing or shorter than 32 characters on the Worker. Set a secret of at least 32 chars (openssl rand -base64 32).',
    );
  }
  return { baseUrl, secret };
}

export async function getAuthAsync(): Promise<NeonAuth> {
  if (_auth) return _auth;
  if (_authPromise) return _authPromise;
  _authPromise = (async () => {
    const { baseUrl, secret } = await assertNeonAuthEnv();
    _auth = createNeonAuth({
      baseUrl,
      cookies: { secret },
      logLevel: 'warn',
    });
    return _auth;
  })();
  try {
    return await _authPromise;
  } catch (e) {
    _authPromise = null;
    throw e;
  }
}

/** Sync accessor for call sites that already ran getAuthAsync in the same isolate */
export function getAuth(): NeonAuth {
  if (_auth) return _auth;
  throw new Error(
    'Auth not initialized. Call getAuthAsync() first, or ensure NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET are set on the Worker.',
  );
}

/**
 * Compatibility surface for legacy Crestar code.
 * Prefer getAuthAsync() in new route handlers.
 */
export const auth = new Proxy({} as NeonAuth & {
  api: {
    getSession: (opts?: { headers?: Headers }) => Promise<unknown>;
  };
}, {
  get(_target, prop, receiver) {
    if (prop === 'api') {
      return {
        async getSession(_opts?: { headers?: Headers }) {
          try {
            const instance = await getAuthAsync();
            const result = await instance.getSession();
            return result?.data ?? null;
          } catch (err) {
            console.error('[auth] getSession failed:', err);
            return null;
          }
        },
      };
    }

    // Lazy: methods become async wrappers when instance not yet created
    if (!_auth) {
      return async (...args: unknown[]) => {
        const instance = await getAuthAsync();
        const value = Reflect.get(instance as object, prop);
        if (typeof value === 'function') {
          return value.apply(instance, args);
        }
        return value;
      };
    }

    const value = Reflect.get(_auth as object, prop, receiver);
    return typeof value === 'function' ? value.bind(_auth) : value;
  },
});

export type Session = Awaited<ReturnType<NeonAuth['getSession']>> extends {
  data: infer D;
}
  ? D
  : unknown;
