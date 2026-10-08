// @ts-nocheck
import { View, Text } from "react-native";

export function StatCard({ icon: Icon, label, value, color, colors }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        gap: 6,
      }}
    >
      <Icon size={20} color={color} />
      <Text
        style={{
          color: colors.text,
          fontSize: 15,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 11,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
