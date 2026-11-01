'use client';

import { authClient } from '@/lib/auth-client';
import { useCallback } from 'react';

type AuthOptions = {
  callbackURL?: string;
  callbackUrl?: string;
  redirect?: boolean;
  email?: string;
  name?: string;
  password?: string;
};

function resolveAppCallbackPath(options: AuthOptions = {}): string {
  const raw = options.callbackURL || options.callbackUrl;
  if (typeof window === 'undefined') {
    if (raw && raw.startsWith('/')) return raw;
    return '/';
  }
  if (raw) {
    // Absolute same-origin URL → path only for Neon trusted-domain safety
    try {
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        const u = new URL(raw);
        if (u.origin === window.location.origin) {
          return `${u.pathname}${u.search}` || '/';
        }
        // Foreign origin not allowed as post-auth landing
        return '/';
      }
    } catch {
      /* ignore */
    }
    if (raw.startsWith('/')) return raw;
  }
  const fromQuery = new URLSearchParams(window.location.search).get('callbackUrl');
  if (fromQuery && fromQuery.startsWith('/')) return fromQuery;
  return '/';
}

/** Full origin URL Neon redirects to after OAuth (must be a trusted domain). */
function toTrustedCallbackURL(path: string): string {
  if (typeof window === 'undefined') return path || '/';
  const p = path?.startsWith('/') ? path : '/';
  return `${window.location.origin}${p}`;
}

/**
 * Better Auth / Neon social sign-in: API returns { url } and the client should
 * navigate there. Some builds do not auto-redirect when going through the
 * Next proxy — always assign when a URL is present.
 */
async function socialSignIn(provider: string, options: AuthOptions = {}) {
  const path = resolveAppCallbackPath(options);
  const callbackURL = toTrustedCallbackURL(path);
  const errorCallbackURL = toTrustedCallbackURL(
    `/account/signin?error=${encodeURIComponent(provider)}`,
  );

  const result = await authClient.signIn.social({
    provider,
    callbackURL,
    errorCallbackURL,
    // Prefer explicit navigation below so we never hang on "Connecting…"
    disableRedirect: true,
  } as {
    provider: string;
    callbackURL: string;
    errorCallbackURL: string;
    disableRedirect?: boolean;
  });

  const err =
    (result as { error?: { message?: string; status?: number; statusText?: string } })?.error;
  if (err) {
    return { data: null, error: err };
  }

  const data = (result as { data?: { url?: string; redirect?: boolean } })?.data;
  const url =
    data?.url ||
    (result as { url?: string })?.url ||
    // Some clients put the redirect on the root
    (typeof result === 'object' && result && 'redirect' in result
      ? null
      : null);

  if (url && typeof url === 'string') {
    window.location.assign(url);
    // Keep promise pending while the browser navigates away
    return new Promise(() => {}) as Promise<{ data: null; error: null }>;
  }

  // Fallback: try without disableRedirect so the SDK can navigate
  const retry = await authClient.signIn.social({
    provider,
    callbackURL,
    errorCallbackURL,
  } as { provider: string; callbackURL: string; errorCallbackURL: string });

  const retryErr = (retry as { error?: { message?: string } })?.error;
  if (retryErr) {
    return { data: null, error: retryErr };
  }

  const retryUrl = (retry as { data?: { url?: string } })?.data?.url;
  if (retryUrl) {
    window.location.assign(retryUrl);
    return new Promise(() => {}) as Promise<{ data: null; error: null }>;
  }

  return {
    data: null,
    error: {
      message:
        'Apple sign-in did not return a redirect URL. Check that Apple is enabled in Neon Auth and the Services ID return URL matches the Neon callback.',
    },
  };
}

function useAuth() {
  const signInWithCredentials = useCallback(
    (options: AuthOptions = {}) =>
      authClient.signIn.email({
        email: options.email ?? '',
        password: options.password ?? '',
      }),
    [],
  );

  const signUpWithCredentials = useCallback(
    (options: AuthOptions = {}) =>
      authClient.signUp.email({
        email: options.email ?? '',
        password: options.password ?? '',
        name: options.name ?? options.email?.split('@')[0] ?? 'User',
      }),
    [],
  );

  const signInWithGoogle = useCallback(
    (options: AuthOptions = {}) => socialSignIn('google', options),
    [],
  );

  const signInWithApple = useCallback(
    (options: AuthOptions = {}) => socialSignIn('apple', options),
    [],
  );

  const signInWithFacebook = useCallback(
    (options: AuthOptions = {}) => socialSignIn('facebook', options),
    [],
  );

  const signInWithTwitter = useCallback(
    (options: AuthOptions = {}) => socialSignIn('twitter', options),
    [],
  );

  const signOut = useCallback(async (options: AuthOptions = {}) => {
    const path = resolveAppCallbackPath(options);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          if (typeof window !== 'undefined') {
            window.location.href = path || '/';
          }
        },
      },
    });
  }, []);

  return {
    signInWithCredentials,
    signUpWithCredentials,
    signInWithGoogle,
    signInWithApple,
    signInWithFacebook,
    signInWithTwitter,
    signOut,
  };
}

export default useAuth;
