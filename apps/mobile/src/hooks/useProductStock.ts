// @ts-nocheck
export function useProductStock(product, variantStock, selectedColor) {
  // FIX: use == null instead of falsy check — stock value of 0 is valid and means "out of stock"
  const getCurrentStock = () => {
    if (!selectedColor || variantStock[selectedColor] == null) {
      return product?.stockQuantity || 0;
    }
    return variantStock[selectedColor];
  };

  const isLowStock = () => {
    const stock = getCurrentStock();
    return stock > 0 && stock < 10;
  };

  const isColorOutOfStock = (color) => {
    return variantStock[color] === 0;
  };

  return {
    getCurrentStock,
    isLowStock,
    isColorOutOfStock,
  };
}
