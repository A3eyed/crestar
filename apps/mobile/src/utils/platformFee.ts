// @ts-nocheck
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CRESTAR PLATFORM FEE — ONE flat rate, everywhere.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Mobile mirror of `apps/web/src/app/api/utils/platformFee.ts`.
 *
 * Crestar charges a single, flat 5% platform fee — the ONLY fee Crestar takes,
 * identical across every Monetization Center program: Seller, FoodHub, Creator
 * and Deliverer. Every earnings figure shown in the app must be the NET amount
 * the user actually receives after this 5% has been deducted.
 */

/** The flat platform fee, as a decimal fraction. */
export const PLATFORM_FEE_RATE = 0.05;

/** The flat platform fee, as a whole percentage. */
export const PLATFORM_FEE_PERCENT = 5;

/** Share of a transaction the earner keeps, as a whole percentage. */
export const EARNER_PERCENT = 100 - PLATFORM_FEE_PERCENT;

/** Human-readable label for the fee, for UI copy. */
export const PLATFORM_FEE_LABEL = `${PLATFORM_FEE_PERCENT}%`;

/** One sentence we reuse anywhere a balance or payout is shown. */
export const PLATFORM_FEE_NOTE = `All amounts shown are net — Crestar's flat ${PLATFORM_FEE_PERCENT}% fee has already been deducted.`;

/** Round to 2 decimal places. */
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

/** Formatted to 2dp, ready to drop straight into a <Text>. */
export function formatPlatformFee(grossAmount) {
  return platformFeeOn(grossAmount).toFixed(2);
}

/** Formatted net amount, ready to drop straight into a <Text>. */
export function formatNetOfPlatformFee(grossAmount) {
  return netOfPlatformFee(grossAmount).toFixed(2);
}
