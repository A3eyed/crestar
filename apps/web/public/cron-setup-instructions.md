# Real-Time Currency Rate Updates

## Overview
Your app has **real-time currency conversion** that updates exchange rates automatically every **5 minutes** while the app is active.

## How It Works

### 1. **Database Storage**
- All exchange rates are stored in the `exchange_rates` table
- Rates are cached with 5-minute TTL
- History tracked in `exchange_rate_history` table

### 2. **Multi-Layer Caching**
- **Layer 1**: In-memory cache (fastest)
- **Layer 2**: Database cache (5-min TTL)
- **Layer 3**: External API (exchangerate-api.com)

### 3. **Automatic Updates**
Rates refresh automatically in 2 ways:

#### A. Client-Side Auto-Refresh (Primary Method)
- Every `CurrencyPrice` component refreshes every 5 minutes
- Refreshes on window/app focus
- Refreshes when user changes currency preference
- **No setup required** - works immediately ✅

#### B. Manual API Refresh
- `/api/currency/refresh-rates` endpoint can be called manually if needed
- Useful for testing or admin-triggered updates

---

## How Automatic Updates Work

### Component-Level Auto-Refresh

The `CurrencyRateRefresher` component automatically runs in the background:

```jsx
<CurrencyRateRefresher />
```

**What it does:**
- ✅ Refreshes rates every 5 minutes while app is open
- ✅ Refreshes when user returns to the app (window focus)
- ✅ Refreshes when switching between tabs
- ✅ Works on both web and mobile

**Where it's used:**
- Automatically included in all pages that show prices
- No configuration needed
- Zero external dependencies

---

## Supported Currencies (60+)

The system supports 160+ currencies via ExchangeRate-API.

**Priority currencies** (auto-refreshed):
- GHS (Ghana Cedi)
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- NGN (Nigerian Naira)
- ZAR (South African Rand)
- KES (Kenyan Shilling)
- JPY (Japanese Yen)
- CNY (Chinese Yuan)
- INR (Indian Rupee)
- AUD (Australian Dollar)
- CAD (Canadian Dollar)
- CHF (Swiss Franc)
- AED (UAE Dirham)
- BRL (Brazilian Real)
- MXN (Mexican Peso)
- And 44 more...

---

## Monitoring

### Check System Health

Visit: `/api/currency/health`

Returns:
```json
{
  "healthy": true,
  "stats": {
    "baseCurrencies": 15,
    "totalRates": 2400,
    "minutesSinceOldestUpdate": 4
  },
  "latestRates": [...]
}
```

### View Logs

Check your console for:
- `🔄 Auto-refreshing currency rates...`
- `✅ Currency rates refreshed successfully`

---

## Troubleshooting

### Rates not updating?

1. **Check health endpoint**: `/api/currency/health`
2. **Manually refresh**: `/api/currency/refresh-rates`
3. **Clear browser cache**: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
4. **Check API limits**: ExchangeRate-API free tier: 1500 requests/month

### Conversion not working?

1. **Clear browser cache**: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
2. **Check user currency setting**: Settings → Currency
3. **Check console for errors**: F12 → Console tab
4. **Verify database**: Rates should be in `exchange_rates` table

---

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/currency/rates` | GET | Get all rates for a base currency |
| `/api/currency/convert` | GET | Convert a single amount |
| `/api/currency/convert` | POST | Batch convert multiple amounts |
| `/api/currency/refresh-rates` | GET/POST | Manually refresh all rates |
| `/api/currency/health` | GET | System health check |

---

## Cost & Limits

### ExchangeRate-API (Current)
- **Free Tier**: 1,500 requests/month
- **Cost**: $0/month
- **Update Frequency**: Every 24 hours (official), refreshed by active users

### Upgrade Options (if needed)
- **Basic**: $9/month - 100,000 requests
- **Pro**: $29/month - 500,000 requests

**Current usage** (with client-side refresh):
- Depends on active user count
- Approximately 1 request per 5 minutes per active user
- Well within free tier for typical usage! ✅

---

## Summary

✅ **No setup required** - rates refresh automatically
✅ **Platform-aligned** - uses built-in client-side refresh
✅ **Real-time updates** - every 5 minutes while app is active
✅ **Multi-currency support** - 160+ currencies
✅ **Free tier friendly** - minimal API calls

**Need help?** Check the logs or the `/api/currency/health` endpoint.
