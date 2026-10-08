// @ts-nocheck
import { View, Text } from "react-native";

export function StepIndicator({
  icon: Icon,
  title,
  description,
  color,
  colors,
}) {
  return (
    <View
      style={{
        backgroundColor: color + "15",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: color + "30",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <Icon size={18} color={color} />
        <Text
          style={{
            color: colors.text,
            fontSize: 15,
            fontWeight: "600",
          }}
        >
          {title}
        </Text>
      </View>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 13,
          lineHeight: 18,
        }}
      >
        {description}
      </Text>
    </View>
  );
}
