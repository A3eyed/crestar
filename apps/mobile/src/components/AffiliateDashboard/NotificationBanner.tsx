// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { Bell, ChevronRight } from "lucide-react-native";

export function NotificationBanner({
  notifPermission,
  onRequestPermission,
  colors,
}) {
  if (notifPermission) return null;

  return (
    <TouchableOpacity
      onPress={onRequestPermission}
      style={{
        backgroundColor: "rgba(212, 175, 55, 0.1)",
        borderRadius: 12,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: "rgba(212, 175, 55, 0.25)",
      }}
    >
      <Bell size={20} color="#D4AF37" />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          Enable Sale Notifications
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 12,
            marginTop: 2,
          }}
        >
          Get notified instantly when someone buys through your video
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}
