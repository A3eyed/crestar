import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

const VISITOR_ID_KEY = "anything_analytics_visitor_id";

function isActive() {
  return !__DEV__ && process.env.EXPO_PUBLIC_CREATE_ENV !== "DEVELOPMENT";
}

function generateVisitorId() {
  const rand = () => Math.random().toString(36).slice(2);
  return `${rand()}${rand()}`.slice(0, 32);
}

let visitorIdPromise = null;

function getVisitorId() {
  if (!visitorIdPromise) {
    visitorIdPromise = (async () => {
      try {
        const existing = await AsyncStorage.getItem(VISITOR_ID_KEY);
        if (existing) return existing;
        const created = generateVisitorId();
        await AsyncStorage.setItem(VISITOR_ID_KEY, created);
        return created;
      } catch (e) {
        return generateVisitorId();
      }
    })();
  }
  return visitorIdPromise;
}

export function ScreenViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isActive()) return;
    const endpoint = process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT;
    const host = process.env.EXPO_PUBLIC_HOST;
    const projectGroupId = process.env.EXPO_PUBLIC_PROJECT_GROUP_ID;
    if (!endpoint || !host || !projectGroupId || !pathname) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    let cancelled = false;

    void (async () => {
      try {
        const visitorId = await getVisitorId();
        if (cancelled) return;
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            d: host,
            p: pathname,
            pgid: projectGroupId,
            vid: visitorId,
            os: Platform.OS,
            dt: Platform.OS === "web" ? "web" : "mobile",
          }),
        });
      } catch (e) {
        // Analytics must never crash the app.
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [pathname]);

  return null;
}