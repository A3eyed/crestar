/**
 * Crestar Better Auth — Neon Postgres + social providers
 *
 * Cloudflare Workers: use the platform WebSocket (do NOT import Node `ws`).
 * Node local/dev: polyfill WebSocket via `ws` only when global WebSocket is missing.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { argon2Verify } from 'argon2-wasm-edge';
import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { verifyPassword } from 'better-auth/crypto';
import { bearer } from 'better-auth/plugins';
import { importPKCS8, SignJWT } from 'jose';

// Neon Pool uses WebSockets. Workers already provide WebSocket globally.
if (typeof WebSocket === 'undefined') {
  // Node.js only — dynamic require so the Workers bundle does not load `ws`
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const wsModule = require('ws');
    neonConfig.webSocketConstructor = wsModule;
  } catch {
    // leave unset; Neon will error clearly if WebSocket is unavailable
  }
} else {
  neonConfig.webSocketConstructor = WebSocket;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Add it as a secret on the Cloudflare Worker (crestar).',
    );
  }
  return new Pool({ connectionString });
}

// One pool per isolate is OK for long-lived Node; on Workers the serverless
// driver still expects connect/query within the request. Pool is created lazily
// so missing env fails with a clear message instead of an opaque 500 at import.
let pool: Pool | null = null;
function getPool() {
  if (!pool) pool = createPool();
  return pool;
}

const trustedOrigins = [
  'https://crestarhq.com',
  'https://www.crestarhq.com',
  process.env.BETTER_AUTH_URL,
  process.env.EXPO_PUBLIC_PROXY_BASE_URL,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((o) => o.trim()) ?? []),
].filter((v): v is string => Boolean(v));

async function generateAppleClientSecret(
  clientId: string,
  teamId: string,
  keyId: string,
  privateKeyPem: string,
): Promise<string> {
  const pem = privateKeyPem.replace(/\r\n/g, '\n').replace(/\\n/g, '\n').trim();
  const key = await importPKCS8(pem, 'ES256');
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 180 * 24 * 60 * 60;

  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);
}

function hasAppleDynamicCreds() {
  return Boolean(
    process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY,
  );
}

function hasAppleStaticSecret() {
  return Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET);
}

const appleEnabled = hasAppleDynamicCreds() || hasAppleStaticSecret();

const socialProviders: Record<string, unknown> = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
};

if (hasAppleDynamicCreds()) {
  socialProviders.apple = async () => {
    const clientId = process.env.APPLE_CLIENT_ID as string;
    const clientSecret = await generateAppleClientSecret(
      clientId,
      process.env.APPLE_TEAM_ID as string,
      process.env.APPLE_KEY_ID as string,
      process.env.APPLE_PRIVATE_KEY as string,
    );
    return {
      clientId,
      clientSecret,
      appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER || 'com.crestar.hq',
    };
  };
} else if (hasAppleStaticSecret()) {
  socialProviders.apple = {
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
    appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER || 'com.crestar.hq',
  };
}

async function verifyCompatiblePassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}) {
  if (hash.startsWith('$argon2')) {
    return argon2Verify({ hash, password });
  }
  return verifyPassword({ hash, password });
}

const cookieConfig = {
  sameSite: 'none' as const,
  secure: true,
  httpOnly: true,
  path: '/',
};

const authSecret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;

function assertAuthEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set on the Worker');
  }
  if (!authSecret || authSecret.length < 16) {
    throw new Error(
      'BETTER_AUTH_SECRET is missing or too short (set a 32+ char secret on the Worker)',
    );
  }
}

// Lazy init so OpenNext can load the module; first request validates env.
let _auth: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
  if (_auth) return _auth;
  assertAuthEnv();
  _auth = betterAuth({
    database: getPool(),
    baseURL: process.env.BETTER_AUTH_URL || 'https://crestarhq.com',
    trustedOrigins,
    socialProviders: socialProviders as any,
    secret: authSecret,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      password: {
        verify: verifyCompatiblePassword,
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/sign-up/email') return;
        const body = ctx.body as { email?: unknown; name?: unknown } | undefined;
        if (!body || typeof body.email !== 'string') return;
        if (typeof body.name === 'string' && body.name.trim().length > 0) return;
        const derived = body.email.split('@')[0];
        body.name = derived && derived.length > 0 ? derived : 'User';
      }),
    },
    advanced: {
      cookiePrefix: 'better-auth',
      defaultCookieAttributes: cookieConfig,
      cookies: {
        sessionToken: {
          attributes: {
            sameSite: cookieConfig.sameSite,
            secure: cookieConfig.secure,
          },
        },
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 24 * 7,
      },
    },
    user: {
      additionalFields: {
        image: {
          type: 'string',
          required: false,
        },
      },
    },
    plugins: [bearer()],
  });
  return _auth;
}

/** @deprecated Prefer getAuth() — kept for existing imports */
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop, receiver) {
    const instance = getAuth();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export type Session = typeof auth.$Infer.Session;
