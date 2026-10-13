/**
 * Resolve runtime env for Neon Managed Better Auth.
 * Prefers process.env (nodejs_compat), falls back to OpenNext Cloudflare context.
 * Never logs secret values.
 */

export type AuthEnvPresence = {
  DATABASE_URL: boolean;
  NEON_AUTH_BASE_URL: boolean;
  NEON_AUTH_COOKIE_SECRET: boolean;
  sources: {
    processEnv: string[];
    cloudflareEnv: string[];
  };
};

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function readCloudflareEnvString(name: string): Promise<string | undefined> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    const env = ctx?.env as Record<string, unknown> | undefined;
    return readString(env?.[name]);
  } catch {
    return undefined;
  }
}

export async function getEnvString(name: string): Promise<string | undefined> {
  const fromProcess = readString(process.env[name]);
  if (fromProcess) return fromProcess;
  return readCloudflareEnvString(name);
}

export async function getAuthEnvPresence(): Promise<AuthEnvPresence> {
  const names = ['DATABASE_URL', 'NEON_AUTH_BASE_URL', 'NEON_AUTH_COOKIE_SECRET'] as const;
  const processEnv: string[] = [];
  const cloudflareEnv: string[] = [];

  for (const name of names) {
    if (readString(process.env[name])) processEnv.push(name);
    if (await readCloudflareEnvString(name)) cloudflareEnv.push(name);
  }

  const has = async (name: (typeof names)[number]) => Boolean(await getEnvString(name));

  const cookie = await getEnvString('NEON_AUTH_COOKIE_SECRET');

  return {
    DATABASE_URL: await has('DATABASE_URL'),
    NEON_AUTH_BASE_URL: await has('NEON_AUTH_BASE_URL'),
    NEON_AUTH_COOKIE_SECRET: Boolean(cookie && cookie.length >= 32),
    sources: { processEnv, cloudflareEnv },
  };
}

/** Safe fields only — never include secret values */
export function safeErrorInfo(err: unknown): {
  name: string;
  message: string;
  causeMessage?: string;
} {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    const causeMessage =
      cause instanceof Error
        ? cause.message
        : cause != null
          ? String(cause)
          : undefined;
    return {
      name: err.name || 'Error',
      message: err.message || '(empty message)',
      causeMessage,
    };
  }
  return { name: typeof err, message: String(err) };
}
