// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { DollarSign, BarChart3, History } from "lucide-react-native";

const TAB_ICONS = {
  earnings: DollarSign,
  commissions: BarChart3,
  history: History,
};

export function DashboardTabs({ tabs, selectedTab, onTabChange, colors }) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 16,
      }}
    >
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab.id];
        const isActive = selectedTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              paddingVertical: 13,
              borderBottomWidth: 2,
              borderColor: isActive ? "#D4AF37" : "transparent",
            }}
          >
            <Icon
              size={16}
              color={isActive ? "#D4AF37" : colors.textTertiary}
            />
            <Text
              style={{
                color: isActive ? "#D4AF37" : colors.textTertiary,
                fontSize: 13,
                fontWeight: isActive ? "700" : "500",
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
