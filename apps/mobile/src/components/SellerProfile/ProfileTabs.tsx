// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import {
  Grid3X3,
  ShoppingBag,
  TrendingUp,
  Heart,
  Bookmark,
  Info,
  UtensilsCrossed,
} from "lucide-react-native";
import { useTheme } from "@/utils/theme";

const iconMap = {
  posts: Grid3X3,
  shop: ShoppingBag,
  showcase: ShoppingBag,
  likes: Heart,
  saved: Bookmark,
  about: Info,
};

export function ProfileTabs({ tabs, selectedTab, onTabChange }) {
  const colors = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom: 2,
      }}
    >
      {tabs.map((tab) => {
        // Dynamic icon for shop/showcase tab based on seller type
        let Icon = iconMap[tab.id];
        if (
          (tab.id === "shop" || tab.id === "showcase") &&
          tab.sellerType === "food_beverage"
        ) {
          Icon = UtensilsCrossed;
        }

        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              paddingVertical: 14,
              alignItems: "center",
              justifyContent: "center",
              borderBottomWidth: 2,
              borderBottomColor:
                selectedTab === tab.id ? colors.text : "transparent",
            }}
          >
            <Icon
              size={20}
              color={selectedTab === tab.id ? colors.text : colors.textTertiary}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
