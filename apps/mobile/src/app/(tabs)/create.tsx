// @ts-nocheck
import { useCallback } from "react";
import { View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useNavigation } from "expo-router";
import { VideoPreviewScreen } from "@/components/CreateScreen/VideoPreviewScreen";
import { CameraPermissionScreen } from "@/components/CreateScreen/CameraPermissionScreen";
import { CameraView } from "@/components/CreateScreen/CameraView";
import { useCreateScreen } from "@/utils/useCreateScreen";
import { usePendingDraft } from "@/utils/draftsStore";

export default function CreateScreen() {
  const navigation = useNavigation();
  const {
    cameraRef,
    permission,
    requestPermission,
    facing,
    flash,
    isRecording,
    recordedVideo,
    recordingDuration,
    handleClose,
    toggleCameraFacing,
    handleRecordPress,
    handleGalleryPick,
    handleDiscard,
    handlePost,
    router,
  } = useCreateScreen();
  const { pendingDraft, clearPendingDraft } = usePendingDraft();

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ tabBarStyle: { display: "none" } });
      return () => navigation.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );

  if (pendingDraft) {
    return (
      <VideoPreviewScreen
        videoUri={pendingDraft.videoUri}
        draft={pendingDraft}
        onDiscard={() => {
          clearPendingDraft();
          router.back();
        }}
        onPost={() => {
          const uri = pendingDraft.videoUri;
          clearPendingDraft();
          handlePost(uri);
        }}
      />
    );
  }

  if (recordedVideo) {
    return (
      <VideoPreviewScreen
        videoUri={recordedVideo}
        onDiscard={handleDiscard}
        onPost={() => handlePost(recordedVideo)}
      />
    );
  }

  if (!permission) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StatusBar style="light" />
        <Text style={{ color: "#fff" }}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <CameraPermissionScreen
        onRequestPermission={requestPermission}
        onClose={handleClose}
        canAskAgain={permission.canAskAgain !== false}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" />
      <CameraView
        cameraRef={cameraRef}
        facing={facing}
        flash={flash}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        onClose={handleClose}
        onGalleryPick={handleGalleryPick}
        onRecordPress={handleRecordPress}
        onToggleFacing={toggleCameraFacing}
      />
    </View>
  );
}