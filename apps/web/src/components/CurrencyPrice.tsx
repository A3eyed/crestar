// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { formatPrice } from '../utils/currency';
import { loadRates, convertAmount, subscribeToRates } from '../utils/ratesClient';

/**
 * CurrencyPrice Component (Web)
 * -----------------------------
 * Shows the price in the user's PREFERRED currency (correct symbol + value),
 * with the seller's original price as a small secondary line.
 *
 * - Rates come from a shared on-page cache (one API call per page, 5-min TTL)
 * - Reacts instantly when the user changes currency in settings
 * - Falls back gracefully to the original price if rates are unavailable
 *
 * @param {number} price - The original price amount
 * @param {string} originalCurrency - Currency the price is stored in (e.g. "GHS")
 * @param {boolean} showOriginal - Show the seller's original price under the converted one
 * @param {string} size - "small" | "medium" | "large" | "xlarge"
 */
export default function CurrencyPrice({
  price,
  originalCurrency = 'GHS',
  showOriginal = true,
  size = 'medium',
  textStyle = {},
  convertedStyle = {},
}) {
  const [userCurrency, setUserCurrency] = useState(null); // null until mounted (SSR-safe)
  const [_ratesTick, setRatesTick] = useState(0);

  // Load user's preferred currency + react to changes (same tab & other tabs)
  useEffect(() => {
    const syncCurrency = () => {
      try {
        setUserCurrency(localStorage.getItem('currency') || 'GHS');
      } catch (_e) {
        setUserCurrency('GHS');
      }
    };

    syncCurrency();

    window.addEventListener('storage', syncCurrency);
    window.addEventListener('currency-changed', syncCurrency);
    return () => {
      window.removeEventListener('storage', syncCurrency);
      window.removeEventListener('currency-changed', syncCurrency);
    };
  }, []);

  // Load shared rates + re-render when they update
  useEffect(() => {
    const unsubscribe = subscribeToRates(() => setRatesTick((t) => t + 1));
    loadRates();
    return unsubscribe;
  }, []);

  const numericPrice = Number(price) || 0;
  const sellerCurrency = (originalCurrency || 'GHS').toUpperCase();
  const displayCurrency = (userCurrency || sellerCurrency).toUpperCase();
  const needsConversion = userCurrency !== null && displayCurrency !== sellerCurrency;

  // Synchronous conversion from the shared cache (ratesTick forces recompute)
  const converted = needsConversion
    ? convertAmount(numericPrice, sellerCurrency, displayCurrency)
    : null;

  // Size configurations
  const sizeConfig = {
    small: { fontSize: '0.875rem', gap: '0.125rem' },
    medium: { fontSize: '1rem', gap: '0.125rem' },
    large: { fontSize: '1.5rem', gap: '0.25rem' },
    xlarge: { fontSize: '2rem', gap: '0.25rem' },
  };
  const config = sizeConfig[size] || sizeConfig.medium;
  const secondaryFontSize = size === 'xlarge' || size === 'large' ? '0.875rem' : '0.75rem';

  const formattedOriginal = formatPrice(numericPrice, sellerCurrency);

  // Not converting (same currency, not mounted yet, or rates unavailable):
  // show the original price with its correct symbol.
  if (!needsConversion || converted === null) {
    return (
      <span
        style={{
          fontSize: config.fontSize,
          fontWeight: '600',
          ...textStyle,
        }}
        suppressHydrationWarning
      >
        {formattedOriginal}
      </span>
    );
  }

  const formattedConverted = formatPrice(converted, displayCurrency);

  // Converted price is the PRIMARY display, original as secondary
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: config.gap,
      }}
      suppressHydrationWarning
    >
      <span
        style={{
          fontSize: config.fontSize,
          fontWeight: '600',
          ...textStyle,
        }}
      >
        {formattedConverted}
      </span>
      {showOriginal && (
        <span
          style={{
            fontSize: secondaryFontSize,
            opacity: 0.65,
            ...convertedStyle,
          }}
        >
          {formattedOriginal} {sellerCurrency}
        </span>
      )}
    </span>
  );
}
