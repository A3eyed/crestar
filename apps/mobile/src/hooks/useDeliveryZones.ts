// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

export function useDeliveryZones(enabled = true) {
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDeliveryZones = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch("/api/sellers/delivery-zones");
      if (response.ok) {
        const data = await response.json();
        setDeliveryZones(data.zones || []);
      } else {
        setError("Failed to fetch delivery zones");
      }
    } catch (err) {
      console.error("Failed to fetch delivery zones:", err);
      setError(err.message || "Failed to fetch delivery zones");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const loadZones = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await authenticatedFetch(
          "/api/sellers/delivery-zones",
        );
        if (response.ok) {
          const data = await response.json();
          setDeliveryZones(data.zones || []);
        } else {
          setError("Failed to fetch delivery zones");
        }
      } catch (err) {
        console.error("Failed to fetch delivery zones:", err);
        setError(err.message || "Failed to fetch delivery zones");
      } finally {
        setLoading(false);
      }
    };

    loadZones();
  }, [enabled]);

  return { deliveryZones, loading, error, refetch: fetchDeliveryZones };
}
