// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import useAuth from "@/utils/auth/useAuth";
import { Alert } from "react-native";

const MIN_VIDEO_DURATION = 30; // 30 seconds minimum
const MAX_VIDEO_DURATION = 60; // 60 seconds maximum

export function useCreateScreen() {
  const router = useRouter();
  const { isAuthenticated, signIn } = useAuth();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [hasMonetization, setHasMonetization] = useState(false);
  const [facing, setFacing] = useState("back");
  const [flash, setFlash] = useState("off");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Check user's monetization status
  useEffect(() => {
    const fetchMonetizationStatus = async () => {
      if (!isAuthenticated) {
        setHasMonetization(false);
        return;
      }

      try {
        const response = await fetch("/api/monetization/status");
        if (response.ok) {
          const data = await response.json();
          // Only sellers and creators can go live - not deliverers
          const isSeller =
            data.seller && data.seller.verification_status === "approved";
          const isCreator =
            data.affiliate && data.affiliate.verification_status === "approved";
          setHasMonetization(isSeller || isCreator);
        }
      } catch (error) {
        console.error("Failed to fetch monetization status:", error);
        setHasMonetization(false);
      }
    };

    fetchMonetizationStatus();
  }, [isAuthenticated]);

  // Clear recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const handleStartVideo = () => {
    setShowCreateOptions(false);
  };

  const handleGoLive = () => {
    router.push("/live/host");
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const toggleFlash = () => {
    setFlash((current) => (current === "off" ? "on" : "off"));
  };

  const handleRecordPress = async () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }

    if (!cameraRef.current) return;

    if (isRecording) {
      // Stop recording manually
      const duration = recordingDuration;

      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      setIsRecording(false);
      cameraRef.current.stopRecording();

      // Check minimum duration
      if (duration < MIN_VIDEO_DURATION) {
        Alert.alert(
          "Video Too Short",
          `Videos must be at least ${MIN_VIDEO_DURATION} seconds. Please record a longer video.`,
          [{ text: "OK" }],
        );
        setRecordingDuration(0);
        // Don't set recorded video - let them try again
        return;
      }
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingDuration(0);
      recordingStartTimeRef.current = Date.now();

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - recordingStartTimeRef.current) / 1000,
        );
        setRecordingDuration(elapsed);

        // Auto-stop at max duration
        if (elapsed >= MAX_VIDEO_DURATION) {
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
          setIsRecording(false);
          if (cameraRef.current) {
            cameraRef.current.stopRecording();
          }
        }
      }, 1000);

      try {
        const video = await cameraRef.current.recordAsync({
          maxDuration: MAX_VIDEO_DURATION,
        });

        // Clear timer after recording completes
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        const finalDuration =
          recordingDuration ||
          Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);

        // Only set video if it meets minimum duration
        if (finalDuration >= MIN_VIDEO_DURATION) {
          setRecordedVideo(video.uri);
          console.log(
            "Video recorded to:",
            video.uri,
            `Duration: ${finalDuration}s`,
          );
        }

        setRecordingDuration(0);
      } catch (e) {
        console.error("Recording failed:", e);
        setIsRecording(false);
        setRecordingDuration(0);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      }
    }
  };

  const handleGalleryPick = async () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
      quality: 1,
      videoMaxDuration: MAX_VIDEO_DURATION,
    });

    if (!result.canceled && result.assets[0]) {
      // Note: We can't easily check duration from gallery picker
      // Will be validated during upload if needed
      setRecordedVideo(result.assets[0].uri);
    }
  };

  const handleDiscard = () => {
    setRecordedVideo(null);
    setRecordingDuration(0);
  };

  const handleClose = () => {
    // Clear any ongoing recording
    if (isRecording) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
    }
    router.navigate("/(tabs)/feed");
  };

  const handlePost = () => {
    setRecordedVideo(null);
    setRecordingDuration(0);
    router.back();
  };

  return {
    cameraRef,
    permission,
    requestPermission,
    showCreateOptions,
    hasMonetization,
    facing,
    flash,
    isRecording,
    recordedVideo,
    recordingDuration,
    handleStartVideo,
    handleGoLive,
    handleClose,
    toggleCameraFacing,
    toggleFlash,
    handleRecordPress,
    handleGalleryPick,
    handleDiscard,
    handlePost,
    router,
  };
}
