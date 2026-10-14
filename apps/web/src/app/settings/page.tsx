// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import useUser from '@/utils/useUser';
import useAuth from '@/utils/useAuth';
import useLocalization from '@/utils/useLocalization';
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Globe,
  LogOut,
  Lock,
  Coins,
  User,
} from 'lucide-react';

export default function SettingsPage() {
  const { data: user, loading } = useUser();
  const { signOut } = useAuth();
  const { t } = useLocalization();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/account/signin?callbackUrl=/settings';
    }
  }, [user, loading]);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut({ callbackUrl: '/', redirect: true });
    } catch (e) {
      console.error(e);
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
      window.location.href = '/';
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-[#D4AF37] animate-spin" />
      </div>
    );
  }

  const rows = [
    { href: '/edit-profile', icon: User, label: t('editProfile') },
    { href: '/settings/notifications', icon: Bell, label: t('notifications') },
    { href: '/settings/language', icon: Globe, label: t('language') },
    { href: '/settings/currency', icon: Coins, label: t('currency') },
    { href: '/settings/privacy', icon: Lock, label: t('privacy') },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-40 glass-strong">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => window.history.back()} className="p-1">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-semibold">{t('settings')}</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-3">
        {rows.map((row) => (
          <a
            key={row.href}
            href={row.href}
            className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5 active:opacity-80"
          >
            <row.icon size={20} className="text-white/60" />
            <span className="flex-1 font-medium">{row.label}</span>
            <ChevronRight size={18} className="text-white/35" />
          </a>
        ))}

        <button
          type="button"
          onClick={handleLogout}
          disabled={busy}
          className="w-full glass flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left disabled:opacity-50"
        >
          <LogOut size={20} className="text-red-400" />
          <span className="flex-1 font-medium text-red-400">
            {busy ? t('signingOut') : t('signOut')}
          </span>
        </button>
      </div>
    </div>
  );
}
