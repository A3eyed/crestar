// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import * as Notifications from "expo-notifications";

export function useCreatorEarnings(userId, isAuthenticated, notifPermission) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earningsData, setEarningsData] = useState(null);
  const previousOrderCount = useRef(-1);

  const fetchData = async () => {
    try {
      const res = await authenticatedFetch("/api/creator/earnings");
      if (res.ok) {
        const data = await res.json();
        const newOrders = data.attributedOrders || [];

        // Fire local notification if new sales appeared since last fetch
        if (
          previousOrderCount.current >= 0 &&
          newOrders.length > previousOrderCount.current &&
          notifPermission
        ) {
          const newCount = newOrders.length - previousOrderCount.current;
          const latestOrder = newOrders[0];
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "🎉 New Sale Commission!",
              body:
                newCount === 1 && latestOrder
                  ? `Someone bought "${latestOrder.itemTitle}" through your video! +${latestOrder.commission?.toFixed(2)} earned.`
                  : `${newCount} new sales through your videos! Check your dashboard.`,
              sound: true,
              data: { screen: "affiliate/dashboard" },
            },
            trigger: null, // Fire immediately
          });
        }
        previousOrderCount.current = newOrders.length;

        setEarningsData(data);
      }
    } catch (err) {
      console.error("Creator earnings fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchData();
    }
  }, [isAuthenticated, userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return {
    loading,
    refreshing,
    earningsData,
    onRefresh,
  };
}
