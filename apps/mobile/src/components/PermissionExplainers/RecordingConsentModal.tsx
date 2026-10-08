// @ts-nocheck
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Video, Mic, X } from "lucide-react-native";
import { useTheme } from "../../utils/theme";

/**
 * Explicit consent for video/audio recording
 * Shows BEFORE recording starts (App Store Guideline 2.5.14)
 *
 * This is SEPARATE from camera permission — this is consent to RECORD.
 */
export default function RecordingConsentModal({
  visible,
  onConsent,
  onCancel,
}) {
  const colors = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: colors.background,
            borderRadius: 20,
            padding: 28,
            maxWidth: 400,
            width: "100%",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={onCancel}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 10,
            }}
          >
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Icons */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Video size={32} color="#EF4444" />
            </View>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mic size={32} color="#EF4444" />
            </View>
          </View>

          {/* Title */}
          <Text
            style={{
              color: colors.text,
              fontSize: 22,
              fontWeight: "800",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Start Recording?
          </Text>

          {/* Description */}
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              lineHeight: 24,
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            This will record video and audio using your device's camera and
            microphone.
            {"\n\n"}
            Your recording will be saved to your device and can be uploaded to
            Crestar to share with others.
            {"\n\n"}
            By tapping "Start Recording", you consent to this recording.
          </Text>

          {/* Buttons */}
          <TouchableOpacity
            onPress={onConsent}
            style={{
              backgroundColor: "#EF4444",
              paddingVertical: 16,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Start Recording
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onCancel}
            style={{
              paddingVertical: 12,
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 15,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
