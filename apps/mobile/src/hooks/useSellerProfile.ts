// @ts-nocheck
import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/authenticatedFetch';

export function useSellerProfile(profileUserId) {
  const [profile, setProfile] = useState(null);
  const [monetization, setMonetization] = useState(null);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  // Where the shop is and how they hand orders over — shown on the shop front
  const [storeLocation, setStoreLocation] = useState(null);
  const [fulfillmentSettings, setFulfillmentSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (profileUserId) {
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUserId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      const profileResponse = await authenticatedFetch(`/api/sellers/${profileUserId}?_t=${ts}`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData.profile);
        setProducts(profileData.products || []);
        setServices(profileData.services || []);
      } else {
        console.error(
          `When fetching /api/sellers/${profileUserId}, the response was [${profileResponse.status}] ${profileResponse.statusText}`
        );
      }

      const monetizationResponse = await authenticatedFetch(
        `/api/user/${profileUserId}/monetization?_t=${ts}`
      );
      if (monetizationResponse.ok) {
        const monetizationData = await monetizationResponse.json();
        setMonetization(monetizationData);
      } else {
        setMonetization({ hasAnyMonetization: false });
      }

      // Store location + the ways this seller delivers. These are nice-to-have,
      // so a failure here should never blank out the whole shop.
      const [locationResult, settingsResult] = await Promise.allSettled([
        authenticatedFetch(`/api/sellers/store-location?sellerId=${profileUserId}`),
        authenticatedFetch(`/api/sellers/fulfillment-settings?sellerId=${profileUserId}`),
      ]);

      if (locationResult.status === 'fulfilled' && locationResult.value.ok) {
        const locationData = await locationResult.value.json();
        setStoreLocation(locationData.location || null);
      }

      if (settingsResult.status === 'fulfilled' && settingsResult.value.ok) {
        const settingsData = await settingsResult.value.json();
        setFulfillmentSettings(settingsData.settings || null);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setMonetization({ hasAnyMonetization: false });
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  return {
    profile,
    monetization,
    products,
    services,
    storeLocation,
    fulfillmentSettings,
    loading,
    isFollowing,
    toggleFollow,
    refetch: fetchUserData,
  };
}

export default useSellerProfile;
