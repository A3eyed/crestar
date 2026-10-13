// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import useAuth from '@/utils/useAuth';

/** Instant sign-out — no confirmation screen. */
export default function LogoutPage() {
  const { signOut } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await signOut({ callbackUrl: '/', redirect: true });
      } catch (err) {
        console.error('Sign out error:', err);
        if (!cancelled) {
          setError('Could not sign out. Try again.');
          // Hard fallback
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch {
            /* ignore */
          }
          window.location.href = '/';
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signOut]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black px-6">
      <p className="text-white/50 text-sm">{error || 'Signing out…'}</p>
    </div>
  );
}
