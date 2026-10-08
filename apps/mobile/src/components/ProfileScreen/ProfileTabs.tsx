// @ts-nocheck
import { View, TouchableOpacity } from "react-native";

export function ProfileTabs({ tabs, selectedTab, onTabChange, colors }) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
      }}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: "center",
            borderBottomWidth: 2,
            borderBottomColor:
              selectedTab === tab.id ? colors.text : "transparent",
          }}
        >
          <tab.icon
            size={22}
            color={selectedTab === tab.id ? colors.text : colors.iconSecondary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}
