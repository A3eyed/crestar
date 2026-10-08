// @ts-nocheck
'use client';

import { useEffect } from 'react';
import { loadRates } from '../utils/ratesClient';

// Refresh every 5 minutes
const REFRESH_INTERVAL = 5 * 60 * 1000;

/**
 * Background Currency Rate Refresher (web)
 * Keeps the shared client-side rates cache fresh so every price on the page
 * converts with up-to-date values. Fails silently — prices fall back to the
 * last known rates if the network is unavailable.
 */
export default function CurrencyRateRefresher() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial load (deduped + TTL-aware inside the rates client)
    loadRates();

    const intervalId = setInterval(() => {
      loadRates(true);
    }, REFRESH_INTERVAL);

    // Refresh when the user returns to the tab
    const handleFocus = () => {
      loadRates();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Renders nothing — background service only
  return null;
}
