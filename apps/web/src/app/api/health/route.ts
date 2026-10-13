/**
 * Lightweight health check — does not expose secret values.
 * 503 means required runtime config is missing (same root as auth 500s).
 */
import { getAuthEnvPresence } from '@/lib/auth-env';

export async function GET() {
  const presence = await getAuthEnvPresence();
  const ok =
    presence.DATABASE_URL &&
    presence.NEON_AUTH_BASE_URL &&
    presence.NEON_AUTH_COOKIE_SECRET;

  return Response.json(
    {
      ok,
      service: 'crestar-web',
      auth: 'neon-managed-better-auth',
      checks: {
        DATABASE_URL: presence.DATABASE_URL,
        NEON_AUTH_BASE_URL: presence.NEON_AUTH_BASE_URL,
        NEON_AUTH_COOKIE_SECRET: presence.NEON_AUTH_COOKIE_SECRET,
      },
      // Names only — which resolver saw each key
      sources: presence.sources,
    },
    { status: ok ? 200 : 503 },
  );
}
