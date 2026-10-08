// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { Search } from "lucide-react-native";

export default function FoodHubHeader({
  colors,
  activeTab,
  onTabChange,
  onSearchPress,
}) {
  return (
    <View>
      {/* Title */}
      <Text
        style={{
          color: colors.text,
          fontSize: 28,
          fontWeight: "800",
          marginBottom: 14,
        }}
      >
        FoodHub
      </Text>

      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          marginBottom: 14,
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          padding: 4,
        }}
      >
        <TouchableOpacity
          onPress={() => onTabChange("food")}
          style={{
            flex: 1,
            paddingVertical: 11,
            borderRadius: 10,
            backgroundColor: activeTab === "food" ? colors.text : "transparent",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color:
                activeTab === "food" ? colors.background : colors.textSecondary,
              fontSize: 15,
              fontWeight: activeTab === "food" ? "700" : "500",
            }}
          >
            🍔 Food
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onTabChange("drinks")}
          style={{
            flex: 1,
            paddingVertical: 11,
            borderRadius: 10,
            backgroundColor:
              activeTab === "drinks" ? colors.text : "transparent",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color:
                activeTab === "drinks"
                  ? colors.background
                  : colors.textSecondary,
              fontSize: 15,
              fontWeight: activeTab === "drinks" ? "700" : "500",
            }}
          >
            🥤 Drinks
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <TouchableOpacity
        onPress={onSearchPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 11,
          marginBottom: 12,
        }}
      >
        <Search size={18} color={colors.iconSecondary} />
        <Text
          style={{
            flex: 1,
            marginLeft: 10,
            color: colors.inputPlaceholder,
            fontSize: 15,
          }}
        >
          Search {activeTab === "food" ? "food & restaurants" : "drinks"}...
        </Text>
      </TouchableOpacity>
    </View>
  );
}
