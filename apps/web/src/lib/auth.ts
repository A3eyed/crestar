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

type NeonAuth = ReturnType<typeof createNeonAuth>;

let _auth: NeonAuth | null = null;

function assertNeonAuthEnv() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
  const secret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();

  if (!baseUrl) {
    throw new Error(
      'NEON_AUTH_BASE_URL is not set on the Worker. Enable Better Auth in the Neon Console (Branch → Auth) and copy the Auth URL.',
    );
  }
  if (!secret || secret.length < 32) {
    throw new Error(
      'NEON_AUTH_COOKIE_SECRET is missing or shorter than 32 characters. Set it on the Cloudflare Worker (openssl rand -base64 32).',
    );
  }
  return { baseUrl, secret };
}

export function getAuth(): NeonAuth {
  if (_auth) return _auth;
  const { baseUrl, secret } = assertNeonAuthEnv();
  _auth = createNeonAuth({
    baseUrl,
    cookies: {
      secret,
      // Cross-site WebView / mobile need None+Secure when applicable;
      // Neon SDK defaults are usually fine for same-origin crestarhq.com.
    },
    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  });
  return _auth;
}

/**
 * Compatibility surface:
 * - auth.handler() → Neon route handlers
 * - auth.getSession() → Neon SDK
 * - auth.api.getSession({ headers }) → legacy Crestar / Anything callers
 * - auth.signIn / signUp / signOut → Neon SDK methods
 */
export const auth = new Proxy({} as NeonAuth & {
  api: {
    getSession: (opts?: { headers?: Headers }) => Promise<unknown>;
  };
}, {
  get(_target, prop, receiver) {
    const instance = getAuth();

    if (prop === 'api') {
      return {
        async getSession(_opts?: { headers?: Headers }) {
          try {
            const result = await instance.getSession();
            // Neon returns { data, error }; legacy code expects session | null
            return result?.data ?? null;
          } catch (err) {
            console.error('[auth] getSession failed:', err);
            return null;
          }
        },
      };
    }

    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export type Session = Awaited<ReturnType<NeonAuth['getSession']>> extends {
  data: infer D;
}
  ? D
  : unknown;
