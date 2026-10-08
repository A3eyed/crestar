// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '@/utils/authenticatedFetch';

export function useProfileData(isAuthenticated, userId) {
  const [isSeller, setIsSeller] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isDeliverer, setIsDeliverer] = useState(false);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const fetchSellerProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      // This endpoint is public (fetching by sellerId)
      const res = await fetch(`/api/listings/products?sellerId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSellerProducts(data.products || []);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, [userId]);

  const checkSellerStatus = useCallback(async () => {
    try {
      // Use authenticatedFetch for the business-centers API
      const res = await authenticatedFetch('/api/business-centers');
      if (res.ok) {
        const data = await res.json();

        if (data.has_center && data.center?.verification_status === 'approved') {
          const centerType = data.center.center_type;

          // Set flags based on center type
          setIsSeller(centerType === 'seller' || centerType === 'foodhub');
          setIsCreator(centerType === 'creator');
          setIsDeliverer(centerType === 'deliverer');

          // Fetch products if seller or foodhub
          if (centerType === 'seller' || centerType === 'foodhub') {
            fetchSellerProducts();
          }
        } else {
          // No business center yet
          setIsSeller(false);
          setIsCreator(false);
          setIsDeliverer(false);
        }
      } else {
        // API error - fall back to safe defaults
        setIsSeller(false);
        setIsCreator(false);
        setIsDeliverer(false);
      }
    } catch (err) {
      console.error('Check business center status error:', err);
      setIsSeller(false);
      setIsCreator(false);
      setIsDeliverer(false);
    }
  }, [fetchSellerProducts]);

  useEffect(() => {
    if (isAuthenticated && userId) {
      checkSellerStatus();
    }
  }, [isAuthenticated, userId, checkSellerStatus]);

  return {
    isSeller,
    isCreator,
    isDeliverer,
    sellerProducts,
    loadingProducts,
    // Re-check status + products (e.g. when profile tab regains focus
    // after the seller lists a new product)
    refetch: checkSellerStatus,
  };
}
