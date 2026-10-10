/**
 * Crestar Better Auth — Neon Postgres + social providers
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { argon2Verify } from 'argon2-wasm-edge';
import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { verifyPassword } from 'better-auth/crypto';
import { bearer } from 'better-auth/plugins';
import { importPKCS8, SignJWT } from 'jose';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const trustedOrigins = [
  'https://crestarhq.com',
  'https://www.crestarhq.com',
  process.env.BETTER_AUTH_URL,
  process.env.EXPO_PUBLIC_PROXY_BASE_URL,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((o) => o.trim()) ?? []),
].filter((v): v is string => Boolean(v));

/**
 * Apple's client_secret is a short-lived JWT (max ~6 months), not a fixed string.
 * Build it from the Services ID + Team ID + Key ID + .p8 private key.
 * Prefer this over a static APPLE_CLIENT_SECRET env value.
 */
async function generateAppleClientSecret(
  clientId: string,
  teamId: string,
  keyId: string,
  privateKeyPem: string,
): Promise<string> {
  // Cloudflare / env often stores newlines as \n
  const pem = privateKeyPem.replace(/\r\n/g, '\n').replace(/\\n/g, '\n').trim();
  const key = await importPKCS8(pem, 'ES256');
  const now = Math.floor(Date.now() / 1000);
  // 180 days — under Apple's 6-month limit
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

console.log('🔐 [Better Auth] Configuration:', {
  hasDatabaseURL: !!process.env.DATABASE_URL,
  hasSecret: !!(process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET),
  secretLength: (process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || '').length,
  trustedOrigins,
  socialProvidersEnabled: {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    apple: appleEnabled,
    appleMode: hasAppleDynamicCreds()
      ? 'dynamic_jwt'
      : hasAppleStaticSecret()
        ? 'static_secret_fallback'
        : 'off',
  },
});

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

// Async provider config so the Apple JWT is signed when Better Auth needs it
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
  // Migration path only — rotate to dynamic JWT when you can
  socialProviders.apple = {
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
    appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER || 'com.crestar.hq',
  };
}

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
  socialProviders: socialProviders as any,
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

console.log('✅ [Better Auth] Initialized successfully');

export type Session = typeof auth.$Infer.Session;
