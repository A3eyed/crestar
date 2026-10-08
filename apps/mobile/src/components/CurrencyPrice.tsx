// @ts-nocheck
import { View, Text, ActivityIndicator } from 'react-native';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { formatCurrency } from '../utils/currency';

/**
 * Smart currency display component.
 * Shows the price in the user's PREFERRED currency (correct symbol + value),
 * with the seller's original price as a small secondary line.
 *
 * Conversion is synchronous from a shared on-device rates cache, so every
 * price in the app updates instantly when the user changes currency.
 *
 * Usage:
 * <CurrencyPrice price={200} originalCurrency="GHS" />
 * // If user's preferred currency is USD: $13.15  (₵200.00 GHS below)
 */
export default function CurrencyPrice({
  price,
  originalCurrency,
  style = {},
  textStyle = {},
  convertedStyle = {},
  showOriginal = true,
  size = 'medium',
}) {
  const sellerCurrency = originalCurrency || 'GHS';

  const { convertedPrice, userCurrency, isConverting, needsConversion, canConvert } =
    useCurrencyConverter(price, sellerCurrency);

  // Text size styles
  const sizeStyles = {
    small: { fontSize: 12 },
    medium: { fontSize: 16 },
    large: { fontSize: 20 },
    xlarge: { fontSize: 24 },
  };

  const baseTextStyle = {
    color: '#000',
    fontWeight: '600',
    ...sizeStyles[size],
    ...textStyle,
  };

  const secondaryTextStyle = {
    fontSize: baseTextStyle.fontSize * 0.75,
    color: '#6B7280',
    fontWeight: '400',
    marginTop: 2,
    ...convertedStyle,
  };

  // No conversion needed — show the price in its own currency
  if (!needsConversion) {
    return (
      <View style={style}>
        <Text style={baseTextStyle}>{formatCurrency(price, sellerCurrency)}</Text>
      </View>
    );
  }

  // Rates still loading for the first time
  if (isConverting) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', ...style }}>
        <Text style={baseTextStyle}>{formatCurrency(price, sellerCurrency)}</Text>
        <ActivityIndicator size="small" color="#9CA3AF" style={{ marginLeft: 8 }} />
      </View>
    );
  }

  // Conversion unavailable (unknown currency / no rates yet) — show original
  if (!canConvert) {
    return (
      <View style={style}>
        <Text style={baseTextStyle}>{formatCurrency(price, sellerCurrency)}</Text>
      </View>
    );
  }

  // Converted price is the PRIMARY display, original as secondary
  return (
    <View style={style}>
      <Text style={baseTextStyle}>{formatCurrency(convertedPrice, userCurrency)}</Text>
      {showOriginal && (
        <Text style={secondaryTextStyle}>
          {formatCurrency(price, sellerCurrency)} {sellerCurrency}
        </Text>
      )}
    </View>
  );
}
