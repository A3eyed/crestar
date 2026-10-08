// @ts-nocheck
/**
 * Background Currency Rate Refresh
 * Refreshes the shared USD rate table. Because all conversions use USD
 * cross-rates, ONE upstream call keeps every currency pair fresh.
 * Can be called manually, by the in-app refreshers, or via cron.
 */

import { getUsdRates } from '@/app/api/utils/exchangeRates';

async function refresh() {
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
    // Kept for backward compatibility with existing clients
    results: [
      {
        currency: 'USD',
        success: true,
        rateCount: Object.keys(result.rates).length,
      },
    ],
    timestamp: new Date().toISOString(),
  });
}

/** POST /api/currency/refresh-rates — manual refresh */
export async function POST() {
  try {
    return await refresh();
  } catch (error) {
    console.error('Rate refresh error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** GET /api/currency/refresh-rates — for cron jobs / scheduled tasks */
export async function GET() {
  try {
    return await refresh();
  } catch (error) {
    console.error('Auto-refresh error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
