// @ts-nocheck
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CRESTAR PLATFORM FEE — ONE flat rate, everywhere.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Crestar charges a single, flat 5% platform fee. It is the ONLY fee Crestar
 * takes, and it is identical across every program in the Monetization Center:
 *
 *   • Sellers (physical goods)
 *   • FoodHub (food & drink vendors)
 *   • Creators / affiliates (video commissions)
 *   • Deliverers (delivery fees)
 *
 * There are no tiered rates, no per-category rates, no "creator sale" rate and
 * no registered-business discount. There are no subscriptions. If you find
 * another fee anywhere, it is a bug — delete it and use this module instead.
 *
 * The database is the final authority: `orders.platform_fee_rate` defaults to
 * 0.0500 and the `crestar_apply_platform_fee` BEFORE INSERT/UPDATE trigger nets
 * every payout leg exactly once. The helpers here mirror that maths precisely
 * so the API, the web UI and the mobile app all quote the same numbers the
 * ledger will actually record.
 */

/** The flat platform fee, as a decimal fraction. */
export const PLATFORM_FEE_RATE = 0.05;

/** The flat platform fee, as a whole percentage. */
export const PLATFORM_FEE_PERCENT = 5;

/** Share of a transaction the earner keeps, as a whole percentage. */
export const EARNER_PERCENT = 100 - PLATFORM_FEE_PERCENT;

/** Human-readable label for the fee, for UI copy and API responses. */
export const PLATFORM_FEE_LABEL = `${PLATFORM_FEE_PERCENT}%`;

/** Round to 2 decimal places the same way Postgres ROUND(x, 2) does. */
export function money(value) {
  const amount = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

/** The 5% Crestar keeps out of a gross amount. */
export function platformFeeOn(grossAmount) {
  const gross = Math.max(0, money(grossAmount));
  return money(gross * PLATFORM_FEE_RATE);
}

/** What the earner actually receives out of a gross amount (gross − 5%). */
export function netOfPlatformFee(grossAmount) {
  const gross = Math.max(0, money(grossAmount));
  return money(gross - platformFeeOn(gross));
}

/**
 * Split one order the exact way the database trigger does.
 *
 * `goodsTotal` is the order subtotal (delivery excluded). The creator's
 * commission comes out of the goods total first, then BOTH the creator's and
 * the seller's shares are netted by 5%. The deliverer's fee is netted by 5%
 * separately, because it is usually attached after the order is created.
 *
 * @returns { platformFee, sellerPayout, creatorCommission, delivererFee }
 */
export function splitOrderFees({ goodsTotal = 0, creatorCommission = 0, delivererFee = 0 } = {}) {
  const goods = Math.max(0, money(goodsTotal));
  const creatorGross = Math.min(goods, Math.max(0, money(creatorCommission)));
  const sellerGross = Math.max(0, money(goods - creatorGross));
  const delivererGross = Math.max(0, money(delivererFee));

  return {
    platformFee: money(platformFeeOn(goods) + platformFeeOn(delivererGross)),
    sellerPayout: netOfPlatformFee(sellerGross),
    creatorCommission: netOfPlatformFee(creatorGross),
    delivererFee: netOfPlatformFee(delivererGross),
    rate: PLATFORM_FEE_RATE,
  };
}

/** Small, serialisable summary handy for API responses and UI banners. */
export function platformFeeSummary(grossAmount) {
  const gross = Math.max(0, money(grossAmount));
  const fee = platformFeeOn(gross);
  return {
    gross,
    fee,
    net: money(gross - fee),
    rate: PLATFORM_FEE_RATE,
    percent: PLATFORM_FEE_PERCENT,
    label: PLATFORM_FEE_LABEL,
  };
}
