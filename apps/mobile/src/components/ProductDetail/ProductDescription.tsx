// @ts-nocheck
import { View, Text } from "react-native";
import { BlurView } from "expo-blur";

export function ProductDescription({ description, colors }) {
  return (
    <View
      style={{
        marginBottom: 24,
        padding: 20,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <BlurView
        intensity={60}
        tint={colors.glass.tint}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          Description
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            lineHeight: 24,
          }}
        >
          {description}
        </Text>
      </BlurView>
    </View>
  );
}
