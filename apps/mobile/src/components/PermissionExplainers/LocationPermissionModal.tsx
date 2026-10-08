// @ts-nocheck
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { MapPin, X } from "lucide-react-native";
import { useTheme } from "../../utils/theme";

/**
 * Pre-permission explainer for location access
 * Shows BEFORE the system permission prompt (App Store Guideline 5.1.1(ii))
 */
export default function LocationPermissionModal({ visible, onGrant, onDeny }) {
  const colors = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDeny}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.85)",
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
            onPress={onDeny}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 10,
            }}
          >
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Icon */}
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: "rgba(212, 175, 55, 0.15)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              alignSelf: "center",
            }}
          >
            <MapPin size={36} color="#D4AF37" />
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
            Enable Location Access
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
            We need your location to:
            {"\n\n"}• Show nearby restaurants and sellers
            {"\n"}• Calculate accurate delivery fees
            {"\n"}• Enable delivery tracking
            {"\n\n"}
            Your location is only used when you're actively using the app and is
            never shared without your permission.
          </Text>

          {/* Buttons */}
          <TouchableOpacity
            onPress={onGrant}
            style={{
              backgroundColor: "#D4AF37",
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
              Allow Location Access
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onDeny}
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
              Not Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
