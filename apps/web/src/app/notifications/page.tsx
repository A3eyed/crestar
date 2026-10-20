// @ts-nocheck
'use client';
import { useEffect } from 'react';

/** All activity lives in Inbox — permanent redirect. */
export default function NotificationsRedirect() {
  useEffect(() => {
    window.location.replace('/inbox');
  }, []);
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-white/20 border-t-[#D4AF37] rounded-full animate-spin" />
    </div>
  );
}
