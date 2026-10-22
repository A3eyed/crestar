// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import useUser from '@/utils/useUser';
import {
  ArrowLeft,
  Lock,
  Eye,
  MessageCircle,
  Heart,
  Users,
  FileText,
  ChevronRight,
  MapPin,
} from 'lucide-react';

const BRAND = '#D4AF37';
const STORAGE_KEY = 'privacy_settings';

const DEFAULT_SETTINGS = {
  privateAccount: false,
  hideLikedVideos: true,
  showActivityStatus: true,
  allowMessagesFromEveryone: true,
  allowCommentsFromEveryone: true,
  shareLocationWithSellers: true,
};

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative w-12 h-7 rounded-full transition-colors shrink-0"
      style={{ backgroundColor: value ? BRAND : 'rgba(255,255,255,0.15)' }}
      aria-pressed={value}
    >
      <span
        className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
        style={{ left: value ? '26px' : '4px' }}
      />
    </button>
  );
}

export default function PrivacySettingsPage() {
  const { data: user, loading: userLoading } = useUser();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin?callbackUrl=/settings/privacy';
    }
  }, [user, userLoading]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (e) {
      // use defaults
    }
  }, []);

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch (e) {
      console.error('Could not save privacy settings', e);
    }
  };

  /**
   * Prefer popping the stack (Settings → Privacy).
   * Fallback: replace so we do not push another /settings entry (that caused a loop
   * with settings using history.back()).
   */
  const handleBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.replace('/settings');
  };

  const rows = [
    {
      key: 'privateAccount',
      icon: Lock,
      title: 'Private Account',
      description: 'Only approved followers can see your videos and profile',
    },
    {
      key: 'hideLikedVideos',
      icon: Heart,
      title: 'Hide Liked Videos',
      description: "Keep the videos you've liked visible only to you",
    },
    {
      key: 'showActivityStatus',
      icon: Eye,
      title: 'Show Activity Status',
      description: "Let others see when you're active on Crestar",
    },
    {
      key: 'allowMessagesFromEveryone',
      icon: MessageCircle,
      title: 'Messages from Everyone',
      description: 'When off, only people you follow can message you',
    },
    {
      key: 'allowCommentsFromEveryone',
      icon: Users,
      title: 'Comments from Everyone',
      description: 'When off, only your followers can comment on your videos',
    },
    {
      key: 'shareLocationWithSellers',
      icon: MapPin,
      title: 'Share Delivery Location',
      description:
        'Share your delivery address with sellers and deliverers on active orders',
    },
  ];

  if (userLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black border-b border-white/10 backdrop-blur-xl bg-opacity-95">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back to settings"
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <h1 className="text-xl font-bold">Privacy Settings</h1>
          {saved && (
            <span className="ml-auto text-sm font-semibold" style={{ color: BRAND }}>
              Saved ✓
            </span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4 mb-6">
          <p className="text-white/90 text-sm leading-relaxed">
            Control who can see your content and interact with you. These settings apply across
            your Crestar account.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-8">
          {rows.map((row, idx) => {
            const Icon = row.icon;
            const isLast = idx === rows.length - 1;
            return (
              <div
                key={row.key}
                className={`flex items-center justify-between gap-4 p-4 ${
                  isLast ? '' : 'border-b border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon size={20} className="text-white/60 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white font-medium">{row.title}</p>
                    <p className="text-white/50 text-sm mt-0.5">{row.description}</p>
                  </div>
                </div>
                <Toggle value={settings[row.key]} onChange={(v) => updateSetting(row.key, v)} />
              </div>
            );
          })}
        </div>

        <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">Legal</h2>
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <a
            href="/privacy"
            className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/10"
          >
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-white/60" />
              <span className="text-white font-medium">Privacy Policy</span>
            </div>
            <ChevronRight size={20} className="text-white/40" />
          </a>
          <a
            href="/terms"
            className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-white/60" />
              <span className="text-white font-medium">Terms of Service</span>
            </div>
            <ChevronRight size={20} className="text-white/40" />
          </a>
        </div>
      </div>
    </div>
  );
}
