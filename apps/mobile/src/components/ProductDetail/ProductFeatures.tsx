// @ts-nocheck
import { View, Text } from "react-native";

export function ProductFeatures({ features, colors }) {
  if (!features || features.length === 0) return null;

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 16,
        }}
      >
        Features
      </Text>
      {features.map((feature, index) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: "#D4AF37",
            }}
          />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              flex: 1,
            }}
          >
            {feature}
          </Text>
        </View>
      ))}
    </View>
  );
}
