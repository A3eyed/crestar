// @ts-nocheck
import { useState, useEffect } from "react";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

export function useBusinessCenter() {
  const [businessCenter, setBusinessCenter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinessCenter();
  }, []);

  const fetchBusinessCenter = async () => {
    try {
      const response = await authenticatedFetch("/api/business-centers");
      if (response.ok) {
        const data = await response.json();

        if (data.has_center && data.center) {
          const center = data.center;

          if (
            (center.center_type === "seller" ||
              center.center_type === "foodhub") &&
            center.verification_status === "approved"
          ) {
            setBusinessCenter(center);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch business center:", error);
    } finally {
      setLoading(false);
    }
  };

  return { businessCenter, loading };
}
