// @ts-nocheck
'use client';

import { useSession } from '@/lib/auth-client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useUser — signed-in user + Crestar profile (username, display_name, bio,
 * profile_image, is_verified, role, follower counts).
 */
export const useUser = () => {
  const { data, isPending, refetch } = useSession();
  const sessionUser = data?.user ?? null;

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const fetchedForId = useRef(null);

  const fetchProfile = useCallback(async () => {
    if (!sessionUser?.id) return;
    try {
      setProfileLoading(true);
      const res = await fetch(`/api/profile/update?_t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.user) {
          setProfile(json.user);
          fetchedForId.current = sessionUser.id;
        }
      }
    } catch (e) {
      // Keep session user as fallback
    } finally {
      setProfileLoading(false);
    }
  }, [sessionUser?.id]);

  useEffect(() => {
    if (sessionUser?.id && fetchedForId.current !== sessionUser.id) {
      fetchProfile();
    }
    if (!sessionUser?.id) {
      setProfile(null);
      fetchedForId.current = null;
    }
  }, [sessionUser?.id, fetchProfile]);

  // Profile row wins; normalize avatar so UI can use either field
  const user = sessionUser
    ? {
        ...sessionUser,
        ...(profile || {}),
        profile_image:
          profile?.profile_image ||
          sessionUser.profile_image ||
          sessionUser.image ||
          null,
        image:
          profile?.profile_image ||
          sessionUser.image ||
          sessionUser.profile_image ||
          null,
      }
    : null;

  const refetchAll = useCallback(() => {
    refetch?.();
    fetchedForId.current = null;
    return fetchProfile();
  }, [refetch, fetchProfile]);

  return {
    user,
    data: user,
    loading: isPending || (sessionUser && !profile && profileLoading),
    refetch: refetchAll,
  };
};

export default useUser;
