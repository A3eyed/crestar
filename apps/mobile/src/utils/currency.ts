// @ts-nocheck
// Extended currency symbols map for international support
const CURRENCY_SYMBOLS = {
  GHS: '₵',
  USD: '$',
  EUR: '€',
  GBP: '£',
  NGN: '₦',
  KES: 'KSh',
  ZAR: 'R',
  EGP: 'E£',
  MAD: 'د.م.',
  TZS: 'TSh',
  UGX: 'USh',
  XOF: 'CFA',
  XAF: 'FCFA',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'Fr',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  BGN: 'лв',
  TRY: '₺',
  ILS: '₪',
  AED: 'د.إ',
  SAR: '﷼',
  QAR: 'ر.ق',
  KWD: 'د.ك',
  BHD: 'د.ب',
  OMR: 'ر.ع.',
  BRL: 'R$',
  MXN: 'MX$',
  ARS: 'AR$',
  CLP: 'CLP$',
  COP: 'COL$',
  PEN: 'S/',
  SGD: 'S$',
  HKD: 'HK$',
  MYR: 'RM',
  THB: '฿',
  IDR: 'Rp',
  PHP: '₱',
  VND: '₫',
  KRW: '₩',
  NZD: 'NZ$',
  RUB: '₽',
  UAH: '₴',
};

const DEFAULT_CURRENCY = {
  symbol: '₵',
  code: 'GHS',
  name: 'Ghana Cedi',
};

// Legacy exports for backward compatibility
export const getCurrencyByCountryCode = (countryCode) => {
  // Map common country codes to currencies
  const countryToCurrency = {
    GH: { symbol: '₵', code: 'GHS', name: 'Ghana Cedi' },
    US: { symbol: '$', code: 'USD', name: 'US Dollar' },
    GB: { symbol: '£', code: 'GBP', name: 'British Pound' },
    NG: { symbol: '₦', code: 'NGN', name: 'Nigerian Naira' },
    KE: { symbol: 'KSh', code: 'KES', name: 'Kenyan Shilling' },
    ZA: { symbol: 'R', code: 'ZAR', name: 'South African Rand' },
    FR: { symbol: '€', code: 'EUR', name: 'Euro' },
    DE: { symbol: '€', code: 'EUR', name: 'Euro' },
    IN: { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
    CN: { symbol: '¥', code: 'CNY', name: 'Chinese Yuan' },
    JP: { symbol: '¥', code: 'JPY', name: 'Japanese Yen' },
    BR: { symbol: 'R$', code: 'BRL', name: 'Brazilian Real' },
    AE: { symbol: 'AED', code: 'AED', name: 'UAE Dirham' },
    AU: { symbol: 'A$', code: 'AUD', name: 'Australian Dollar' },
    CA: { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar' },
  };
  return countryToCurrency[countryCode] || DEFAULT_CURRENCY;
};

export const getSymbolByCurrencyCode = (currencyCode = 'GHS') => {
  return CURRENCY_SYMBOLS[currencyCode?.toUpperCase()] || currencyCode || '₵';
};

export const formatCurrency = (amount, currencyCode = 'GHS') => {
  // Clean the amount string and parse as float to handle edge cases
  const cleanAmount =
    typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, '')) || 0;
  const code = currencyCode?.toUpperCase() || 'GHS';
  const symbol = CURRENCY_SYMBOLS[code] || code;
  // Some currencies don't use decimals
  const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'UGX', 'RWF', 'XOF', 'XAF', 'IDR'];
  const formatted = noDecimalCurrencies.includes(code)
    ? Math.round(cleanAmount).toLocaleString()
    : cleanAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return `${symbol}${formatted}`;
};

export const getCurrencySymbol = (currencyCode = 'GHS') => {
  return CURRENCY_SYMBOLS[currencyCode?.toUpperCase()] || currencyCode || '₵';
};

export const getCurrencyCode = () => {
  // Try to read from localization store if available
  try {
    const useLocalization = require('./localization').default;
    const state = useLocalization.getState();
    return state?.currency || 'GHS';
  } catch (e) {
    return 'GHS';
  }
};

// NEW: Detect user's currency from stored preference (defaults to GHS)
export const detectUserCurrency = () => {
  try {
    const useLocalization = require('./localization').default;
    const state = useLocalization.getState();
    const code = state?.currency || 'GHS';
    const symbol = CURRENCY_SYMBOLS[code] || code;
    return { code, symbol, locale: 'en' };
  } catch (e) {
    return { code: 'GHS', symbol: '₵', locale: 'en' };
  }
};

// NEW: Convert currency amount via API
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  // Validate inputs
  if (!amount || isNaN(parseFloat(amount))) {
    console.warn('Invalid amount for conversion:', amount);
    return parseFloat(amount) || 0;
  }

  if (!fromCurrency || !toCurrency) {
    console.warn('Missing currency codes:', { fromCurrency, toCurrency });
    return parseFloat(amount);
  }

  if (fromCurrency === toCurrency) {
    return parseFloat(amount);
  }

  try {
    const response = await fetch(
      `/api/currency/convert?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`
    );

    if (!response.ok) {
      console.warn(`Currency API returned ${response.status} for ${fromCurrency} → ${toCurrency}`);
      // Return original amount instead of null on API failure
      return parseFloat(amount);
    }

    const data = await response.json();

    if (data.success && data.convertedAmount !== undefined) {
      return data.convertedAmount;
    } else {
      console.warn('Currency conversion failed:', data.error || 'Unknown error');
      // Return original amount instead of null
      return parseFloat(amount);
    }
  } catch (error) {
    console.warn('Currency conversion network error:', error.message);
    // Return original amount on network error instead of null
    return parseFloat(amount);
  }
};

// NEW: Batch convert multiple prices
export const batchConvertCurrency = async (amounts, fromCurrency, toCurrency) => {
  // Validate inputs
  if (!Array.isArray(amounts) || amounts.length === 0) {
    console.warn('Invalid amounts array for batch conversion');
    return amounts;
  }

  if (!fromCurrency || !toCurrency) {
    console.warn('Missing currency codes for batch conversion');
    return amounts.map((a) => parseFloat(a) || 0);
  }

  if (fromCurrency === toCurrency) {
    return amounts.map((a) => parseFloat(a));
  }

  try {
    const response = await fetch('/api/currency/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amounts, from: fromCurrency, to: toCurrency }),
    });

    if (!response.ok) {
      console.warn(`Batch currency API returned ${response.status}`);
      // Return original amounts instead of null
      return amounts.map((a) => parseFloat(a) || 0);
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.conversions)) {
      return data.conversions.map((c) => c.converted);
    } else {
      console.warn('Batch conversion failed:', data.error || 'Unknown error');
      // Return original amounts instead of null
      return amounts.map((a) => parseFloat(a) || 0);
    }
  } catch (error) {
    console.warn('Batch currency conversion network error:', error.message);
    // Return original amounts on network error instead of null
    return amounts.map((a) => parseFloat(a) || 0);
  }
};

// NEW: Format with code suffix for clarity
export const formatCurrencyWithCode = (amount, currencyCode = 'GHS') => {
  const num = parseFloat(amount) || 0;
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${num.toFixed(2)} ${currencyCode}`;
};

export default {
  formatCurrency,
  getCurrencySymbol,
  getCurrencyCode,
  getCurrencyByCountryCode,
  getSymbolByCurrencyCode,
  DEFAULT_CURRENCY,
  CURRENCY_SYMBOLS,
  detectUserCurrency,
  convertCurrency,
  batchConvertCurrency,
  formatCurrencyWithCode,
};
