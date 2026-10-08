// @ts-nocheck
import {
  PLATFORM_FEE_PERCENT,
  PLATFORM_FEE_LABEL,
  formatPlatformFee,
  formatNetOfPlatformFee,
} from '@/utils/platformFee';

export { PLATFORM_FEE_PERCENT, PLATFORM_FEE_LABEL };

/** Crestar's flat 3% platform fee on a listing price. */
export function calculatePlatformFee(price) {
  if (!price) return (0).toFixed(2);
  return formatPlatformFee(price);
}

/** What the seller actually receives — the price minus the flat 3% fee. */
export function calculateYouReceive(price) {
  if (!price) return (0).toFixed(2);
  return formatNetOfPlatformFee(price);
}
