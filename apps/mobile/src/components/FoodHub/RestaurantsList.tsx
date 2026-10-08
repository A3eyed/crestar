// @ts-nocheck
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin } from 'lucide-react-native';
import RestaurantCard from './RestaurantCard';

export default function RestaurantsList({
  restaurants,
  selectedCategory,
  userCity,
  userLocation,
  activeTab,
  colors,
  formatCurrency,
  onRestaurantPress,
  onEnableLocation,
}) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 19,
          fontWeight: '700',
          marginBottom: 14,
        }}
      >
        {selectedCategory === 'local' && userCity
          ? `Local ${activeTab === 'food' ? 'Food' : 'Drinks'} in ${userCity}`
          : userLocation
            ? `${activeTab === 'food' ? 'Food' : 'Drinks'} Near You`
            : `Popular ${activeTab === 'food' ? 'Food' : 'Drinks'}`}
      </Text>

      {selectedCategory === 'local' && !userCity && (
        <View
          style={{
            alignItems: 'center',
            paddingVertical: 40,
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            paddingHorizontal: 20,
          }}
        >
          <MapPin size={48} color={colors.textTertiary} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 16,
              textAlign: 'center',
              marginTop: 16,
            }}
          >
            Enable location to see local sellers
          </Text>
          <TouchableOpacity
            onPress={onEnableLocation}
            style={{
              marginTop: 16,
              backgroundColor: colors.accent,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: colors.accentText, fontSize: 14, fontWeight: '600' }}>
              Enable Location
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {restaurants.length === 0 && selectedCategory !== 'local' && (
        <View
          style={{
            alignItems: 'center',
            paddingVertical: 40,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              textAlign: 'center',
            }}
          >
            {userLocation
              ? `No ${activeTab === 'food' ? 'food' : 'drink'} products found nearby.`
              : 'Enable location to see FoodHub products near you'}
          </Text>
        </View>
      )}

      {restaurants.length === 0 && selectedCategory === 'local' && userCity && (
        <View
          style={{
            alignItems: 'center',
            paddingVertical: 40,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              textAlign: 'center',
            }}
          >
            No local {activeTab === 'food' ? 'food' : 'drink'} products found in {userCity}.
          </Text>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 13,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            Try selecting "All" to see sellers from other areas
          </Text>
        </View>
      )}

      {restaurants.map((restaurant) => (
        <RestaurantCard
          key={restaurant.id}
          restaurant={restaurant}
          colors={colors}
          formatCurrency={formatCurrency}
          onPress={() => onRestaurantPress(restaurant.id)}
          selectedCategory={selectedCategory}
        />
      ))}
    </View>
  );
}
