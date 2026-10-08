// @ts-nocheck
import { Tabs } from "expo-router";
import { Home, ShoppingBag, Plus, Truck, User } from "lucide-react-native";
import { View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import useLocalization from "../../utils/localization";
import { useTheme } from "../../utils/theme";

const BRAND = "#D4AF37";

export default function TabLayout() {
  const { t } = useLocalization();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colors.statusBar === "light";
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 8 : 10);
  const label = (key, fallback) => {
    const value = t(key);
    return !value || value === key ? fallback : value;
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          height: 64 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
          overflow: "visible",
          backgroundColor: isDark ? "transparent" : colors.tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          elevation: 0,
        },
        tabBarBackground: isDark
          ? () => (
              <BlurView
                intensity={100}
                tint="dark"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderTopWidth: 1,
                  borderTopColor: colors.tabBarBorder,
                }}
              />
            )
          : undefined,
        tabBarActiveTintColor: colors.tabBarActive || BRAND,
        tabBarInactiveTintColor: colors.tabBarInactive || "#9CA3AF",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: label("home", "Home"),
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: label("shop", "Shop"),
          tabBarIcon: ({ color }) => <ShoppingBag color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarStyle: { display: "none" },
          tabBarIcon: () => (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                marginTop: -18,
                backgroundColor: BRAND,
                borderWidth: 3,
                borderColor: colors.background,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus color="#000000" size={28} strokeWidth={3} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="foodhub"
        options={{
          title: label("foodhub", "FoodHub"),
          tabBarIcon: ({ color }) => <Truck color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: label("profile", "Profile"),
          tabBarIcon: ({ color }) => <User color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}