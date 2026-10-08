// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";

export function FulfillmentMethodSection({
  fulfillmentMethod,
  setFulfillmentMethod,
  deliveryZones,
  selectedLogisticsProfile,
  setSelectedLogisticsProfile,
  setShowLogisticsProfilePicker,
  colors,
}) {
  const router = useRouter();

  return (
    <>
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Fulfillment Method
      </Text>

      <View style={{ marginBottom: 24 }}>
        {/* Crestar On-Demand Option */}
        <TouchableOpacity
          onPress={() => {
            setFulfillmentMethod("crestar_on_demand");
            setSelectedLogisticsProfile(null);
          }}
          style={{
            borderRadius: 12,
            borderWidth: 2,
            borderColor:
              fulfillmentMethod === "crestar_on_demand"
                ? colors.accent
                : colors.border,
            backgroundColor:
              fulfillmentMethod === "crestar_on_demand"
                ? colors.cardBackgroundAlt
                : colors.cardBackground,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor:
                  fulfillmentMethod === "crestar_on_demand"
                    ? colors.accent
                    : colors.border,
                backgroundColor:
                  fulfillmentMethod === "crestar_on_demand"
                    ? colors.accent
                    : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {fulfillmentMethod === "crestar_on_demand" && (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#FFFFFF",
                  }}
                />
              )}
            </View>
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                fontWeight: "700",
                flex: 1,
              }}
            >
              Crestar On-Demand
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              lineHeight: 19,
            }}
          >
            Our delivery network handles fulfillment. Dynamic rates calculated
            at checkout based on buyer location.
          </Text>
        </TouchableOpacity>

        {/* Self-Managed Logistics Option */}
        <TouchableOpacity
          onPress={() => setFulfillmentMethod("self_managed")}
          style={{
            borderRadius: 12,
            borderWidth: 2,
            borderColor:
              fulfillmentMethod === "self_managed"
                ? colors.accent
                : colors.border,
            backgroundColor:
              fulfillmentMethod === "self_managed"
                ? colors.cardBackgroundAlt
                : colors.cardBackground,
            padding: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor:
                  fulfillmentMethod === "self_managed"
                    ? colors.accent
                    : colors.border,
                backgroundColor:
                  fulfillmentMethod === "self_managed"
                    ? colors.accent
                    : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {fulfillmentMethod === "self_managed" && (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#FFFFFF",
                  }}
                />
              )}
            </View>
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                fontWeight: "700",
                flex: 1,
              }}
            >
              Independent Logistics
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              lineHeight: 19,
            }}
          >
            Handle your own fulfillment. Select a custom delivery profile to
            apply your specific regional and international rates to this
            listing.
          </Text>
        </TouchableOpacity>

        {/* Logistics Profile Picker (shown when self-managed is selected) */}
        {fulfillmentMethod === "self_managed" && (
          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              Logistics Profile
            </Text>
            {deliveryZones.length === 0 ? (
              <View
                style={{
                  backgroundColor: "rgba(255, 184, 0, 0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 184, 0, 0.2)",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  No logistics profiles configured yet
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/delivery-zones")}
                  style={{
                    backgroundColor: "#FFB800",
                    borderRadius: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    Configure Logistics Zones
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowLogisticsProfilePicker(true)}
                style={{
                  backgroundColor: colors.inputBackground,
                  borderWidth: 1,
                  borderColor: selectedLogisticsProfile
                    ? "#D4AF37"
                    : colors.inputBorder,
                  borderRadius: 12,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    color: selectedLogisticsProfile
                      ? colors.text
                      : colors.inputPlaceholder,
                    fontSize: 15,
                  }}
                >
                  {selectedLogisticsProfile
                    ? `${selectedLogisticsProfile.cityName} - ${selectedLogisticsProfile.currency} ${selectedLogisticsProfile.deliveryFee?.toFixed(2) || "0.00"}`
                    : "Select a Logistics Profile..."}
                </Text>
                <ChevronRight size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </>
  );
}
