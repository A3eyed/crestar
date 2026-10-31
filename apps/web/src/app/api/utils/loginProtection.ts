// @ts-nocheck
/**
 * Login protection for Crestar auth endpoints.
 *
 * - IP rate limiting: caps volume of auth attempts from one address
 * - Account soft lockout: temporary lock after repeated failures on one email
 *
 * Stored in Postgres so limits survive across Cloudflare Worker isolates.
 * Soft locks (time-based) avoid permanent lockout / easy user DoS.
 */
import sql from '@/app/api/utils/sql';

const IP_WINDOW_MS = 15 * 60 * 1000;
const IP_MAX_ATTEMPTS = 40;
const IP_LOCK_MS = 15 * 60 * 1000;

const ACCOUNT_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_MAX_FAILURES = 8;
const ACCOUNT_LOCK_MS = 15 * 60 * 1000;

let tableReady = false;

async function ensureGuardTable() {
  if (tableReady) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS public.auth_login_guards (
        guard_key text PRIMARY KEY,
        attempt_count integer NOT NULL DEFAULT 0,
        window_started_at timestamptz NOT NULL DEFAULT now(),
        locked_until timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    tableReady = true;
  } catch (e) {
    console.error('[loginProtection] ensure table failed:', e?.message || e);
  }
}

export function getClientIp(request: Request): string {
  const headers = request.headers;
  const cf = headers.get('cf-connecting-ip');
  if (cf && cf.trim()) return cf.trim().slice(0, 64);

  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }

  const real = headers.get('x-real-ip');
  if (real && real.trim()) return real.trim().slice(0, 64);

  return 'unknown';
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email.slice(0, 320);
}

/** Paths that must be rate-limited / lockout-checked */
export function isAuthSensitivePath(pathParts: string[] | undefined | null): boolean {
  if (!pathParts?.length) return false;
  const p = pathParts.join('/').toLowerCase();
  return (
    p.includes('sign-in') ||
    p.includes('signin') ||
    p.includes('sign-up') ||
    p.includes('signup') ||
    p.includes('forget-password') ||
    p.includes('forgot-password') ||
    p.includes('reset-password') ||
    p.includes('request-password') ||
    p.includes('send-verification')
  );
}

export function isCredentialSignInPath(pathParts: string[] | undefined | null): boolean {
  if (!pathParts?.length) return false;
  const p = pathParts.join('/').toLowerCase();
  return (
    (p.includes('sign-in') || p.includes('signin')) &&
    (p.includes('email') || p.endsWith('sign-in') || p.endsWith('signin'))
  );
}

function secondsUntil(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const t = new Date(date).getTime() - Date.now();
  return t > 0 ? Math.ceil(t / 1000) : 0;
}

async function readGuard(key: string) {
  const [row] = await sql`
    SELECT guard_key, attempt_count, window_started_at, locked_until
    FROM public.auth_login_guards
    WHERE guard_key = ${key}
    LIMIT 1
  `;
  return row || null;
}

async function upsertGuard({
  key,
  attemptCount,
  windowStartedAt,
  lockedUntil,
}: {
  key: string;
  attemptCount: number;
  windowStartedAt: Date;
  lockedUntil: Date | null;
}) {
  await sql`
    INSERT INTO public.auth_login_guards (
      guard_key, attempt_count, window_started_at, locked_until, updated_at
    )
    VALUES (
      ${key},
      ${attemptCount},
      ${windowStartedAt.toISOString()},
      ${lockedUntil ? lockedUntil.toISOString() : null},
      NOW()
    )
    ON CONFLICT (guard_key) DO UPDATE SET
      attempt_count = EXCLUDED.attempt_count,
      window_started_at = EXCLUDED.window_started_at,
      locked_until = EXCLUDED.locked_until,
      updated_at = NOW()
  `;
}

async function clearGuard(key: string) {
  await sql`DELETE FROM public.auth_login_guards WHERE guard_key = ${key}`;
}

export type LoginGuardResult =
  | { ok: true }
  | {
      ok: false;
      status: 429;
      code: 'TOO_MANY_REQUESTS' | 'ACCOUNT_LOCKED';
      message: string;
      retryAfterSeconds: number;
    };

/**
 * Call before forwarding a sensitive auth request.
 * Increments the IP counter. Account lock is checked (not incremented) here;
 * failures are recorded via recordAuthFailure after a bad credential response.
 */
export async function assertLoginAllowed(
  request: Request,
  options: { email?: string | null; pathParts?: string[] } = {},
): Promise<LoginGuardResult> {
  await ensureGuardTable();

  const ip = getClientIp(request);
  const ipKey = `ip:${ip}`;
  const now = Date.now();

  try {
    // --- IP rate limit ---
    let ipRow = await readGuard(ipKey);
    if (ipRow?.locked_until && new Date(ipRow.locked_until).getTime() > now) {
      const retryAfterSeconds = secondsUntil(ipRow.locked_until);
      return {
        ok: false,
        status: 429,
        code: 'TOO_MANY_REQUESTS',
        message: `Too many attempts from this network. Try again in ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} minute(s).`,
        retryAfterSeconds,
      };
    }

    let ipCount = 0;
    let ipWindowStart = new Date(now);
    if (ipRow) {
      const windowAge = now - new Date(ipRow.window_started_at).getTime();
      if (windowAge < IP_WINDOW_MS) {
        ipCount = Number(ipRow.attempt_count) || 0;
        ipWindowStart = new Date(ipRow.window_started_at);
      }
    }
    ipCount += 1;

    let ipLockedUntil: Date | null = null;
    if (ipCount > IP_MAX_ATTEMPTS) {
      ipLockedUntil = new Date(now + IP_LOCK_MS);
      await upsertGuard({
        key: ipKey,
        attemptCount: ipCount,
        windowStartedAt: ipWindowStart,
        lockedUntil: ipLockedUntil,
      });
      const retryAfterSeconds = secondsUntil(ipLockedUntil);
      return {
        ok: false,
        status: 429,
        code: 'TOO_MANY_REQUESTS',
        message: `Too many attempts from this network. Try again in ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} minute(s).`,
        retryAfterSeconds,
      };
    }

    await upsertGuard({
      key: ipKey,
      attemptCount: ipCount,
      windowStartedAt: ipWindowStart,
      lockedUntil: null,
    });

    // --- Account soft lock (credential sign-in only) ---
    const email = normalizeEmail(options.email);
    if (email && isCredentialSignInPath(options.pathParts)) {
      const acctKey = `email:${email}`;
      const acct = await readGuard(acctKey);
      if (acct?.locked_until && new Date(acct.locked_until).getTime() > now) {
        const retryAfterSeconds = secondsUntil(acct.locked_until);
        return {
          ok: false,
          status: 429,
          code: 'ACCOUNT_LOCKED',
          message: `This account is temporarily locked after too many failed sign-ins. Try again in ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} minute(s), or reset your password.`,
          retryAfterSeconds,
        };
      }
    }

    return { ok: true };
  } catch (e) {
    // Fail open on infrastructure errors so real users are not locked out of login
    console.error('[loginProtection] assertLoginAllowed error:', e?.message || e);
    return { ok: true };
  }
}

/** Record a failed credential sign-in for account lockout. */
export async function recordAuthFailure(emailRaw: string | null | undefined) {
  const email = normalizeEmail(emailRaw);
  if (!email) return;
  await ensureGuardTable();
  const key = `email:${email}`;
  const now = Date.now();

  try {
    const row = await readGuard(key);
    let count = 0;
    let windowStart = new Date(now);

    if (row) {
      const windowAge = now - new Date(row.window_started_at).getTime();
      if (windowAge < ACCOUNT_WINDOW_MS) {
        count = Number(row.attempt_count) || 0;
        windowStart = new Date(row.window_started_at);
      }
    }
    count += 1;

    let lockedUntil: Date | null = null;
    if (count >= ACCOUNT_MAX_FAILURES) {
      lockedUntil = new Date(now + ACCOUNT_LOCK_MS);
    }

    await upsertGuard({
      key,
      attemptCount: count,
      windowStartedAt: windowStart,
      lockedUntil,
    });
  } catch (e) {
    console.error('[loginProtection] recordAuthFailure error:', e?.message || e);
  }
}

/** Clear account failure state after a successful sign-in. */
export async function recordAuthSuccess(emailRaw: string | null | undefined) {
  const email = normalizeEmail(emailRaw);
  if (!email) return;
  await ensureGuardTable();
  try {
    await clearGuard(`email:${email}`);
  } catch (e) {
    console.error('[loginProtection] recordAuthSuccess error:', e?.message || e);
  }
}

export function guardDeniedResponse(result: Extract<LoginGuardResult, { ok: false }>): Response {
  return Response.json(
    {
      error: result.code,
      code: result.code,
      message: result.message,
      status: result.status,
      retryAfter: result.retryAfterSeconds,
    },
    {
      status: result.status,
      headers: {
        'Retry-After': String(result.retryAfterSeconds || 60),
        'Cache-Control': 'no-store',
      },
    },
  );
}

/** Peek email from a JSON body without consuming the original Request. */
export async function peekEmailFromRequest(request: Request): Promise<string | null> {
  try {
    const clone = request.clone();
    const body = await clone.json();
    return normalizeEmail(body?.email ?? body?.Email ?? null);
  } catch {
    return null;
  }
}
