// @ts-nocheck
import { View, Text } from "react-native";
import { Star } from "lucide-react-native";
import { useTheme } from "@/utils/theme";

export function ProfileStats({ profile, userType }) {
  const { isMonetized, isSeller, isDeliverer } = userType;
  const colors = useTheme();

  if (!isMonetized) {
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 32,
          marginBottom: 20,
        }}
      >
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
            0
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Following
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
            {profile.stats?.followers || "0"}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Followers
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
            0
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Likes
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        gap: 24,
        marginBottom: 20,
      }}
    >
      {isSeller && (
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
            {profile.stats?.products || 0}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Products
          </Text>
        </View>
      )}

      {isSeller && (
        <View style={{ alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Star size={16} color="#FFB800" fill="#FFB800" />
            <Text
              style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}
            >
              {profile.stats?.rating?.toFixed(1) || "0.0"}
            </Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Rating
          </Text>
        </View>
      )}

      <View style={{ alignItems: "center" }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
          {profile.stats?.followers || "0"}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          Followers
        </Text>
      </View>

      {(isSeller || isDeliverer) && (
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
            {profile.stats?.sales || "0"}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {isSeller ? "Sales" : "Deliveries"}
          </Text>
        </View>
      )}
    </View>
  );
}
