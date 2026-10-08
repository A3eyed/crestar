// @ts-nocheck
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import useExchangeRates from '../utils/exchangeRatesStore';

// Refresh every 5 minutes
const REFRESH_INTERVAL = 5 * 60 * 1000;

/**
 * Background Currency Rate Refresher (mobile)
 * Keeps the shared on-device rates cache fresh so every price converts
 * with up-to-date values. Fails silently — prices fall back to the last
 * known rates if the network is unavailable.
 */
export default function CurrencyRateRefresher() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const { hydrate, fetchRates } = useExchangeRates.getState();

    // Load cached snapshot + fetch fresh rates on app start
    hydrate();

    // Periodic refresh (TTL-aware and deduped inside the store)
    const intervalId = setInterval(() => {
      fetchRates();
    }, REFRESH_INTERVAL);

    // Refresh when the app returns to the foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        fetchRates();
      }
      appState.current = nextAppState;
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  // Renders nothing — background service only
  return null;
}
