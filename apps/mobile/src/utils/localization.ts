// @ts-nocheck
import { create } from 'zustand';
import AsyncStorage from './safeStorage';
import TRANSLATIONS, { AVAILABLE_LANGUAGES } from '../data/translations';

// Re-export for backward compatibility
export { AVAILABLE_LANGUAGES as LANGUAGES };
export { TRANSLATIONS };

// Default currency (used as fallback, no longer locked)
const DEFAULT_CURRENCY = 'GHS';
const DEFAULT_CURRENCY_SYMBOL = '₵';

// Extended currency symbols map
export const CURRENCY_SYMBOLS = {
  AED: 'د.إ',
  GHS: '₵',
  NGN: '₦',
  USD: '$',
  GBP: '£',
  INR: '₹',
  CNY: '¥',
  CAD: 'C$',
  EUR: '€',
  JPY: '¥',
  ZAR: 'R',
  KES: 'KSh',
  AUD: 'A$',
  BRL: 'R$',
  MXN: 'MX$',
  CHF: 'Fr',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  TRY: '₺',
  RUB: '₽',
  SAR: '﷼',
  QAR: 'ر.ق',
  KWD: 'د.ك',
  BHD: 'د.ب',
  OMR: 'ر.ع.',
  ILS: '₪',
  SGD: 'S$',
  HKD: 'HK$',
  MYR: 'RM',
  THB: '฿',
  IDR: 'Rp',
  PHP: '₱',
  VND: '₫',
  KRW: '₩',
  NZD: 'NZ$',
  EGP: 'E£',
  MAD: 'د.م.',
  TZS: 'TSh',
  UGX: 'USh',
  XOF: 'CFA',
  XAF: 'FCFA',
  ARS: 'AR$',
  COP: 'COL$',
  PEN: 'S/',
  CLP: 'CLP$',
  BGN: 'лв',
  UAH: '₴',
};

// Regions available globally
export const REGIONS = {
  GH: {
    code: 'GH',
    name: 'Ghana',
    currency: 'GHS',
    currencySymbol: '₵',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Africa/Accra',
  },
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'America/New_York',
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Europe/London',
  },
  NG: {
    code: 'NG',
    name: 'Nigeria',
    currency: 'NGN',
    currencySymbol: '₦',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Africa/Lagos',
  },
  KE: {
    code: 'KE',
    name: 'Kenya',
    currency: 'KES',
    currencySymbol: 'KSh',
    language: 'sw',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Africa/Nairobi',
  },
  ZA: {
    code: 'ZA',
    name: 'South Africa',
    currency: 'ZAR',
    currencySymbol: 'R',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Africa/Johannesburg',
  },
  FR: {
    code: 'FR',
    name: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    language: 'fr',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Europe/Paris',
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    language: 'en',
    dateFormat: 'DD.MM.YYYY',
    timezone: 'Europe/Berlin',
  },
  IN: {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    language: 'hi',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Asia/Kolkata',
  },
  CN: {
    code: 'CN',
    name: 'China',
    currency: 'CNY',
    currencySymbol: '¥',
    language: 'zh',
    dateFormat: 'YYYY/MM/DD',
    timezone: 'Asia/Shanghai',
  },
  JP: {
    code: 'JP',
    name: 'Japan',
    currency: 'JPY',
    currencySymbol: '¥',
    language: 'en',
    dateFormat: 'YYYY/MM/DD',
    timezone: 'Asia/Tokyo',
  },
  BR: {
    code: 'BR',
    name: 'Brazil',
    currency: 'BRL',
    currencySymbol: 'R$',
    language: 'pt',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'America/Sao_Paulo',
  },
  MX: {
    code: 'MX',
    name: 'Mexico',
    currency: 'MXN',
    currencySymbol: 'Mex$',
    language: 'es',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'America/Mexico_City',
  },
  AE: {
    code: 'AE',
    name: 'UAE',
    currency: 'AED',
    currencySymbol: 'د.إ',
    language: 'ar',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Asia/Dubai',
  },
  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    currency: 'SAR',
    currencySymbol: 'SAR',
    language: 'ar',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Asia/Riyadh',
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    currency: 'AUD',
    currencySymbol: 'A$',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Australia/Sydney',
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    currencySymbol: 'C$',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'America/Toronto',
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    currency: 'EUR',
    currencySymbol: '€',
    language: 'es',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Europe/Madrid',
  },
  EG: {
    code: 'EG',
    name: 'Egypt',
    currency: 'EGP',
    currencySymbol: 'E£',
    language: 'ar',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Africa/Cairo',
  },
  TZ: {
    code: 'TZ',
    name: 'Tanzania',
    currency: 'TZS',
    currencySymbol: 'TSh',
    language: 'sw',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Africa/Dar_es_Salaam',
  },
};

// Storage keys
const CURRENCY_PREFERENCE_KEY = '@user_currency_preference';
const LANGUAGE_KEY = 'userLanguage';
const REGION_KEY = 'userRegion';

// ---------- Async helpers (not zustand) ----------

export const getUserCurrency = async () => {
  try {
    const stored = await AsyncStorage.getItem(CURRENCY_PREFERENCE_KEY);
    if (stored) return JSON.parse(stored);
    return {
      code: DEFAULT_CURRENCY,
      symbol: DEFAULT_CURRENCY_SYMBOL,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Get user currency error:', error);
    return {
      code: DEFAULT_CURRENCY,
      symbol: DEFAULT_CURRENCY_SYMBOL,
      updatedAt: new Date().toISOString(),
    };
  }
};

export const setUserCurrency = async (currencyCode) => {
  try {
    const code = currencyCode.toUpperCase();
    const currencyData = {
      code,
      symbol: CURRENCY_SYMBOLS[code] || code,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CURRENCY_PREFERENCE_KEY, JSON.stringify(currencyData));
    return currencyData;
  } catch (error) {
    console.error('Set user currency error:', error);
    return null;
  }
};

export const clearCurrencyPreference = async () => {
  try {
    await AsyncStorage.removeItem(CURRENCY_PREFERENCE_KEY);
  } catch (error) {
    console.error('Clear currency preference error:', error);
  }
};

export const getLanguage = async () => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    return saved || 'en';
  } catch (error) {
    console.error('Get language error:', error);
    return 'en';
  }
};

// ---------- Zustand store ----------

const useLocalization = create((set, get) => ({
  region: 'GH',
  language: 'en',
  currency: 'GHS',
  currencySymbol: '₵',
  isLoaded: false,

  // Translate a key with optional param interpolation
  // Usage: t("balanceRemainingMsg", { amount: "$50" })
  t: (key, params) => {
    const { language } = get();
    let text = TRANSLATIONS[language]?.[key] || TRANSLATIONS.en?.[key] || key;
    if (params && typeof text === 'string') {
      Object.entries(params).forEach(([pKey, pVal]) => {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      });
    }
    return text;
  },

  // Format currency using the user's preferred currency symbol
  formatCurrency: (amount, overrideCurrency) => {
    const { currency, currencySymbol } = get();
    const code = overrideCurrency || currency;
    const symbol = overrideCurrency
      ? CURRENCY_SYMBOLS[overrideCurrency] || overrideCurrency
      : currencySymbol;
    const num =
      typeof amount === 'number'
        ? amount
        : parseFloat(String(amount).replace(/[^0-9.\-]/g, '')) || 0;
    const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'UGX'];
    const formatted = noDecimalCurrencies.includes(code)
      ? Math.round(num).toLocaleString()
      : num.toFixed(2);
    return `${symbol}${formatted}`;
  },

  // Legacy alias
  formatNativeCurrency: (amount) => {
    return get().formatCurrency(amount);
  },

  formatDate: (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  },

  loadSettings: async () => {
    try {
      const [savedLanguage, savedRegion, savedCurrency] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_KEY),
        AsyncStorage.getItem(REGION_KEY),
        AsyncStorage.getItem(CURRENCY_PREFERENCE_KEY),
      ]);

      const lang = savedLanguage || 'en';
      const regionCode = savedRegion || 'GH';
      const regionInfo = REGIONS[regionCode] || REGIONS.GH;

      let currencyCode = regionInfo.currency;
      let currencySymbolVal = regionInfo.currencySymbol;

      if (savedCurrency) {
        try {
          const parsed = JSON.parse(savedCurrency);
          currencyCode = parsed.code || currencyCode;
          currencySymbolVal = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
        } catch (e) {
          /* use region default */
        }
      }

      set({
        region: regionCode,
        language: lang,
        currency: currencyCode,
        currencySymbol: currencySymbolVal,
        isLoaded: true,
      });
    } catch (error) {
      console.error('Failed to load localization settings:', error);
      set({
        region: 'GH',
        language: 'en',
        currency: 'GHS',
        currencySymbol: '₵',
        isLoaded: true,
      });
    }
  },

  setRegion: async (regionCode) => {
    try {
      const regionInfo = REGIONS[regionCode];
      if (!regionInfo) return;
      await AsyncStorage.setItem(REGION_KEY, regionCode);
      set({ region: regionCode });
    } catch (error) {
      console.error('Failed to set region:', error);
    }
  },

  setLanguage: async (lang) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      set({ language: lang });
    } catch (error) {
      console.error('Failed to set language:', error);
    }
  },

  setCurrency: async (currencyCode) => {
    try {
      const code = currencyCode.toUpperCase();
      const symbol = CURRENCY_SYMBOLS[code] || code;
      await setUserCurrency(code);
      set({ currency: code, currencySymbol: symbol });
    } catch (error) {
      console.error('Failed to set currency:', error);
    }
  },
}));

export default useLocalization;
