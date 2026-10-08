// @ts-nocheck
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { authenticatedFetch } from '@/utils/authenticatedFetch';

export function useFoodHubLocation() {
  const [userLocation, setUserLocation] = useState(null);
  const [userCity, setUserCity] = useState(null);
  const [userRegion, setUserRegion] = useState(null);
  const [userCountry, setUserCountry] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (userLocation && !userCity) {
      reverseGeocode(userLocation.latitude, userLocation.longitude);
    }
  }, [userLocation, userCity]);

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (result && result.length > 0) {
        const location = result[0];
        setUserCity(location.city || location.subregion || location.district);
        setUserRegion(location.region);
        setUserCountry(location.country);
        console.log('📍 User location:', {
          city: location.city,
          region: location.region,
          country: location.country,
        });
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLocationLoading(false);
    } catch (error) {
      console.error('Location error:', error);
      setLocationLoading(false);
    }
  };

  return {
    userLocation,
    userCity,
    userRegion,
    userCountry,
    locationLoading,
    requestLocationPermission,
  };
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const normalizeMedia = (media) => {
  if (Array.isArray(media)) {
    return media;
  }
  if (typeof media === 'string') {
    try {
      const parsed = JSON.parse(media);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const mapProductToFoodHubCard = (product, activeTab) => {
  const media = normalizeMedia(product.media);
  const firstMedia = media[0];
  const image =
    typeof firstMedia === 'string'
      ? firstMedia
      : firstMedia?.url || firstMedia?.uri || product.thumbnail_url;
  const attributes =
    activeTab === 'drinks' ? product.drink_attributes || {} : product.food_attributes || {};
  const tags = [
    product.food_subcategory || product.category,
    attributes.dietaryFlags?.[0],
    attributes.packagingType,
  ].filter(Boolean);

  return {
    id: product.id,
    productId: product.id,
    sellerId: product.seller_id,
    name: product.title || 'FoodHub item',
    cuisine:
      product.food_subcategory || product.category || (activeTab === 'drinks' ? 'Drinks' : 'Food'),
    rating: 4.5,
    reviews: 0,
    deliveryTime: product.prep_time_minutes ? `${product.prep_time_minutes} min` : '20-30 min',
    deliveryFee: 'Free',
    minOrder:
      product.min_order_quantity && product.min_order_quantity > 1 ? product.min_order_quantity : 0,
    image: image || 'https://picsum.photos/400/300?random=' + product.id,
    tags,
    type: activeTab,
    category: product.category,
    foodSubcategory: product.food_subcategory,
    price: Number(product.price || 0),
    currency: product.seller_currency || 'GHS',
    sellerName: product.seller_name || product.seller_business_name || product.seller_display_name,
    city: product.seller_city,
    region: product.seller_region,
  };
};

export async function fetchSellers(activeTab) {
  try {
    const foodHubType = activeTab === 'drinks' ? 'drinks' : 'food';
    const response = await authenticatedFetch(
      `/api/listings/products?productType=food_beverage&foodHubType=${foodHubType}`
    );

    if (response.ok) {
      const data = await response.json();
      return (data.products || []).map((product) => mapProductToFoodHubCard(product, activeTab));
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch FoodHub products:', error);
    return [];
  }
}

export function filterNearbyRestaurants(
  sellers,
  selectedCategory,
  userCity,
  userRegion,
  userLocation,
  _activeTab
) {
  const matchesSelectedCategory = (seller) => {
    if (selectedCategory === 'all' || selectedCategory === 'local') {
      return true;
    }
    const chosen = selectedCategory.toLowerCase();
    return (
      String(seller.foodSubcategory || '').toLowerCase() === chosen ||
      String(seller.category || '').toLowerCase() === chosen ||
      String(seller.cuisine || '').toLowerCase() === chosen
    );
  };

  const categoryFilteredSellers = sellers.filter(matchesSelectedCategory);

  if (selectedCategory === 'local') {
    if (!userCity) {
      return [];
    }

    const localSellers = categoryFilteredSellers.filter((seller) => {
      if (seller.delivery_zones && Array.isArray(seller.delivery_zones)) {
        return seller.delivery_zones.some((zone) => {
          const zoneCity = zone.city_name || zone.cityName;
          const zoneRegion = zone.region_name || zone.regionName;

          if (zoneCity && userCity) {
            return (
              zoneCity.toLowerCase().includes(userCity.toLowerCase()) ||
              userCity.toLowerCase().includes(zoneCity.toLowerCase())
            );
          }
          if (zoneRegion && userRegion) {
            return zoneRegion.toLowerCase().includes(userRegion.toLowerCase());
          }
          return false;
        });
      }

      const sellerCity = seller.city;
      const sellerRegion = seller.region;

      if (sellerCity && userCity) {
        return (
          sellerCity.toLowerCase().includes(userCity.toLowerCase()) ||
          userCity.toLowerCase().includes(sellerCity.toLowerCase())
        );
      }
      if (sellerRegion && userRegion) {
        return sellerRegion.toLowerCase().includes(userRegion.toLowerCase());
      }

      return false;
    });

    return localSellers;
  }

  if (!userLocation) {
    return categoryFilteredSellers;
  }

  const withDist = categoryFilteredSellers.map((s) => ({
    ...s,
    latitude: userLocation.latitude + (Math.random() - 0.5) * 0.05,
    longitude: userLocation.longitude + (Math.random() - 0.5) * 0.05,
  }));

  const nearby = withDist
    .map((r) => ({
      ...r,
      distance: calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        r.latitude,
        r.longitude
      ),
    }))
    .filter((r) => r.distance <= 10)
    .sort((a, b) => a.distance - b.distance);

  return nearby;
}
