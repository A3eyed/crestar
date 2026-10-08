// @ts-nocheck
import { View, Text } from "react-native";
import { BlurView } from "expo-blur";
import { Star } from "lucide-react-native";

export function AboutTab({ userType, monetization }) {
  const { isMonetized, isSeller, isCreator, isDeliverer } = userType;

  if (!isMonetized) return null;

  return (
    <View style={{ padding: 20 }}>
      <View
        style={{
          overflow: "hidden",
          borderRadius: 16,
          marginBottom: 16,
        }}
      >
        <BlurView
          intensity={60}
          tint="dark"
          style={{
            padding: 20,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 16,
            }}
          >
            About {isSeller ? "Business" : isCreator ? "Creator" : "Profile"}
          </Text>

          <View style={{ gap: 16 }}>
            {isSeller && (
              <>
                <View>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    Business Name
                  </Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 15 }}>
                    {monetization.seller.business_name || "N/A"}
                  </Text>
                </View>

                <View>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    Business Type
                  </Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 15 }}>
                    {monetization.seller.seller_type === "physical_goods"
                      ? "Physical Goods"
                      : monetization.seller.seller_type === "food_beverage"
                        ? "Food & Beverage"
                        : "Service Provider"}
                  </Text>
                </View>

                <View>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    Verification Status
                  </Text>
                  <View
                    style={{
                      backgroundColor: "rgba(212, 175, 55, 0.2)",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Text
                      style={{
                        color: "#D4AF37",
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      ✓ Verified Business
                    </Text>
                  </View>
                </View>
              </>
            )}

            {isCreator && (
              <>
                <View>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    Creator Score
                  </Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 15 }}>
                    {monetization.creator.crestar_score || 0} points
                  </Text>
                </View>

                <View>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    Commission
                  </Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 15 }}>
                    Set by sellers per product
                  </Text>
                </View>
              </>
            )}

            {isDeliverer && (
              <>
                <View>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    Vehicle Type
                  </Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 15 }}>
                    {monetization.deliverer.vehicle_type?.replace("_", " ") ||
                      "N/A"}
                  </Text>
                </View>

                <View>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    Delivery Rating
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Star size={16} color="#FFB800" fill="#FFB800" />
                    <Text style={{ color: "#FFFFFF", fontSize: 15 }}>
                      {monetization.deliverer.rating?.toFixed(1) || "0.0"}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <View>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.6)",
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                Member Since
              </Text>
              <Text style={{ color: "#FFFFFF", fontSize: 15 }}>
                {new Date(
                  monetization?.seller?.created_at ||
                    monetization?.creator?.created_at ||
                    monetization?.deliverer?.created_at,
                ).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>
        </BlurView>
      </View>
    </View>
  );
}

export default AboutTab;
