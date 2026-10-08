// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authenticatedFetch } from '../utils/authenticatedFetch';

/**
 * Loads every way each seller in the cart can get the order to the buyer —
 * store pickup, the seller's own town fees, and Delivery Center riders — and
 * keeps track of which one the buyer picked so checkout can add it to the total.
 */
export default function useFulfillmentOptions(items = [], buyerLocation) {
  const [optionsBySeller, setOptionsBySeller] = useState({});
  const [selectionBySeller, setSelectionBySeller] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sellers the buyer has manually chosen for — never auto-override those
  const touchedRef = useRef({});

  const sellerIds = useMemo(() => {
    const ids = items
      .map((item) => item?.sellerId || item?.seller || item?.seller_id)
      .filter(Boolean)
      .map(String);
    return [...new Set(ids)];
  }, [items]);

  const sellerKey = sellerIds.join('|');
  const locationKey = `${buyerLocation?.country || ''}|${buyerLocation?.region || ''}|${
    buyerLocation?.city || ''
  }|${buyerLocation?.latitude || ''}|${buyerLocation?.longitude || ''}`;

  const load = useCallback(async () => {
    if (sellerIds.length === 0) {
      setOptionsBySeller({});
      setSelectionBySeller({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        sellerIds.map(async (sellerId) => {
          try {
            const response = await authenticatedFetch('/api/fulfillment/options', {
              method: 'POST',
              body: JSON.stringify({ sellerId, buyerLocation }),
            });
            if (!response.ok) {
              throw new Error(
                `When loading delivery options the response was [${response.status}] ${response.statusText}`
              );
            }
            const data = await response.json();
            return [sellerId, data];
          } catch (err) {
            console.error('Failed to load delivery options for seller', sellerId, err);
            return [sellerId, { sellerId, options: [], failed: true }];
          }
        })
      );

      const next = {};
      for (const [sellerId, data] of results) {
        next[sellerId] = data;
      }
      setOptionsBySeller(next);

      // Pre-select the recommended (or cheapest) option so the buyer only has
      // to change it if they want something different.
      setSelectionBySeller((prev) => {
        const updated = { ...prev };
        for (const sellerId of sellerIds) {
          const options = next[sellerId]?.options || [];
          const stillValid = options.some((o) => o.id === updated[sellerId]?.id);

          if (touchedRef.current[sellerId] && stillValid) continue;

          const preferred =
            options.find((o) => o.recommended) ||
            [...options].sort((a, b) => a.fee - b.fee)[0] ||
            null;
          updated[sellerId] = preferred;
        }
        // Drop sellers no longer in the cart
        for (const key of Object.keys(updated)) {
          if (!sellerIds.includes(key)) delete updated[key];
        }
        return updated;
      });

      if (results.every(([, data]) => data?.failed)) {
        setError('Could not load delivery options. Pull down to try again.');
      }
    } catch (err) {
      console.error('Fulfillment options failed:', err);
      setError('Could not load delivery options');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerKey, locationKey]);

  useEffect(() => {
    load();
  }, [load]);

  const selectOption = useCallback((sellerId, option) => {
    touchedRef.current[sellerId] = true;
    setSelectionBySeller((prev) => ({ ...prev, [sellerId]: option }));
  }, []);

  const deliveryTotal = useMemo(
    () => sellerIds.reduce((sum, id) => sum + (Number(selectionBySeller[id]?.fee) || 0), 0),
    [sellerIds, selectionBySeller]
  );

  /** Shape the existing checkout screen already understands. */
  const sellerDeliveryFees = useMemo(() => {
    const map = {};
    for (const id of sellerIds) {
      const picked = selectionBySeller[id];
      if (!picked) continue;
      map[id] = {
        fee: Number(picked.fee) || 0,
        isFree: Boolean(picked.isFree),
        label: picked.type === 'pickup' ? 'Store pickup' : picked.label,
        type: picked.type,
        zoneId: picked.zoneId || null,
        rateCardId: picked.rateCardId || null,
        delivererId: picked.delivererId || null,
      };
    }
    return map;
  }, [sellerIds, selectionBySeller]);

  const allSellersChosen = sellerIds.every((id) => Boolean(selectionBySeller[id]));

  const anySellerUnavailable = sellerIds.some(
    (id) => (optionsBySeller[id]?.options || []).length === 0
  );

  return {
    sellerIds,
    optionsBySeller,
    selectionBySeller,
    sellerDeliveryFees,
    deliveryTotal,
    allSellersChosen,
    anySellerUnavailable,
    loading,
    error,
    selectOption,
    refetch: load,
  };
}
