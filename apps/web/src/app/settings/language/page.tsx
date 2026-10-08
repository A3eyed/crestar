// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import useLocalization from '@/utils/useLocalization';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

export default function LanguageSettingsPage() {
  const { language, setLanguage, t } = useLocalization();
  const [selected, setSelected] = useState('en');

  useEffect(() => {
    setSelected(language);
  }, [language]);

  const handleSelect = (code) => {
    setSelected(code);
    // Persist + broadcast — every mounted component updates instantly
    setLanguage(code);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black border-b border-white/10 backdrop-blur-xl bg-opacity-95">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <a
            href="/settings"
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </a>
          <h1 className="text-xl font-bold">Language</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4 mb-6">
          <p className="text-white/90 text-sm leading-relaxed">
            🌍 Your language changes instantly across the app — no reload needed. Current:{' '}
            <strong>{t('settings')}</strong>
          </p>
        </div>

        <div className="space-y-3">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{lang.flag}</span>
                <div className="text-left">
                  <p className="text-white font-semibold">{lang.name}</p>
                  <p className="text-white/60 text-sm">{lang.nativeName}</p>
                </div>
              </div>
              {selected === lang.code && <Check size={24} className="text-[#D4AF37]" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
