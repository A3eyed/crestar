// @ts-nocheck
import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useAuthStore } from './store';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import { devWarn, devError } from '@/utils/devLogger';

// Role helper functions
export const isOwner = (user) => {
  if (!user) return false;
  const role = user.role || 'user';
  return role === 'owner';
};

export const isAdmin = (user) => {
  if (!user) return false;
  const role = user.role || 'user';
  return role === 'admin';
};

export const isModerator = (user) => {
  if (!user) return false;
  const role = user.role || 'user';
  return role === 'moderator';
};

export const canAccessAdmin = (user) => {
  if (!user) return false;
  const role = user.role || 'user';
  return role === 'admin' || role === 'owner' || role === 'moderator';
};

export const useUser = () => {
  const { auth, isReady } = useAuthStore();
  const baseUser = auth?.user || null;
  const [fullUser, setFullUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchedForId = useRef(null);
  const isFetchingRef = useRef(false);

  const fetchFullProfile = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return null;
    }

    const currentAuth = useAuthStore.getState().auth;
    const userId = currentAuth?.user?.id;
    const hasJWT = !!currentAuth?.jwt;

    if (!userId || !hasJWT) {
      setFullUser(null);
      setLoading(false);
      return null;
    }

    isFetchingRef.current = true;
    setLoading(true);

    try {
      const response = await authenticatedFetch('/api/profile/update');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          const currentBase = currentAuth?.user || {};
          const mergedUser = { ...currentBase, ...data.user };
          if (!mergedUser.role) {
            mergedUser.role = 'user';
          }
          setFullUser(mergedUser);
          fetchedForId.current = String(userId);
          setLoading(false);
          isFetchingRef.current = false;
          return mergedUser;
        }
      } else {
        devError('[useUser] Profile fetch failed:', response.status, response.statusText);
      }
    } catch (err) {
      devError('[useUser] Failed to fetch full profile:', err);
    }

    // Fall back to base user from JWT
    devWarn('[useUser] Using fallback user from JWT');
    const rawFallback = useAuthStore.getState().auth?.user || null;
    const fallback = rawFallback ? { ...rawFallback, role: rawFallback.role || 'user' } : null;
    setFullUser(fallback);
    fetchedForId.current = String(userId);
    setLoading(false);
    isFetchingRef.current = false;
    return fallback;
  }, []);

  // Primary effect: respond to auth state changes via React hook
  useEffect(() => {
    const currentUserId = baseUser?.id ? String(baseUser.id) : null;
    const hasJWT = !!auth?.jwt;

    if (isReady && currentUserId && hasJWT) {
      // Auth is ready and we have a user + JWT
      if (fetchedForId.current !== currentUserId) {
        // New sign-in or user switch — fetch fresh profile
        setFullUser(null);
        fetchedForId.current = null;
        isFetchingRef.current = false; // Reset to allow new fetch
        setLoading(true);
        fetchFullProfile();
      } else {
        // Already fetched for this user
        setLoading(false);
      }
    } else if (isReady && !currentUserId) {
      // Logged out
      setFullUser(null);
      setLoading(false);
      fetchedForId.current = null;
      isFetchingRef.current = false;
    } else {
      // Not ready yet
      setLoading(true);
    }
  }, [isReady, baseUser?.id, auth?.jwt, fetchFullProfile]);

  // Safety net: subscribe directly to Zustand store for auth changes
  // This catches cases where the React hook dependency comparison misses a change
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      const newUserId = state.auth?.user?.id ? String(state.auth.user.id) : null;
      const newJwt = state.auth?.jwt || null;
      const prevJwt = prevState.auth?.jwt || null;

      // Only react to actual auth changes (new sign-in, sign-out, or account switch)
      if (newJwt && newJwt !== prevJwt && state.isReady) {
        // If we haven't fetched for this user yet, trigger a fetch
        if (fetchedForId.current !== newUserId) {
          fetchedForId.current = null;
          isFetchingRef.current = false; // Reset to allow new fetch
          setLoading(true);
          fetchFullProfile();
        }
      } else if (!newJwt && prevJwt && state.isReady) {
        // User signed out
        setFullUser(null);
        setLoading(false);
        fetchedForId.current = null;
        isFetchingRef.current = false;
      }
    });

    return () => unsubscribe();
  }, [fetchFullProfile]);

  // Stable user object
  const user = useMemo(() => {
    const rawUser = fullUser || baseUser;
    if (!rawUser) return rawUser;
    return rawUser.role ? rawUser : { ...rawUser, role: 'user' };
  }, [fullUser, baseUser]);

  return {
    user,
    data: user,
    loading: !isReady || loading,
    refetch: fetchFullProfile,
  };
};

export default useUser;
