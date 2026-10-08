// @ts-nocheck
import { TouchableOpacity, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../utils/theme";

export default function GlassButton({
  onPress,
  title,
  icon,
  disabled = false,
  style,
  textStyle,
  variant = "primary",
}) {
  const colors = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          overflow: "hidden",
          borderRadius: 16,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      <BlurView
        intensity={variant === "primary" ? 80 : 40}
        tint={colors.glass.tint}
        style={{
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderWidth: 1,
          borderColor: colors.glass.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {icon}
        <Text
          style={[
            {
              color: colors.text,
              fontSize: 16,
              fontWeight: "600",
              letterSpacing: 0.5,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      </BlurView>
    </TouchableOpacity>
  );
}
