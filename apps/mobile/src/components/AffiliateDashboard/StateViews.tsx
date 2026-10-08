// @ts-nocheck
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";

export function AuthPrompt({ colors, onSignIn }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <StatusBar style={colors.statusBar} />
      <TouchableOpacity
        onPress={onSignIn}
        style={{
          backgroundColor: colors.text,
          paddingHorizontal: 32,
          paddingVertical: 14,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            color: colors.background,
            fontSize: 16,
            fontWeight: "700",
          }}
        >
          Sign In
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function LoadingState({ colors }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <StatusBar style={colors.statusBar} />
      <ActivityIndicator size="large" color={colors.text} />
      <Text
        style={{ color: colors.textSecondary, fontSize: 16, marginTop: 12 }}
      >
        Loading your earnings...
      </Text>
    </View>
  );
}
