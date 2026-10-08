'use client';

import { authClient } from '@/lib/auth-client';

/**
 * Better Auth (Anything v2) error helpers.
 *
 * Better Auth returns errors shaped like:
 *   { error: { message: string, code: string, status: number, statusText: string } }
 *
 * The legacy V1 (NextAuth) codes — OAuthSignin, CredentialsSignin, Callback,
 * AccessDenied, Configuration, Verification … — are never produced by v2, so
 * any lookup table built around them always falls through to a generic
 * "Something went wrong" string. These helpers speak Better Auth's language.
 */

export type AuthErrorLike =
  | {
      code?: string | null;
      status?: number | null;
      statusText?: string | null;
      message?: string | null;
    }
  | string
  | null
  | undefined;

const SHARED_CODES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Incorrect email or password. Try again or reset your password.',
  INVALID_PASSWORD: 'Incorrect email or password. Try again or reset your password.',
  INVALID_EMAIL: 'That email address does not look right. Please check it and try again.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address before continuing.',
  SESSION_EXPIRED: 'Your session expired. Please sign in again.',
  FAILED_TO_CREATE_SESSION: "We couldn't start your session. Please try again.",
  FAILED_TO_GET_SESSION: "We couldn't confirm your session. Please try again.",
  INVALID_TOKEN: 'That link is no longer valid. Please request a new one.',
  INVALID_ORIGIN: "Sign-in isn't configured for this address. Please contact support.",
  TOO_MANY_REQUESTS: 'Too many attempts. Please wait a moment and try again.',
};

const SIGN_IN_CODES: Record<string, string> = {
  USER_NOT_FOUND: 'No account found with that email. Create one to get started.',
  ACCOUNT_NOT_FOUND: 'No account found with that email. Create one to get started.',
  CREDENTIAL_ACCOUNT_NOT_FOUND:
    'This email is registered with a different sign-in method. Try that option instead.',
  ACCOUNT_NOT_LINKED:
    'This email is linked to a different sign-in method. Try that option instead.',
  BANNED_USER: 'This account has been suspended. Please contact support.',
};

const SIGN_UP_CODES: Record<string, string> = {
  USER_ALREADY_EXISTS: 'That email is already registered. Try signing in instead.',
  USER_EMAIL_ALREADY_EXISTS: 'That email is already registered. Try signing in instead.',
  EMAIL_CAN_NOT_BE_UPDATED: 'That email is already registered. Try signing in instead.',
  PASSWORD_TOO_SHORT: 'Your password must be at least 8 characters long.',
  PASSWORD_TOO_LONG: 'That password is too long. Please choose a shorter one.',
  FAILED_TO_CREATE_USER: "We couldn't create your account. Please try again.",
};

function messageFromStatus(status: number | null | undefined): string | null {
  if (!status) return null;
  if (status === 401) return 'Incorrect email or password. Try again or reset your password.';
  if (status === 403) return "Sign-in isn't configured for this address. Please contact support.";
  if (status === 404) return 'No account found with that email. Create one to get started.';
  if (status === 422) return 'Please check the details you entered and try again.';
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (status >= 500) return 'Our server had a problem. Please try again in a moment.';
  return null;
}

function normalizeCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * Turn a Better Auth error (or an `?error=` query param) into a sentence a
 * person can act on. Falls back to the server's own message rather than a
 * generic string, so real failures are never hidden.
 */
export function getFriendlyAuthError(
  error: AuthErrorLike,
  mode: 'signin' | 'signup' = 'signin'
): string | null {
  if (!error) return null;

  const table = { ...SHARED_CODES, ...(mode === 'signup' ? SIGN_UP_CODES : SIGN_IN_CODES) };

  if (typeof error === 'string') {
    const direct = table[normalizeCode(error)];
    if (direct) return direct;
    // A URL error param that isn't a known code: show it only if it reads
    // like a sentence, otherwise fall back to a safe generic.
    return error.includes(' ') ? error : 'Something went wrong. Please try again.';
  }

  const code = error.code ? normalizeCode(String(error.code)) : null;
  if (code && table[code]) return table[code];

  const fromStatus = messageFromStatus(
    typeof error.status === 'number' ? error.status : Number(error.status) || null
  );
  if (fromStatus) return fromStatus;

  if (error.message && error.message.trim().length > 0) return error.message;
  if (code) return code.replace(/_/g, ' ').toLowerCase();

  return 'Something went wrong. Please try again.';
}

/**
 * Detect whether this page is being rendered inside the mobile auth WebView
 * (native) or the Expo-web auth iframe.
 *
 * The user-agent is NOT a reliable signal — WKWebView reports a plain Safari
 * UA with no "Expo" in it. `window.ReactNativeWebView` is injected at
 * document-end, so it can be missing at mount but present at submit time.
 * The callbackUrl query param is the dependable signal, so it comes first.
 */
export function isMobileWebViewContext(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl');
    if (
      callbackUrl &&
      (callbackUrl.includes('/api/auth/expo-web-success') || callbackUrl.includes('/(tabs)'))
    ) {
      return true;
    }
  } catch {
    // ignore — fall through to the runtime bridge check
  }

  return Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView);
}

/**
 * Confirm the session cookie is actually readable before navigating away.
 *
 * Better Auth sets the cookie on an XHR response; the WebView then performs a
 * top-level navigation to /api/auth/expo-web-success which re-reads it. On iOS
 * WKWebView and Android WebView that is a race — the cookie jar may not have
 * committed yet, the endpoint sees no session and posts AUTH_ERROR even though
 * the session row was already written. Polling getSession removes the race.
 */
export async function waitForSession(attempts = 4, delayMs = 250) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const { data } = await authClient.getSession();
      if (data?.user) return data;
    } catch (err) {
      console.error('[auth] getSession check failed', err);
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

export const EXPO_SUCCESS_PATH = '/api/auth/expo-web-success';
