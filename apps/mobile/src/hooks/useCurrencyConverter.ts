// @ts-nocheck
import { useEffect, useMemo, useCallback } from 'react';
import useLocalization from '../utils/localization';
import useExchangeRates from '../utils/exchangeRatesStore';

const DEFAULT_CURRENCY = 'GHS';

// Pure helper: convert with an explicit USD-based rates map
function convertWith(rates, amount, from, to) {
  const f = (from || '').toUpperCase();
  const t = (to || '').toUpperCase();
  const num = Number(amount) || 0;
  if (f === t) return num;
  if (!rates) return null;
  const fromRate = rates[f];
  const toRate = rates[t];
  if (!fromRate || !toRate) return null;
  return Math.round((num / fromRate) * toRate * 100) / 100;
}

/**
 * Hook for automatic currency conversion.
 * Conversion happens synchronously on-device from a shared rates cache,
 * so every price updates instantly (and consistently) the moment the user
 * changes their preferred currency.
 *
 * @param {number|array} price - Single price or array of prices to convert
 * @param {string} originalCurrency - Original currency code (default: GHS)
 * @returns {object} - { convertedPrice, userCurrency, isConverting, conversionRate, error, needsConversion, refreshConversion }
 */
export const useCurrencyConverter = (price, originalCurrency = DEFAULT_CURRENCY) => {
  // Reactive: re-renders whenever the user changes currency in settings
  const globalCurrency = useLocalization((state) => state.currency);
  const rates = useExchangeRates((state) => state.rates);
  const isLoading = useExchangeRates((state) => state.isLoading);
  const hydrate = useExchangeRates((state) => state.hydrate);
  const fetchRates = useExchangeRates((state) => state.fetchRates);

  const userCurrency = (globalCurrency || DEFAULT_CURRENCY).toUpperCase();
  const sellerCurrency = (originalCurrency || DEFAULT_CURRENCY).toUpperCase();
  const needsConversion = userCurrency !== sellerCurrency;

  // Make sure rates are loaded (deduped across all mounted prices)
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Synchronous conversion — recomputes when price, currencies or rates change
  const { convertedPrice, conversionRate } = useMemo(() => {
    if (!needsConversion) {
      return { convertedPrice: price, conversionRate: 1 };
    }

    if (Array.isArray(price)) {
      const converted = price.map((p) => {
        const c = convertWith(rates, p, sellerCurrency, userCurrency);
        return c === null ? Number(p) || 0 : c;
      });
      const totalOriginal = price.reduce((sum, p) => sum + (Number(p) || 0), 0);
      const totalConverted = converted.reduce((sum, p) => sum + p, 0);
      return {
        convertedPrice: converted,
        conversionRate: totalOriginal > 0 ? totalConverted / totalOriginal : 1,
      };
    }

    const converted = convertWith(rates, price, sellerCurrency, userCurrency);
    if (converted === null) {
      // Rates not available (yet) — fall back to the original amount
      return { convertedPrice: price, conversionRate: 1 };
    }
    const num = Number(price) || 0;
    return {
      convertedPrice: converted,
      conversionRate: num > 0 ? converted / num : 1,
    };
  }, [price, sellerCurrency, userCurrency, needsConversion, rates]);

  // Whether we can actually convert right now
  const canConvert = useMemo(() => {
    if (!needsConversion) return true;
    return convertWith(rates, 1, sellerCurrency, userCurrency) !== null;
  }, [needsConversion, sellerCurrency, userCurrency, rates]);

  // Manual refresh (forces a fresh rates fetch)
  const refreshConversion = useCallback(() => {
    fetchRates(true);
  }, [fetchRates]);

  return {
    convertedPrice: convertedPrice ?? price,
    originalPrice: price,
    userCurrency,
    originalCurrency: sellerCurrency,
    isConverting: needsConversion && !rates && isLoading,
    conversionRate,
    error: needsConversion && rates && !canConvert ? 'unsupported' : null,
    needsConversion,
    canConvert,
    refreshConversion,
  };
};

export default useCurrencyConverter;
