// @ts-nocheck
/**
 * Get the currency symbol for a given currency code
 * @param {string} code - Currency code (e.g., "USD", "GHS", "EUR")
 * @returns {string} Currency symbol
 */
export function getCurrencySymbol(code) {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    GHS: '₵',
    NGN: '₦',
    ZAR: 'R',
    KES: 'KSh',
    UGX: 'USh',
    TZS: 'TSh',
    XOF: 'CFA',
    XAF: 'FCFA',
    CAD: 'C$',
    AUD: 'A$',
    INR: '₹',
    CNY: '¥',
    JPY: '¥',
    BRL: 'R$',
    MXN: 'MX$',
    ARS: 'AR$',
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
    AED: 'د.إ',
    SAR: '﷼',
    QAR: 'ر.ق',
    KWD: 'د.ك',
    BHD: 'د.ب',
    ILS: '₪',
    KRW: '₩',
    SGD: 'S$',
    HKD: 'HK$',
    MYR: 'RM',
    THB: '฿',
    IDR: 'Rp',
    PHP: '₱',
    VND: '₫',
    NZD: 'NZ$',
    EGP: 'E£',
    MAD: 'د.م.',
    OMR: 'ر.ع.',
    BGN: 'лв',
    UAH: '₴',
    PEN: 'S/',
    COP: 'COL$',
    CLP: 'CLP$',
    UYU: '$U',
    BOB: 'Bs',
    PKR: '₨',
    BDT: '৳',
    LKR: 'Rs',
    NPR: 'रू',
    TWD: 'NT$',
    RWF: 'FRw',
    ETB: 'Br',
    ZMW: 'ZK',
    BWP: 'P',
    MWK: 'MK',
    SLL: 'Le',
    LRD: 'L$',
    GMD: 'D',
    CDF: 'FC',
    MZN: 'MT',
    NAD: 'N$',
  };

  return symbols[code?.toUpperCase?.() || code] || code;
}

// Currencies that conventionally do not display decimal places
const NO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'VND', 'CLP', 'UGX', 'RWF', 'XOF', 'XAF', 'IDR'];

/**
 * Format a price with the correct currency symbol, thousands separators and
 * currency-appropriate decimals.
 * @param {number|string} amount - The amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted price string e.g. "₵1,250.00" / "¥1,250"
 */
export function formatPrice(amount, currency = 'GHS') {
  const code = (currency || 'GHS').toUpperCase();
  const symbol = getCurrencySymbol(code);
  const num =
    typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, '')) || 0;

  const formatted = NO_DECIMAL_CURRENCIES.includes(code)
    ? Math.round(num).toLocaleString()
    : num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  return `${symbol}${formatted}`;
}
