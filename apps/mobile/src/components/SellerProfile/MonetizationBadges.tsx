// @ts-nocheck
import { View, Text } from "react-native";
import { BadgeCheck, Award, Truck } from "lucide-react-native";

export function MonetizationBadges({ userType, monetization }) {
  const { isSeller, isCreator, isDeliverer, isMonetized } = userType;

  if (!isMonetized) return null;

  return (
    <View style={{ alignItems: "center", marginBottom: 16, gap: 8 }}>
      {isSeller && (
        <View
          style={{
            backgroundColor: "rgba(212, 175, 55, 0.2)",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(212, 175, 55, 0.4)",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <BadgeCheck size={14} color="#D4AF37" />
          <Text
            style={{
              color: "#D4AF37",
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {monetization.seller.seller_type === "physical_goods"
              ? "🛍️ Product Seller"
              : monetization.seller.seller_type === "food_beverage"
                ? "🍔 Food & Beverage"
                : "💼 Service Provider"}
          </Text>
        </View>
      )}

      {isCreator && (
        <View
          style={{
            backgroundColor: "rgba(212, 175, 55, 0.2)",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(212, 175, 55, 0.4)",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Award size={14} color="#D4AF37" />
          <Text
            style={{
              color: "#D4AF37",
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            ⭐ Creator
          </Text>
        </View>
      )}

      {isDeliverer && (
        <View
          style={{
            backgroundColor: "rgba(212, 175, 55, 0.2)",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(212, 175, 55, 0.4)",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Truck size={14} color="#D4AF37" />
          <Text
            style={{
              color: "#D4AF37",
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            🚚 Deliverer
          </Text>
        </View>
      )}
    </View>
  );
}
