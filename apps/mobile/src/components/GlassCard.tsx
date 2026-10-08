// @ts-nocheck
import { View } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../utils/theme";

export default function GlassCard({ children, style, intensity = 60 }) {
  const colors = useTheme();

  return (
    <View
      style={[
        {
          overflow: "hidden",
          borderRadius: 20,
        },
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={colors.glass.tint}
        style={{
          borderWidth: 1,
          borderColor: colors.glass.border,
          padding: 20,
        }}
      >
        {children}
      </BlurView>
    </View>
  );
}
