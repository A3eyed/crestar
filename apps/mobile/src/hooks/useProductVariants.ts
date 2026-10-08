// @ts-nocheck
import { useState, useEffect } from 'react';

export function useProductVariants(variants, variantImages, productImages) {
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [displayImages, setDisplayImages] = useState([]);

  // Initialize variants on mount — do NOT auto-select a color so the
  // base product price is always shown first (consistent with all listing cards).
  useEffect(() => {
    setDisplayImages(productImages.length > 0 ? productImages : []);
  }, [variants, variantImages, productImages]);

  const handleColorSelect = (color, variantStock) => {
    // Check if out of stock
    if (variantStock[color] === 0) {
      return; // Don't allow selection of out-of-stock colors
    }

    setSelectedColor(color);

    // Show ONLY this color's photos — never mix other colors' photos in.
    // variantImages[color] is now an ARRAY of that color's images.
    const rawVariantImages = variantImages[color];
    const colorImages = Array.isArray(rawVariantImages)
      ? rawVariantImages
      : rawVariantImages
        ? [rawVariantImages]
        : [];

    if (colorImages.length > 0) {
      setDisplayImages(colorImages);
    } else {
      // No photos stored for this color — fall back to all product images
      setDisplayImages(productImages);
    }

    // Find the variant for this color and update available sizes
    const colorVariant = variants.find(
      (v) => v.variant_type === 'color' && v.variant_value === color
    );

    if (colorVariant && colorVariant.sizes) {
      let parsedSizes = [];
      if (typeof colorVariant.sizes === 'string') {
        try {
          parsedSizes = JSON.parse(colorVariant.sizes);
        } catch (e) {
          console.error('Failed to parse sizes:', e);
        }
      } else if (Array.isArray(colorVariant.sizes)) {
        parsedSizes = colorVariant.sizes;
      }

      setAvailableSizes(parsedSizes);

      // Auto-select first available size
      if (parsedSizes.length > 0) {
        setSelectedSize(parsedSizes[0]);
      } else {
        setSelectedSize(null);
      }
    }
  };

  const getUniqueColors = () => {
    const colorVariants = variants.filter((v) => v.variant_type === 'color');
    return [...new Set(colorVariants.map((v) => v.variant_value))];
  };

  return {
    selectedColor,
    selectedSize,
    availableSizes,
    displayImages,
    setSelectedSize,
    handleColorSelect,
    getUniqueColors,
  };
}
