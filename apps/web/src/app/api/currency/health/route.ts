// @ts-nocheck
/**
 * Currency System Health Check
 * Returns status of exchange rates and when they were last updated
 */

import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    // Get latest rates update time
    const latestRates = await sql`
      SELECT 
        base_currency,
        COUNT(*) as rate_count,
        MAX(last_updated) as last_updated
      FROM exchange_rates
      GROUP BY base_currency
      ORDER BY last_updated DESC
      LIMIT 10
    `;

    // Get total rate count
    const totals = await sql`
      SELECT 
        COUNT(DISTINCT base_currency) as base_currencies,
        COUNT(*) as total_rates
      FROM exchange_rates
    `;

    // Get recent history count
    const recentHistory = await sql`
      SELECT COUNT(*) as history_count
      FROM exchange_rate_history
      WHERE timestamp > NOW() - INTERVAL '24 hours'
    `;

    // Calculate freshness (how old the oldest active rate is)
    const oldestRate = await sql`
      SELECT MIN(last_updated) as oldest_update
      FROM exchange_rates
    `;

    const oldestUpdateTime = oldestRate[0]?.oldest_update
      ? new Date(oldestRate[0].oldest_update)
      : null;

    const minutesSinceOldest = oldestUpdateTime
      ? Math.floor((Date.now() - oldestUpdateTime.getTime()) / (1000 * 60))
      : null;

    const isHealthy = minutesSinceOldest === null || minutesSinceOldest < 10;

    return Response.json({
      success: true,
      healthy: isHealthy,
      stats: {
        baseCurrencies: parseInt(totals[0]?.base_currencies || 0),
        totalRates: parseInt(totals[0]?.total_rates || 0),
        historyEntriesLast24h: parseInt(recentHistory[0]?.history_count || 0),
        minutesSinceOldestUpdate: minutesSinceOldest,
      },
      latestRates: latestRates.map((r) => ({
        baseCurrency: r.base_currency,
        rateCount: parseInt(r.rate_count),
        lastUpdated: new Date(r.last_updated).toISOString(),
        minutesAgo: Math.floor(
          (Date.now() - new Date(r.last_updated).getTime()) / (1000 * 60),
        ),
      })),
      recommendations: isHealthy
        ? ["System healthy - rates are fresh"]
        : [
            "Rates are stale - consider triggering a manual refresh",
            "POST to /api/currency/refresh-rates to update all rates",
            "GET /api/currency/refresh-rates for automatic background refresh",
          ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check error:", error);
    return Response.json(
      {
        success: false,
        healthy: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
