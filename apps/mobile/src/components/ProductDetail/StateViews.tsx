// @ts-nocheck
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft } from "lucide-react-native";

export function LoadingState({ colors, insets, onBack }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <StatusBar style={colors.statusBar} />
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

export function ErrorState({ colors, insets, onBack }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />
      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 16,
          zIndex: 10,
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 40,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Product Not Found
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            textAlign: "center",
          }}
        >
          This product may have been removed or is no longer available
        </Text>
      </View>
    </View>
  );
}
