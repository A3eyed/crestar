// @ts-nocheck
import { View, Text, TouchableOpacity } from 'react-native';
import { Clock, Star, MapPin } from 'lucide-react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';

export default function RestaurantCard({
  restaurant,
  colors,
  formatCurrency,
  onPress,
  selectedCategory,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        marginBottom: 14,
        overflow: 'hidden',
        borderRadius: 16,
      }}
    >
      <BlurView
        intensity={60}
        tint={colors.glass.tint}
        style={{ borderWidth: 1, borderColor: colors.border }}
      >
        <Image
          source={{ uri: restaurant.image }}
          style={{ width: '100%', height: 160 }}
          contentFit="cover"
        />

        {/* Tags */}
        {restaurant.tags && restaurant.tags.length > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              flexDirection: 'row',
              gap: 6,
            }}
          >
            {restaurant.tags.map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    color: '#FFF',
                    fontSize: 10,
                    fontWeight: '600',
                  }}
                >
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Distance or Local badge */}
        {selectedCategory === 'local' ? (
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor: 'rgba(212,175,55,0.9)',
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <MapPin size={11} color="#FFF" />
            <Text
              style={{
                color: '#FFF',
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              LOCAL
            </Text>
          </View>
        ) : restaurant.distance ? (
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor: 'rgba(212,175,55,0.9)',
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <MapPin size={11} color="#FFF" />
            <Text
              style={{
                color: '#FFF',
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {restaurant.distance < 1
                ? `${Math.round(restaurant.distance * 1000)}m`
                : `${restaurant.distance.toFixed(1)}km`}
            </Text>
          </View>
        ) : null}

        <View style={{ padding: 14 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: '700',
              marginBottom: 3,
            }}
          >
            {restaurant.name}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            {restaurant.cuisine}
          </Text>

          {restaurant.sellerName ? (
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 12,
                marginBottom: 10,
              }}
              numberOfLines={1}
            >
              by {restaurant.sellerName}
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Star size={13} color="#FFB800" fill="#FFB800" />
              <Text
                style={{
                  color: '#FFB800',
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {restaurant.rating}
              </Text>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 12,
                }}
              >
                ({restaurant.reviews})
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Clock size={13} color={colors.textTertiary} />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                }}
              >
                {restaurant.deliveryTime}
              </Text>
            </View>

            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor:
                  restaurant.deliveryFee === 'Free'
                    ? 'rgba(212,175,55,0.15)'
                    : 'rgba(255,255,255,0.08)',
              }}
            >
              <Text
                style={{
                  color: restaurant.deliveryFee === 'Free' ? '#D4AF37' : colors.textSecondary,
                  fontSize: 11,
                  fontWeight: '600',
                }}
              >
                {restaurant.deliveryFee === 'Free' ? 'Free delivery' : restaurant.deliveryFee}
              </Text>
            </View>

            {restaurant.price ? (
              <Text
                style={{
                  color: colors.text,
                  fontSize: 13,
                  fontWeight: '700',
                }}
              >
                {formatCurrency(restaurant.price, restaurant.currency)}
              </Text>
            ) : null}

            {restaurant.minOrder ? (
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 11,
                }}
              >
                Min qty {restaurant.minOrder}
              </Text>
            ) : null}
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}
