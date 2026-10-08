// @ts-nocheck
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { ShoppingBag } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRODUCT_TILE = (SCREEN_WIDTH - 4) / 3;

export function ShopTab({
  sellerProducts,
  loadingProducts,
  colors,
  formatCurrency,
  onAddProduct,
  onProductPress,
}) {
  if (loadingProducts) {
    return (
      <View style={{ paddingTop: 40, alignItems: 'center' }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (sellerProducts.length === 0) {
    return (
      <View
        style={{
          paddingTop: 60,
          alignItems: 'center',
          paddingHorizontal: 40,
        }}
      >
        <ShoppingBag size={48} color={colors.textTertiary} style={{ marginBottom: 16 }} />
        <Text
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 8,
          }}
        >
          No products yet
        </Text>
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 14,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          Start adding products to your shop
        </Text>
        <TouchableOpacity
          onPress={onAddProduct}
          style={{
            backgroundColor: '#D4AF37',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 4,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: '700',
            }}
          >
            Add product
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      {sellerProducts.map((product) => {
        const imageUrl =
          Array.isArray(product.media) && product.media.length > 0
            ? product.media[0]
            : typeof product.media === 'string'
              ? product.media
              : null;

        return (
          <TouchableOpacity
            key={product.id}
            onPress={() => onProductPress(product)}
            style={{
              width: PRODUCT_TILE,
              height: PRODUCT_TILE * 1.35,
              position: 'relative',
            }}
          >
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: colors.cardBackgroundAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShoppingBag size={24} color={colors.textTertiary} />
              </View>
            )}

            {/* Price overlay */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                paddingVertical: 6,
                paddingHorizontal: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: '700',
                }}
                numberOfLines={1}
              >
                {formatCurrency(product.price)}
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: 11,
                }}
                numberOfLines={1}
              >
                {product.title}
              </Text>
            </View>

            {/* Today's special badge */}
            {product.is_todays_special && (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  backgroundColor: '#D4AF37',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 9,
                    fontWeight: '700',
                  }}
                >
                  SPECIAL
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
