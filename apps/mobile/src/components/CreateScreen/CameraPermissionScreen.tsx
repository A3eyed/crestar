// @ts-nocheck
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";

export function CameraPermissionScreen({
  onRequestPermission,
  onClose,
  canAskAgain = true,
}) {
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    if (canAskAgain) onRequestPermission();
    else Linking.openSettings().catch(() => {});
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <StatusBar style="light" />
      <TouchableOpacity
        onPress={onClose}
        style={{
          position: "absolute",
          top: insets.top + 16,
          left: 16,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(255,255,255,0.1)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <X size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        Camera and microphone
      </Text>
      <Text
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: 15,
          marginBottom: 32,
          textAlign: "center",
          lineHeight: 22,
        }}
      >
        Crestar needs the camera to record and the microphone so the video has
        sound.
      </Text>
      <TouchableOpacity
        onPress={handlePress}
        style={{
          backgroundColor: "#D4AF37",
          borderRadius: 12,
          paddingHorizontal: 24,
          paddingVertical: 14,
        }}
      >
        <Text style={{ color: "#000000", fontSize: 16, fontWeight: "700" }}>
          {canAskAgain ? "Allow access" : "Open Settings"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}