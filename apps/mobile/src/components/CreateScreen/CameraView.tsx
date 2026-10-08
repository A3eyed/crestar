// @ts-nocheck
import { View, Text, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView as ExpoCameraView } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, SwitchCamera, ImagePlus } from "lucide-react-native";

export function CameraView({
  cameraRef,
  facing,
  flash,
  isRecording,
  recordingDuration,
  onClose,
  onGalleryPick,
  onRecordPress,
  onToggleFacing,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" />
      <ExpoCameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        flash={flash}
        mode="video"
      />

      <Pressable
        onPress={onClose}
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 20,
          zIndex: 30,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(0,0,0,0.45)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={24} color="#FFFFFF" />
      </Pressable>

      <Pressable
        onPress={onToggleFacing}
        style={{
          position: "absolute",
          top: insets.top + 12,
          right: 20,
          zIndex: 30,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(0,0,0,0.45)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SwitchCamera size={22} color="#FFFFFF" />
      </Pressable>

      {isRecording && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 18,
            alignSelf: "center",
            zIndex: 30,
            backgroundColor: "rgba(0,0,0,0.55)",
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
            {recordingDuration || 0}s
          </Text>
        </View>
      )}

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: Math.max(insets.bottom, 16) + 24,
          zIndex: 30,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-evenly",
        }}
      >
        <Pressable
          onPress={onGalleryPick}
          style={{
            width: 52,
            height: 52,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: "#FFFFFF",
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ImagePlus size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable
          onPress={onRecordPress}
          style={{
            width: 78,
            height: 78,
            borderRadius: 39,
            borderWidth: 4,
            borderColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: isRecording ? 28 : 62,
              height: isRecording ? 28 : 62,
              borderRadius: isRecording ? 6 : 31,
              backgroundColor: "#FF2D55",
            }}
          />
        </Pressable>
        <View style={{ width: 52 }} />
      </View>
    </View>
  );
}