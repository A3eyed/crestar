// @ts-nocheck
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { ShoppingBag, TrendingUp, Truck } from "lucide-react-native";

export function ProfileAvatar({ profile, userType }) {
  const { isMonetized, isSeller, isCreator, isDeliverer } = userType;

  const avatarInitial =
    (profile.business_name || profile.display_name || profile.username)
      ?.charAt(0)
      ?.toUpperCase() || "U";

  return (
    <View style={{ alignItems: "center", marginBottom: 16 }}>
      <View
        style={{
          width: isMonetized ? 100 : 80,
          height: isMonetized ? 100 : 80,
          borderRadius: isMonetized ? 50 : 40,
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          borderWidth: isMonetized ? 3 : 2,
          borderColor: isMonetized ? "#D4AF37" : "rgba(255, 255, 255, 0.3)",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {profile.profile_image ? (
          <Image
            source={{ uri: profile.profile_image }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: isMonetized ? 42 : 32,
              fontWeight: "700",
            }}
          >
            {avatarInitial}
          </Text>
        )}
      </View>

      {isMonetized && (
        <View
          style={{
            position: "absolute",
            bottom: -8,
            left: "50%",
            transform: [{ translateX: -50 }],
            flexDirection: "row",
            gap: 4,
          }}
        >
          {isSeller && (
            <View
              style={{
                backgroundColor: "#D4AF37",
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderWidth: 2,
                borderColor: "#000",
              }}
            >
              <ShoppingBag size={12} color="#FFFFFF" />
            </View>
          )}
          {isCreator && (
            <View
              style={{
                backgroundColor: "#D4AF37",
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderWidth: 2,
                borderColor: "#000",
              }}
            >
              <TrendingUp size={12} color="#FFFFFF" />
            </View>
          )}
          {isDeliverer && (
            <View
              style={{
                backgroundColor: "#D4AF37",
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderWidth: 2,
                borderColor: "#000",
              }}
            >
              <Truck size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
      )}
    </View>
  );
}
