// @ts-nocheck

/**
 * Product pricing with color variants.
 *
 * IMPORTANT: price_adjustment comes back from the database as a STRING
 * (Postgres numeric columns are serialized as text, e.g. "0.00").
 * It must be parsed to a number before adding — otherwise JavaScript
 * string-concatenates: 50 + "0.00" = "500.00" (the infamous 50→500 bug).
 */
export function useProductPricing(product, variants, selectedColor) {
  const getCurrentPrice = () => {
    const basePrice = parseFloat(product?.price) || 0;

    if (!selectedColor) return basePrice;

    const colorVariant = variants.find(
      (v) => v.variant_type === 'color' && v.variant_value === selectedColor
    );

    if (!colorVariant) return basePrice;

    const priceAdjustment = parseFloat(colorVariant.price_adjustment) || 0;
    return basePrice + priceAdjustment;
  };

  return {
    getCurrentPrice,
  };
}
