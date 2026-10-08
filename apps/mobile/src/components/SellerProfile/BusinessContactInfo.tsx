// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import { Clock, MessageCircle } from "lucide-react-native";

export function BusinessContactInfo({
  userType,
  monetization,
  sellerId,
  sellerName,
}) {
  const { isMonetized, isSeller, isCreator } = userType;

  if (!isMonetized || (!isSeller && !isCreator)) {
    return null;
  }

  return (
    <View style={{ gap: 12, marginBottom: 16 }}>
      <TouchableOpacity
        style={{
          overflow: "hidden",
          borderRadius: 12,
        }}
      >
        <BlurView
          intensity={60}
          tint="dark"
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.15)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Clock size={16} color="rgba(255, 255, 255, 0.7)" />
          <Text
            style={{
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            Usually responds in a few hours
          </Text>
        </BlurView>
      </TouchableOpacity>

      {(monetization?.seller?.phone_number ||
        monetization?.seller?.momo_number) && (
        <TouchableOpacity
          style={{
            overflow: "hidden",
            borderRadius: 12,
          }}
        >
          <BlurView
            intensity={60}
            tint="dark"
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: "rgba(212, 175, 55, 0.3)",
              backgroundColor: "rgba(212, 175, 55, 0.1)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>💬</Text>
            <Text
              style={{
                color: "#D4AF37",
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              Contact on WhatsApp
            </Text>
          </BlurView>
        </TouchableOpacity>
      )}
    </View>
  );
}
