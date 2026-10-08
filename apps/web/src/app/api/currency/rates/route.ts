// @ts-nocheck
/**
 * Exchange Rates API
 * Returns the full rates table for any base currency (computed from the
 * shared USD table via cross-rates). This is the endpoint clients use to
 * cache rates locally and convert prices instantly on-device.
 */

import { getUsdRates, ratesForBase } from '@/app/api/utils/exchangeRates';

/**
 * GET /api/currency/rates?base=GHS&refresh=true
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const baseCurrency = (searchParams.get('base') || 'USD').toUpperCase();
    const forceRefresh = searchParams.get('refresh') === 'true';

    const result = await getUsdRates(forceRefresh);

    if (!result) {
      return Response.json(
        {
          success: false,
          error: 'Unable to fetch exchange rates. Please try again.',
        },
        { status: 503 }
      );
    }

    const rates = ratesForBase(result.rates, baseCurrency);

    if (!rates) {
      return Response.json(
        { success: false, error: `Currency ${baseCurrency} not supported` },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      base: baseCurrency,
      rates,
      lastUpdated: new Date(result.timestamp).toISOString(),
      cached: result.source !== 'live-api',
      source: result.source,
    });
  } catch (error) {
    console.error('Exchange rates fetch error:', error);
    return Response.json(
      {
        success: false,
        error: 'Unable to fetch exchange rates. Please try again.',
      },
      { status: 503 }
    );
  }
}

/**
 * POST /api/currency/rates
 * Forces a refresh of the shared USD rate table (one upstream call covers
 * every currency, so this is cheap).
 */
export async function POST() {
  try {
    const result = await getUsdRates(true);

    if (!result) {
      return Response.json(
        { success: false, error: 'Unable to refresh exchange rates' },
        { status: 503 }
      );
    }

    return Response.json({
      success: true,
      message: 'Rates refreshed',
      rateCount: Object.keys(result.rates).length,
      lastUpdated: new Date(result.timestamp).toISOString(),
      source: result.source,
    });
  } catch (error) {
    console.error('Rate refresh error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
