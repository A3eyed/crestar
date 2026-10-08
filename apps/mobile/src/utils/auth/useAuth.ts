// @ts-nocheck
import { useCallback, useEffect } from 'react';
import { useAuthStore, useAuthModal } from './store';
import { devError, devLog } from '../devLogger';
import { authenticatedFetch } from '../authenticatedFetch';

/**
 * Platform-compliant auth hook for mobile.
 * Uses WebView modal for authentication (not native screens).
 */
export const useAuth = () => {
  const { isReady, auth, setAuth } = useAuthStore();
  const { open: openModal } = useAuthModal();

  const initiate = useCallback(async () => {
    await useAuthStore.getState().initiate();
  }, []);

  const signIn = useCallback(() => {
    openModal({ mode: 'signin' });
  }, [openModal]);

  const signUp = useCallback(() => {
    openModal({ mode: 'signup' });
  }, [openModal]);

  const signOut = useCallback(async () => {
    // Revoke the session server-side first so the Better Auth session row and
    // cookie are invalidated, then clear the locally stored bearer token.
    try {
      await authenticatedFetch('/api/auth/sign-out', { method: 'POST' }, { retry: false });
      devLog('[useAuth] Server session revoked');
    } catch (error) {
      devError('[useAuth] Could not revoke server session (clearing locally anyway):', error);
    }

    try {
      await setAuth(null);
    } catch (error) {
      devError('[useAuth] Sign out error:', error);
      await setAuth(null);
    }
  }, [setAuth]);

  return {
    isReady,
    isAuthenticated: isReady ? !!auth : null,
    auth,
    setAuth,
    initiate,
    signIn,
    signOut,
    signUp,
  };
};

/**
 * Auto-show auth modal if not authenticated
 */
export const useRequireAuth = () => {
  const { isReady, auth } = useAuthStore();
  const { open: openModal, isOpen } = useAuthModal();

  useEffect(() => {
    if (isReady && !auth && !isOpen) {
      openModal({ mode: 'signin' });
    }
  }, [isReady, auth, isOpen, openModal]);
};

export default useAuth;
