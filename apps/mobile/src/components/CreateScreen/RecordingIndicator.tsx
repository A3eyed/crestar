// @ts-nocheck
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function RecordingIndicator({ duration = 0 }) {
  const insets = useSafeAreaInsets();

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Change color based on duration
  const getBackgroundColor = () => {
    if (duration >= 55) return "#DC2626"; // Red - very close to max
    if (duration >= 50) return "#F97316"; // Orange - approaching max
    return "#DC2626"; // Red - normal recording
  };

  const backgroundColor = getBackgroundColor();

  return (
    <View
      style={{
        position: "absolute",
        top: insets.top + 70,
        alignSelf: "center",
        backgroundColor,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: "#FFFFFF",
        }}
      />
      <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
        REC {formatDuration(duration)}
      </Text>
    </View>
  );
}
