// @ts-nocheck
/**
 * Currency Conversion API
 * Backed by the shared exchange-rate service (live provider + DB cache).
 * Any currency pair is supported via USD cross-rates.
 */

import { getUsdRates, getCrossRate } from '@/app/api/utils/exchangeRates';

/**
 * GET /api/currency/convert?amount=100&from=GHS&to=USD
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = parseFloat(searchParams.get('amount')) || 0;
    const fromCurrency = (searchParams.get('from') || 'GHS').toUpperCase();
    const toCurrency = (searchParams.get('to') || 'USD').toUpperCase();

    if (fromCurrency === toCurrency) {
      return Response.json({
        success: true,
        amount,
        convertedAmount: amount,
        from: fromCurrency,
        to: toCurrency,
        rate: 1,
      });
    }

    const result = await getUsdRates();

    if (!result) {
      return Response.json(
        {
          success: false,
          error: 'Unable to fetch exchange rates. Please try again.',
        },
        { status: 503 }
      );
    }

    const rate = getCrossRate(result.rates, fromCurrency, toCurrency);

    if (rate === null) {
      return Response.json(
        {
          success: false,
          error: `Currency pair ${fromCurrency}/${toCurrency} not supported`,
        },
        { status: 400 }
      );
    }

    const convertedAmount = Math.round(amount * rate * 100) / 100;

    return Response.json({
      success: true,
      amount,
      convertedAmount,
      from: fromCurrency,
      to: toCurrency,
      rate: parseFloat(rate.toFixed(8)),
      lastUpdated: new Date(result.timestamp).toISOString(),
      source: result.source,
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/currency/convert
 * Body: { amounts: number[], from: string, to: string }
 * Batch conversion for multiple prices in one request.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { amounts = [], from = 'GHS', to = 'USD' } = body;

    if (!Array.isArray(amounts) || amounts.length === 0) {
      return Response.json(
        { success: false, error: 'amounts must be a non-empty array' },
        { status: 400 }
      );
    }

    const fromCurrency = String(from).toUpperCase();
    const toCurrency = String(to).toUpperCase();

    if (fromCurrency === toCurrency) {
      return Response.json({
        success: true,
        conversions: amounts.map((amount) => ({
          original: parseFloat(amount) || 0,
          converted: parseFloat(amount) || 0,
        })),
        from: fromCurrency,
        to: toCurrency,
        rate: 1,
      });
    }

    const result = await getUsdRates();
    const rate = result ? getCrossRate(result.rates, fromCurrency, toCurrency) : null;

    if (rate === null) {
      // Graceful fallback: return original amounts so UIs never break
      return Response.json(
        {
          success: false,
          error: 'Unable to convert currency. Please try again.',
          fallback: amounts.map((amount) => ({
            original: parseFloat(amount) || 0,
            converted: parseFloat(amount) || 0,
          })),
        },
        { status: 503 }
      );
    }

    const conversions = amounts.map((amount) => {
      const original = parseFloat(amount) || 0;
      return {
        original,
        converted: Math.round(original * rate * 100) / 100,
      };
    });

    return Response.json({
      success: true,
      conversions,
      from: fromCurrency,
      to: toCurrency,
      rate: parseFloat(rate.toFixed(8)),
      lastUpdated: new Date(result.timestamp).toISOString(),
    });
  } catch (error) {
    console.error('Batch currency conversion error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
