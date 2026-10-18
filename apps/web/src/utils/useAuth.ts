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

// Platform-compliant auth hook for web applications
// Wraps Better Auth client with backward-compatible API
function useAuth() {
  const getCallbackUrl = useCallback((options: AuthOptions = {}) => {
    const callback = options.callbackURL || options.callbackUrl;
    if (callback) return callback;
    if (typeof window === 'undefined') return undefined;
    return new URLSearchParams(window.location.search).get('callbackUrl') ?? undefined;
  }, []);

  const signInWithCredentials = useCallback(
    (options: AuthOptions = {}) =>
      // Plain Better Auth call — the pages handle navigation after success,
      // so we never pass callbackURL or mutate the request body.
      authClient.signIn.email({
        email: options.email ?? '',
        password: options.password ?? '',
      }),
    []
  );

  const signUpWithCredentials = useCallback(
    (options: AuthOptions = {}) =>
      authClient.signUp.email({
        email: options.email ?? '',
        password: options.password ?? '',
        name: options.name ?? options.email?.split('@')[0] ?? 'User',
      }),
    []
  );

  const signInWithGoogle = useCallback(
    (options: AuthOptions = {}) =>
      authClient.signIn.social({
        provider: 'google',
        callbackURL: getCallbackUrl(options),
      }),
    [getCallbackUrl]
  );

  const signInWithFacebook = useCallback(
    (options: AuthOptions = {}) =>
      authClient.signIn.social({
        provider: 'facebook',
        callbackURL: getCallbackUrl(options),
      }),
    [getCallbackUrl]
  );

  const signInWithTwitter = useCallback(
    (options: AuthOptions = {}) =>
      authClient.signIn.social({
        provider: 'twitter',
        callbackURL: getCallbackUrl(options),
      }),
    [getCallbackUrl]
  );

  const signOut = useCallback(
    async (options: AuthOptions = {}) => {
      const callbackUrl = getCallbackUrl(options);
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            if (callbackUrl) {
              window.location.href = callbackUrl;
            }
          },
        },
      });
    },
    [getCallbackUrl]
  );

  return {
    signInWithCredentials,
    signUpWithCredentials,
    signInWithGoogle,
    signInWithFacebook,
    signInWithTwitter,
    signOut,
  };
}

export default useAuth;
