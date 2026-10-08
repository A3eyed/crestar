// @ts-nocheck
'use client';

/**
 * Client-side shared exchange-rate cache (web).
 * Fetches the USD-based rates table ONCE per session (5-min TTL) and lets
 * every price on the page convert instantly & consistently on-device —
 * instead of every price component making its own API call.
 *
 * NOTE: All functions here are only ever invoked from event handlers or
 * useEffect (after mount), never during server render, so timestamps are
 * hydration-safe.
 */

const STORAGE_KEY = 'exchange_rates_usd_v2';
const TTL_MS = 5 * 60 * 1000;

let cache = null; // { rates, timestamp }
let inflight = null;
const listeners = new Set();

// Browser-only clock (never runs during SSR render)
function nowMs() {
  return globalThis.Date.now();
}

function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      // ignore listener errors
    }
  });
}

function readSnapshot() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.rates && parsed.rates.USD) return parsed;
  } catch (e) {
    // corrupted snapshot — ignore
  }
  return null;
}

function writeSnapshot(data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // storage unavailable
  }
}

/** Get whatever rates we have right now (may be stale or null). */
export function getRates() {
  if (!cache) {
    cache = readSnapshot();
  }
  return cache;
}

/** Load rates from the API (deduped, TTL-aware). Call from useEffect only. */
export async function loadRates(force = false) {
  const current = getRates();
  if (!force && current && nowMs() - current.timestamp < TTL_MS) {
    return current;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const response = await fetch('/api/currency/rates?base=USD');
      if (!response.ok) {
        throw new Error(`Rates API returned ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.rates && data.rates.USD) {
        cache = { rates: data.rates, timestamp: nowMs() };
        writeSnapshot(cache);
        notify();
      }
    } catch (error) {
      console.warn('Failed to load exchange rates:', error.message);
    } finally {
      inflight = null;
    }
    return cache;
  })();

  return inflight;
}

/**
 * Convert synchronously using cached rates.
 * Returns a number, or null when rates aren't loaded / currency unknown.
 */
export function convertAmount(amount, from, to) {
  const f = (from || '').toUpperCase();
  const t = (to || '').toUpperCase();
  const num = Number(amount) || 0;
  if (f === t) return num;

  const current = getRates();
  if (!current) return null;

  const fromRate = current.rates[f];
  const toRate = current.rates[t];
  if (!fromRate || !toRate) return null;

  return Math.round((num / fromRate) * toRate * 100) / 100;
}

/** Subscribe to rate updates. Returns an unsubscribe function. */
export function subscribeToRates(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
