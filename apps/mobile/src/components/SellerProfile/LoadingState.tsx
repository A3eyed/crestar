// @ts-nocheck
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";

export function LoadingState() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000000",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <StatusBar style="light" />
      <ActivityIndicator
        color="#D4AF37"
        size="large"
        testID="activity-indicator"
      />
    </View>
  );
}
