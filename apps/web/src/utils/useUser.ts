// @ts-nocheck
'use client';

import { useSession } from '@/lib/auth-client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useUser — returns the signed-in user enriched with their full Crestar
 * profile (username, display_name, bio, profile_image, is_verified, role,
 * followers/following counts...).
 *
 * The better-auth session only contains id/name/email/image, so we merge
 * in the profile from /api/profile/update (GET). Without this, username
 * changes never show up on the web.
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
      const res = await fetch(`/api/profile/update?_t=${Date.now()}`);
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

  // Profile fields win over session fields (profile has the fresh username)
  const user = sessionUser ? { ...sessionUser, ...(profile || {}) } : null;

  const refetchAll = useCallback(() => {
    refetch?.();
    fetchedForId.current = null;
    fetchProfile();
  }, [refetch, fetchProfile]);

  return {
    user,
    data: user,
    loading: isPending || (sessionUser && !profile && profileLoading),
    refetch: refetchAll,
  };
};

export default useUser;
