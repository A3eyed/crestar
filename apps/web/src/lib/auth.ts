/**
 * ⚠ ANYTHING PLATFORM — DO NOT REWRITE THIS FILE ⚠
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { argon2Verify } from 'argon2-wasm-edge';
import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { verifyPassword } from 'better-auth/crypto';
import { bearer } from 'better-auth/plugins';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Origins we accept auth requests from
const trustedOrigins = [
  'https://crestarhq.com',
  'https://www.crestarhq.com',
  process.env.BETTER_AUTH_URL,
  process.env.EXPO_PUBLIC_PROXY_BASE_URL,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((o) => o.trim()) ?? []),
].filter((v): v is string => Boolean(v));

// ✅ FIX: Log auth configuration at startup (without exposing secrets)
console.log('🔐 [Better Auth] Configuration:', {
  hasDatabaseURL: !!process.env.DATABASE_URL,
  hasSecret: !!(process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET),
  secretLength: (process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || '').length,
  trustedOrigins,
  socialProvidersEnabled: {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    apple: !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET),
  },
});

// Social providers self-activate when credentials are available
const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
    ? {
        apple: {
          clientId: process.env.APPLE_CLIENT_ID,
          clientSecret: process.env.APPLE_CLIENT_SECRET,
          appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER || 'com.crestar.hq',
        },
      }
    : {}),
};

async function verifyCompatiblePassword({ hash, password }: { hash: string; password: string }) {
  if (hash.startsWith('$argon2')) {
    return argon2Verify({
      hash,
      password,
    });
  }

  return verifyPassword({
    hash,
    password,
  });
}

// The app is always served over HTTPS (preview, published web, and the mobile
// auth WebView), and the web preview runs inside a cross-site iframe — so
// cookies must be SameSite=None + Secure to be accepted in all contexts.
const cookieConfig = {
  sameSite: 'none' as const,
  secure: true,
  httpOnly: true,
  path: '/',
};

console.log('🍪 [Better Auth] Cookie Config:', {
  sameSite: cookieConfig.sameSite,
  secure: cookieConfig.secure,
});

export const auth = betterAuth({
  database: pool,
  trustedOrigins,
  socialProviders,
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
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
      maxAge: 60 * 60 * 24 * 7, // 7 days
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

console.log('✅ [Better Auth] Initialized successfully');

export type Session = typeof auth.$Infer.Session;
