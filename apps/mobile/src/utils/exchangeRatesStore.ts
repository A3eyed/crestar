// @ts-nocheck
/**
 * Shared exchange-rate store (mobile).
 * Fetches the USD-based rates table once (5-min TTL), persists it to
 * AsyncStorage for instant offline-friendly startup, and lets every price
 * in the app convert synchronously & consistently on-device.
 */

import { create } from 'zustand';
import AsyncStorage from './safeStorage';

const STORAGE_KEY = 'exchange_rates_usd_v2';
const TTL_MS = 5 * 60 * 1000;

let inflight = null;

const useExchangeRates = create((set, get) => ({
  rates: null, // { USD: 1, GHS: 15.2, ... }
  lastUpdated: 0,
  isLoading: false,
  isHydrated: false,

  /** Load the cached snapshot from AsyncStorage, then refresh if stale. */
  hydrate: async () => {
    if (get().isHydrated) {
      await get().fetchRates();
      return;
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.rates?.USD) {
          set({
            rates: parsed.rates,
            lastUpdated: parsed.lastUpdated || 0,
            isHydrated: true,
          });
        }
      }
    } catch (e) {
      // corrupted snapshot — ignore
    }

    set({ isHydrated: true });
    await get().fetchRates();
  },

  /** Fetch fresh rates from the API (deduped, TTL-aware). */
  fetchRates: async (force = false) => {
    const { rates, lastUpdated } = get();
    if (!force && rates && Date.now() - lastUpdated < TTL_MS) {
      return rates;
    }

    if (inflight) return inflight;

    inflight = (async () => {
      set({ isLoading: true });
      try {
        const response = await fetch('/api/currency/rates?base=USD');
        if (!response.ok) {
          throw new Error(`Rates API returned ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.rates && data.rates.USD) {
          const snapshot = { rates: data.rates, lastUpdated: Date.now() };
          set({ ...snapshot, isLoading: false });
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => {});
          return data.rates;
        }
        throw new Error('Invalid rates payload');
      } catch (error) {
        console.warn('Failed to load exchange rates:', error.message);
        set({ isLoading: false });
        return get().rates;
      } finally {
        inflight = null;
      }
    })();

    return inflight;
  },

  /**
   * Convert synchronously with cached rates.
   * Returns a number, or null if rates aren't loaded / currency unknown.
   */
  convert: (amount, from, to) => {
    const f = (from || '').toUpperCase();
    const t = (to || '').toUpperCase();
    const num = Number(amount) || 0;
    if (f === t) return num;

    const { rates } = get();
    if (!rates) return null;

    const fromRate = rates[f];
    const toRate = rates[t];
    if (!fromRate || !toRate) return null;

    return Math.round((num / fromRate) * toRate * 100) / 100;
  },
}));

export default useExchangeRates;
