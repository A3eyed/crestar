// @ts-nocheck
import { useAuth } from "@/utils/auth/useAuth";
import { AuthModal } from "@/utils/auth/useAuthModal";
import { ErrorBoundary } from "@/__create/ErrorBoundary";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import useStore from "../utils/store";
import { useTheme } from "../utils/theme";
import useLocalization from "../utils/localization";
import useCartStore from "../utils/cartStore";
import useBootStore from "../utils/bootStore";
import CurrencyRateRefresher from "@/components/CurrencyRateRefresher";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions?.({ duration: 180, fade: true });

const BOOT_TIMEOUT_MS = 2500;
const SPLASH_TIMEOUT_MS = 1500;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { initiate, isReady } = useAuth();
  const { loadPersistedState } = useStore();
  const colors = useTheme();
  const { loadSettings, isLoaded } = useLocalization();
  const { loadCart } = useCartStore();
  const feedReady = useBootStore((state) => state.feedReady);
  const pathname = usePathname();
  const [appReady, setAppReady] = useState(false);
  const [bootTimedOut, setBootTimedOut] = useState(false);
  const [splashTimedOut, setSplashTimedOut] = useState(false);
  const hasInitiated = useRef(false);
  const splashHidden = useRef(false);
  const { requestNotifPermission } = useNotificationPermission();

  useEffect(() => {
    const bootTimer = setTimeout(() => setBootTimedOut(true), BOOT_TIMEOUT_MS);
    const splashTimer = setTimeout(
      () => setSplashTimedOut(true),
      SPLASH_TIMEOUT_MS
    );
    return () => {
      clearTimeout(bootTimer);
      clearTimeout(splashTimer);
    };
  }, []);

  useEffect(() => {
    if (hasInitiated.current) return;
    hasInitiated.current = true;
    Promise.all(
      [initiate, loadPersistedState, loadSettings, loadCart].map(
        async (step) => {
          try {
            await step?.();
          } catch (error) {
            console.error("Initialization step failed:", error);
          }
        }
      )
    ).finally(() => setAppReady(true));
  }, [initiate, loadPersistedState, loadSettings, loadCart]);

  useEffect(() => {
    if (!isReady) return;
    requestNotifPermission();
  }, [isReady, requestNotifPermission]);

  const storesBooted = (isReady && isLoaded && appReady) || bootTimedOut;
  const landingOnFeed =
    pathname === "/" || pathname === "/feed" || pathname === "/(tabs)";
  const canReveal =
    (storesBooted && (feedReady || !landingOnFeed)) || splashTimedOut;

  useEffect(() => {
    if (!canReveal || splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, [canReveal]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView
          style={{ flex: 1, backgroundColor: colors.background }}
        >
          <CurrencyRateRefresher />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
            initialRouteName="index"
          >
            <Stack.Screen name="index" options={{ animation: "none" }} />
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false, animation: "none" }}
            />
            <Stack.Screen name="checkout" />
            <Stack.Screen name="cart" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="support-chat" />
            <Stack.Screen name="delivery-zones" />
            <Stack.Screen name="browse-sellers" />
            <Stack.Screen name="deliverer-requests" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="wallet" />
            <Stack.Screen name="inbox" />
            <Stack.Screen name="monetization-center" />
            <Stack.Screen name="create-listing" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="order-details" />
            <Stack.Screen name="order-history" />
            <Stack.Screen name="drafts" />
            <Stack.Screen name="product/[id]" />
            <Stack.Screen name="food/[id]" />
            <Stack.Screen name="seller/[id]" />
            <Stack.Screen name="seller/dashboard" />
            <Stack.Screen name="deliverer/dashboard" />
            <Stack.Screen name="affiliate/dashboard" />
            <Stack.Screen name="admin/dashboard" />
            <Stack.Screen name="edit-product/[id]" />
            <Stack.Screen name="settings/language" />
            <Stack.Screen
              name="live/host"
              options={{
                presentation: "fullScreenModal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="live/watch"
              options={{
                presentation: "fullScreenModal",
                animation: "slide_from_bottom",
              }}
            />
          </Stack>
          <AuthModal />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}