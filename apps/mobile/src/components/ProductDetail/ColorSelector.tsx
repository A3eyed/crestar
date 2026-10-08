// @ts-nocheck
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Image } from 'expo-image';

export function ColorSelector({
  colors,
  uniqueColors,
  selectedColor,
  variantStock,
  variantImages,
  onColorSelect,
  getCurrentStock,
  isLowStock,
  isColorOutOfStock,
}) {
  if (uniqueColors.length === 0) return null;

  return (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: '700',
          }}
        >
          Color: {selectedColor || 'Select'}
        </Text>
        {/* Stock Badge for selected color */}
        {selectedColor && (
          <>
            {getCurrentStock() === 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <AlertCircle size={14} color="#F59E0B" />
                <Text
                  style={{
                    color: '#F59E0B',
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  Out of Stock
                </Text>
              </View>
            ) : isLowStock() ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <AlertCircle size={14} color="#F59E0B" />
                <Text
                  style={{
                    color: '#F59E0B',
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  Only {getCurrentStock()} left
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {uniqueColors.map((color) => {
          const isOutOfStock = isColorOutOfStock(color);
          const colorStock = variantStock[color] || 0;
          const colorIsLowStock = colorStock > 0 && colorStock < 10;
          // variantImages[color] is now an ARRAY of that color's photos
          const rawImgs = variantImages[color];
          const swatchImage = Array.isArray(rawImgs) ? rawImgs[0] : rawImgs;
          const hasImage = !!swatchImage;

          return (
            <TouchableOpacity
              key={color}
              onPress={() => onColorSelect(color)}
              disabled={isOutOfStock}
              style={{
                paddingHorizontal: hasImage ? 4 : 16,
                paddingVertical: hasImage ? 4 : 10,
                borderRadius: 12,
                backgroundColor:
                  selectedColor === color
                    ? '#D4AF37'
                    : isOutOfStock
                      ? 'rgba(156, 163, 175, 0.1)'
                      : colors.cardBackground,
                borderWidth: 2,
                borderColor:
                  selectedColor === color
                    ? '#D4AF37'
                    : colorIsLowStock
                      ? '#F59E0B'
                      : isOutOfStock
                        ? 'rgba(156, 163, 175, 0.3)'
                        : colors.border,
                opacity: isOutOfStock ? 0.5 : 1,
                minWidth: hasImage ? 64 : undefined,
                position: 'relative',
              }}
            >
              {hasImage ? (
                <View style={{ position: 'relative' }}>
                  <Image
                    source={{ uri: swatchImage }}
                    style={{ width: 56, height: 56, borderRadius: 8 }}
                    contentFit="cover"
                  />
                  {colorIsLowStock && !isOutOfStock && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#F59E0B',
                      }}
                    />
                  )}
                  {isOutOfStock && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontSize: 10,
                          fontWeight: '700',
                        }}
                      >
                        OUT
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      color:
                        selectedColor === color
                          ? '#FFFFFF'
                          : isOutOfStock
                            ? colors.textTertiary
                            : colors.text,
                      fontSize: 15,
                      fontWeight: selectedColor === color ? '700' : '500',
                      textDecorationLine: isOutOfStock ? 'line-through' : 'none',
                    }}
                  >
                    {color}
                  </Text>
                  {colorIsLowStock && !isOutOfStock && (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#F59E0B',
                      }}
                    />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
