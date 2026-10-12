/**
 * Lightweight health check — does not expose secret values.
 */
export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const neonAuthBase = Boolean(process.env.NEON_AUTH_BASE_URL?.trim());
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET?.trim() || '';
  const hasCookieSecret = cookieSecret.length >= 32;

  // Auth works with Neon Managed Better Auth; DATABASE_URL still needed for app data.
  const ok = hasDatabaseUrl && neonAuthBase && hasCookieSecret;

  return Response.json(
    {
      ok,
      service: 'crestar-web',
      auth: 'neon-managed-better-auth',
      checks: {
        DATABASE_URL: hasDatabaseUrl,
        NEON_AUTH_BASE_URL: neonAuthBase,
        NEON_AUTH_COOKIE_SECRET: hasCookieSecret,
      },
    },
    { status: ok ? 200 : 503 },
  );
}
