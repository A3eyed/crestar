// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";

export function ErrorState({ onGoBack }) {
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
      <Text style={{ color: "#FFFFFF", fontSize: 16 }}>User not found</Text>
      <TouchableOpacity
        onPress={onGoBack}
        style={{
          marginTop: 16,
          paddingVertical: 10,
          paddingHorizontal: 20,
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 14 }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}
