// @ts-nocheck
/**
 * Shared Exchange Rates Service
 * ------------------------------
 * Single source of truth for currency conversion across the whole platform.
 *
 * Design:
 * - We store ONE rate table with base USD (160+ currencies) instead of a table
 *   per base currency. Any pair is converted via cross-rate:
 *     amount(from -> to) = amount / rateUSD[from] * rateUSD[to]
 * - Layered caching: memory (per instance) -> database (shared) -> live API.
 * - If everything fails, we fall back to the last known (stale) database rates
 *   so prices never silently stop converting.
 *
 * Live rate providers (no API key required):
 * - Primary:  https://open.er-api.com/v6/latest/USD   (ExchangeRate-API open endpoint)
 * - Fallback: https://api.exchangerate-api.com/v4/latest/USD
 */

import sql from '@/app/api/utils/sql';

const PRIMARY_API = 'https://open.er-api.com/v6/latest/USD';
const FALLBACK_API = 'https://api.exchangerate-api.com/v4/latest/USD';

// How long DB rates are considered fresh (rates from these providers update ~daily)
const DB_FRESH_MINUTES = 60;
// Memory cache TTL per serverless instance
const MEMORY_TTL_MS = 30 * 60 * 1000;

let memoryCache = null; // { rates, timestamp }

async function fetchLiveUsdRates() {
  // Primary provider
  try {
    const res = await fetch(PRIMARY_API, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.result === 'success' && data.rates && data.rates.USD) {
        return data.rates;
      }
    }
  } catch (err) {
    console.warn('Primary exchange rate API failed:', err.message);
  }

  // Fallback provider
  try {
    const res = await fetch(FALLBACK_API, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && data.rates.USD) {
        return data.rates;
      }
    }
  } catch (err) {
    console.warn('Fallback exchange rate API failed:', err.message);
  }

  return null;
}

async function readDbRates(maxAgeMinutes) {
  try {
    let rows;
    if (maxAgeMinutes) {
      rows = await sql(
        `SELECT target_currency, rate, last_updated
         FROM exchange_rates
         WHERE base_currency = 'USD'
           AND last_updated > NOW() - ($1 * INTERVAL '1 minute')`,
        [maxAgeMinutes]
      );
    } else {
      rows = await sql`
        SELECT target_currency, rate, last_updated
        FROM exchange_rates
        WHERE base_currency = 'USD'
      `;
    }

    if (!rows || rows.length === 0) return null;

    const rates = {};
    rows.forEach((row) => {
      rates[row.target_currency] = parseFloat(row.rate);
    });
    rates.USD = 1;

    return {
      rates,
      timestamp: new Date(rows[0].last_updated).getTime(),
    };
  } catch (err) {
    console.error('Failed to read exchange rates from database:', err.message);
    return null;
  }
}

async function saveDbRates(rates) {
  try {
    const entries = Object.entries(rates).filter(
      ([code, rate]) =>
        typeof code === 'string' &&
        code.length === 3 &&
        Number.isFinite(Number(rate)) &&
        Number(rate) > 0
    );

    if (entries.length === 0) return false;

    // Single batched upsert for all currencies
    const tuples = [];
    const values = [];
    entries.forEach(([code, rate], i) => {
      const o = i * 2;
      tuples.push(`('USD', $${o + 1}, $${o + 2}, NOW())`);
      values.push(code.toUpperCase(), Number(rate));
    });

    await sql(
      `INSERT INTO exchange_rates (base_currency, target_currency, rate, last_updated)
       VALUES ${tuples.join(', ')}
       ON CONFLICT (base_currency, target_currency)
       DO UPDATE SET rate = EXCLUDED.rate, last_updated = NOW()`,
      values
    );

    console.log(`Saved ${entries.length} USD-based exchange rates to database`);
    return true;
  } catch (err) {
    console.error('Failed to save exchange rates to database:', err.message);
    return false;
  }
}

/**
 * Get the USD-based rates map. Never throws.
 * Returns { rates, timestamp, source } or null only if there has NEVER been a
 * successful rate fetch (no live API + empty database).
 */
export async function getUsdRates(forceRefresh = false) {
  // Layer 1: memory
  if (!forceRefresh && memoryCache && Date.now() - memoryCache.timestamp < MEMORY_TTL_MS) {
    return { ...memoryCache, source: 'memory' };
  }

  // Layer 2: fresh database rates
  if (!forceRefresh) {
    const db = await readDbRates(DB_FRESH_MINUTES);
    if (db) {
      memoryCache = db;
      return { ...db, source: 'database' };
    }
  }

  // Layer 3: live API
  const live = await fetchLiveUsdRates();
  if (live) {
    live.USD = 1;
    const timestamp = Date.now();
    await saveDbRates(live);
    memoryCache = { rates: live, timestamp };
    return { rates: live, timestamp, source: 'live-api' };
  }

  // Layer 4: stale database rates (better than nothing)
  const stale = await readDbRates(null);
  if (stale) {
    memoryCache = stale;
    return { ...stale, source: 'database-stale' };
  }

  return null;
}

/**
 * Compute the rate for converting 1 unit of `from` into `to`.
 * Returns null if either currency is unknown.
 */
export function getCrossRate(usdRates, from, to) {
  const f = (from || '').toUpperCase();
  const t = (to || '').toUpperCase();
  if (f === t) return 1;
  const fromRate = usdRates[f];
  const toRate = usdRates[t];
  if (!fromRate || !toRate) return null;
  return toRate / fromRate;
}

/**
 * Convert an amount between any two currencies. Returns null on unknown codes.
 */
export function convertWithRates(usdRates, amount, from, to) {
  const rate = getCrossRate(usdRates, from, to);
  if (rate === null) return null;
  const num = Number(amount) || 0;
  return Math.round(num * rate * 100) / 100;
}

/**
 * Build a rates map for an arbitrary base currency from the USD table.
 */
export function ratesForBase(usdRates, base) {
  const b = (base || 'USD').toUpperCase();
  const baseRate = usdRates[b];
  if (!baseRate) return null;
  const out = {};
  for (const [code, rate] of Object.entries(usdRates)) {
    out[code] = Math.round((rate / baseRate) * 1e8) / 1e8;
  }
  return out;
}
