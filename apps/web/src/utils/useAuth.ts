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

function useAuth() {
  const getCallbackUrl = useCallback((options: AuthOptions = {}) => {
    const callback = options.callbackURL || options.callbackUrl;
    if (callback) return callback;
    if (typeof window === 'undefined') return undefined;
    return new URLSearchParams(window.location.search).get('callbackUrl') ?? undefined;
  }, []);

  const signInWithCredentials = useCallback(
    (options: AuthOptions = {}) =>
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

  /** Neon Managed Better Auth — Apple OAuth (provider id: apple) */
  const signInWithApple = useCallback(
    (options: AuthOptions = {}) =>
      authClient.signIn.social({
        provider: 'apple',
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
    signInWithApple,
    signInWithFacebook,
    signInWithTwitter,
    signOut,
  };
}

export default useAuth;
