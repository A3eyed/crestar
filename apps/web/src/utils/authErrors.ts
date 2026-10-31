'use client';

import { authClient } from '@/lib/auth-client';

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
  EMAIL_NOT_VERIFIED:
    'Please verify your email before signing in. Check your inbox for a verification link from Crestar.',
  SESSION_EXPIRED: 'Your session expired. Please sign in again.',
  FAILED_TO_CREATE_SESSION: "We couldn't start your session. Please try again.",
  FAILED_TO_GET_SESSION: "We couldn't confirm your session. Please try again.",
  INVALID_TOKEN: 'That link is no longer valid. Please request a new one.',
  INVALID_ORIGIN: "Sign-in isn't configured for this address. Please contact support.",
  TOO_MANY_REQUESTS: 'Too many attempts. Please wait a few minutes and try again.',
  ACCOUNT_LOCKED:
    'This account is temporarily locked after too many failed sign-ins. Wait a few minutes or reset your password.',
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
  if (status === 403)
    return 'Please verify your email before signing in, or contact support if this keeps happening.';
  if (status === 404) return 'No account found with that email. Create one to get started.';
  if (status === 422) return 'Please check the details you entered and try again.';
  if (status === 429)
    return 'Too many attempts. Please wait a few minutes and try again, or reset your password.';
  if (status >= 500) return 'Our server had a problem. Please try again in a moment.';
  return null;
}

function normalizeCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

export function getFriendlyAuthError(
  error: AuthErrorLike,
  mode: 'signin' | 'signup' = 'signin'
): string | null {
  if (!error) return null;

  const table = { ...SHARED_CODES, ...(mode === 'signup' ? SIGN_UP_CODES : SIGN_IN_CODES) };

  if (typeof error === 'string') {
    const direct = table[normalizeCode(error)];
    if (direct) return direct;
    return error.includes(' ') ? error : 'Something went wrong. Please try again.';
  }

  const code = error.code ? normalizeCode(String(error.code)) : null;
  if (code && table[code]) return table[code];

  if (error.message && /locked|too many attempts|rate limit|try again in/i.test(error.message)) {
    return error.message;
  }

  const fromStatus = messageFromStatus(
    typeof error.status === 'number' ? error.status : Number(error.status) || null
  );
  if (fromStatus) return fromStatus;

  if (error.message && error.message.trim().length > 0) {
    if (/email not verified/i.test(error.message)) {
      return SHARED_CODES.EMAIL_NOT_VERIFIED;
    }
    return error.message;
  }
  if (code) return code.replace(/_/g, ' ').toLowerCase();

  return 'Something went wrong. Please try again.';
}

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
    // ignore
  }

  return Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView);
}

export async function waitForSession(attempts = 6, delayMs = 300) {
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

/** Message when Neon creates the user but withholds a session (email verification). */
export const SIGNUP_VERIFY_EMAIL_MESSAGE =
  'Account created. Check your email to verify your address, then sign in.';
