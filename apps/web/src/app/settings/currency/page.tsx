// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, Check, Search } from 'lucide-react';

// Import currency data (same as mobile)
const CURRENCY_REGIONS = {
  popular: [
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  ],
  africa: [
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬' },
    { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', flag: '🇲🇦' },
    { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿' },
    { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬' },
    { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', flag: '🌍' },
    {
      code: 'XAF',
      name: 'Central African CFA Franc',
      symbol: 'FCFA',
      flag: '🌍',
    },
  ],
  americas: [
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
    { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', flag: '🇲🇽' },
    { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$', flag: '🇦🇷' },
  ],
  europe: [
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿' },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺' },
    { code: 'RON', name: 'Romanian Leu', symbol: 'lei', flag: '🇷🇴' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  ],
  middleEast: [
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
    { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦' },
    { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼' },
    { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', flag: '🇧🇭' },
    { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱' },
  ],
  asia: [
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
  ],
  oceania: [
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
  ],
};

export default function CurrencySettingsPage() {
  const [selectedCurrency, setSelectedCurrency] = useState('GHS');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load saved currency from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currency');
      if (saved) {
        setSelectedCurrency(saved);
      }
    }
  }, []);

  const handleSelectCurrency = (code) => {
    setSelectedCurrency(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('currency', code);
      // Instantly notify all mounted components (same tab) — no reload needed
      window.dispatchEvent(new Event('currency-changed'));
    }
  };

  // Flatten all currencies for search
  const allCurrencies = Object.values(CURRENCY_REGIONS).flat();

  const filteredCurrencies = searchQuery
    ? allCurrencies.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const renderCurrencyItem = (currency) => (
    <button
      key={currency.code}
      onClick={() => handleSelectCurrency(currency.code)}
      className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{currency.flag}</span>
        <div className="text-left">
          <p className="text-white font-semibold">{currency.name}</p>
          <p className="text-white/60 text-sm">
            {currency.code} • {currency.symbol}
          </p>
        </div>
      </div>
      {selectedCurrency === currency.code && <Check size={24} className="text-[#D4AF37]" />}
    </button>
  );

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
          <h1 className="text-xl font-bold">Currency</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Info Banner */}
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4 mb-6">
          <p className="text-white/90 text-sm leading-relaxed">
            💡 <strong>Smart Conversion:</strong> All prices will automatically convert to your
            preferred currency. Sellers keep their original currency, and you see converted prices
            in real-time.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
          <input
            type="text"
            placeholder="Search currencies..."
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Currency List */}
        {filteredCurrencies ? (
          <div className="space-y-3">
            <h3 className="text-white/60 text-sm font-semibold uppercase tracking-wide mb-3">
              Search Results
            </h3>
            {filteredCurrencies.map(renderCurrencyItem)}
          </div>
        ) : (
          <>
            {/* Popular */}
            <div className="mb-8">
              <h3 className="text-white/60 text-sm font-semibold uppercase tracking-wide mb-3">
                Popular
              </h3>
              <div className="space-y-3">{CURRENCY_REGIONS.popular.map(renderCurrencyItem)}</div>
            </div>

            {/* Africa */}
            <div className="mb-8">
              <h3 className="text-white/60 text-sm font-semibold uppercase tracking-wide mb-3">
                Africa
              </h3>
              <div className="space-y-3">{CURRENCY_REGIONS.africa.map(renderCurrencyItem)}</div>
            </div>

            {/* Americas */}
            <div className="mb-8">
              <h3 className="text-white/60 text-sm font-semibold uppercase tracking-wide mb-3">
                Americas
              </h3>
              <div className="space-y-3">{CURRENCY_REGIONS.americas.map(renderCurrencyItem)}</div>
            </div>

            {/* Europe */}
            <div className="mb-8">
              <h3 className="text-white/60 text-sm font-semibold uppercase tracking-wide mb-3">
                Europe
              </h3>
              <div className="space-y-3">{CURRENCY_REGIONS.europe.map(renderCurrencyItem)}</div>
            </div>

            {/* Middle East */}
            <div className="mb-8">
              <h3 className="text-white/60 text-sm font-semibold uppercase tracking-wide mb-3">
                Middle East
              </h3>
              <div className="space-y-3">{CURRENCY_REGIONS.middleEast.map(renderCurrencyItem)}</div>
            </div>

            {/* Asia */}
            <div className="mb-8">
              <h3 className="text-white/60 text-sm font-semibold uppercase tracking-wide mb-3">
                Asia
              </h3>
              <div className="space-y-3">{CURRENCY_REGIONS.asia.map(renderCurrencyItem)}</div>
            </div>

            {/* Oceania */}
            <div className="mb-8">
              <h3 className="text-white/60 text-sm font-semibold uppercase tracking-wide mb-3">
                Oceania
              </h3>
              <div className="space-y-3">{CURRENCY_REGIONS.oceania.map(renderCurrencyItem)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
