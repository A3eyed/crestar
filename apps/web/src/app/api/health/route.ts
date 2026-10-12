/**
 * Lightweight health check — does not expose secret values.
 * Confirms which required runtime env vars are present on the Worker.
 */
export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const secret =
    process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || '';
  const hasAuthSecret = secret.length >= 16;
  const betterAuthUrl = process.env.BETTER_AUTH_URL || null;

  const ok = hasDatabaseUrl && hasAuthSecret;

  return Response.json(
    {
      ok,
      service: 'crestar-web',
      checks: {
        DATABASE_URL: hasDatabaseUrl,
        BETTER_AUTH_SECRET: hasAuthSecret,
        BETTER_AUTH_URL: Boolean(betterAuthUrl),
      },
      betterAuthUrl,
    },
    { status: ok ? 200 : 503 },
  );
}
