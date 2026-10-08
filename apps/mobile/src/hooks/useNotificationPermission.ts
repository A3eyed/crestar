// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Orders & alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D4AF37",
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;

  const tokenResult = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return tokenResult.data;
}

export function useNotificationPermission() {
  const [notifPermission, setNotifPermission] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState(null);

  const requestNotifPermission = useCallback(async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      setNotifPermission(!!token);
      setExpoPushToken(token);

      if (token) {
        await authenticatedFetch("/api/notifications/register-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            platform: Platform.OS,
          }),
        });
      }
      return token;
    } catch (e) {
      console.error("Push registration failed:", e);
      setNotifPermission(false);
      return null;
    }
  }, []);

  useEffect(() => {
    requestNotifPermission();
  }, [requestNotifPermission]);

  return {
    notifPermission,
    expoPushToken,
    requestNotifPermission,
  };
}