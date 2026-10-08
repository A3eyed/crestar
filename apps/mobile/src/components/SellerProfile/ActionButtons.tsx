// @ts-nocheck
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { BlurView } from "expo-blur";
import {
  Check,
  MessageCircle,
  MoreVertical,
  AlertTriangle,
  UserX,
} from "lucide-react-native";
import { useState } from "react";
import { Modal } from "react-native";
import { useTheme } from "@/utils/theme";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

export function ActionButtons({
  isFollowing,
  onFollow,
  onMessage,
  userType,
  targetUser,
  currentUser,
}) {
  const { isMonetized } = userType;
  const colors = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  const handleBlock = () => {
    setShowMenu(false);
    Alert.alert(
      "Block User",
      `Are you sure you want to block @${targetUser?.username}? They won't be able to see your content or send you payments.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await authenticatedFetch(
                "/api/moderation/block",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ username: targetUser?.username }),
                },
              );

              const result = await response.json();
              if (response.ok) {
                Alert.alert("Success", result.message);
              } else {
                Alert.alert("Error", result.error || "Failed to block user");
              }
            } catch (error) {
              Alert.alert("Error", "Failed to block user. Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleReport = () => {
    setShowMenu(false);
    Alert.alert("Report User", "Why are you reporting this user?", [
      { text: "Cancel", style: "cancel" },
      { text: "Fraud", onPress: () => submitReport("fraud") },
      { text: "Harassment", onPress: () => submitReport("harassment") },
      {
        text: "Inappropriate Content",
        onPress: () => submitReport("inappropriate"),
      },
      { text: "Illegal Goods", onPress: () => submitReport("illegal_goods") },
    ]);
  };

  const submitReport = async (category) => {
    try {
      const response = await authenticatedFetch("/api/moderation/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "user",
          targetUserId: targetUser?.id,
          username: targetUser?.username,
          category,
          description: `User report for ${category}`,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        Alert.alert(
          "Report Submitted",
          "Thank you for your report. Our team will review it shortly.",
        );
      } else {
        Alert.alert("Error", result.error || "Failed to submit report");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to submit report. Please try again.");
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        marginBottom: isMonetized ? 20 : 16,
      }}
    >
      <TouchableOpacity
        onPress={onFollow}
        style={{
          flex: 1,
          overflow: "hidden",
          borderRadius: 8,
        }}
      >
        <BlurView
          intensity={isFollowing ? 40 : 80}
          tint={colors.glass.tint}
          style={{
            paddingVertical: 14,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            backgroundColor: isFollowing ? "transparent" : "#D4AF37",
            borderWidth: 1,
            borderColor: isFollowing ? colors.border : "#D4AF37",
          }}
        >
          {isFollowing && <Check size={18} color={colors.text} />}
          <Text
            style={{
              color: isFollowing ? colors.text : "#FFFFFF",
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            {isFollowing ? "Following" : "Follow"}
          </Text>
        </BlurView>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onMessage}
        style={{
          overflow: "hidden",
          borderRadius: 8,
          width: 56,
        }}
      >
        <BlurView
          intensity={60}
          tint={colors.glass.tint}
          style={{
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(212, 175, 55, 0.4)",
            backgroundColor: "rgba(212, 175, 55, 0.15)",
          }}
        >
          <MessageCircle size={22} color="#D4AF37" />
        </BlurView>
      </TouchableOpacity>

      {/* Three-dot menu for Block/Report */}
      <TouchableOpacity
        onPress={() => setShowMenu(true)}
        style={{
          overflow: "hidden",
          borderRadius: 8,
          width: 56,
        }}
      >
        <BlurView
          intensity={60}
          tint={colors.glass.tint}
          style={{
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.inputBackground,
          }}
        >
          <MoreVertical size={22} color={colors.text} />
        </BlurView>
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: colors.modalBackground,
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={{
              backgroundColor: colors.cardBackgroundAlt,
              borderRadius: 16,
              padding: 20,
              width: "80%",
              maxWidth: 300,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              User Actions
            </Text>

            <TouchableOpacity
              onPress={handleReport}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: "rgba(255, 152, 0, 0.15)",
                marginBottom: 12,
                gap: 12,
              }}
            >
              <AlertTriangle size={24} color="#FF9500" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: "#FF9500", fontSize: 16, fontWeight: "600" }}
                >
                  Report User
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 149, 0, 0.7)",
                    fontSize: 14,
                    marginTop: 2,
                  }}
                >
                  Report inappropriate behavior
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBlock}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: "rgba(212, 175, 55, 0.15)",
                gap: 12,
              }}
            >
              <UserX size={24} color="#D4AF37" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: "#D4AF37", fontSize: 16, fontWeight: "600" }}
                >
                  Block User
                </Text>
                <Text
                  style={{
                    color: "rgba(212, 175, 55, 0.7)",
                    fontSize: 14,
                    marginTop: 2,
                  }}
                >
                  Hide content and prevent contact
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowMenu(false)}
              style={{
                paddingVertical: 16,
                alignItems: "center",
                marginTop: 20,
              }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
