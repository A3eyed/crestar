// @ts-nocheck
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { MapPin } from "lucide-react-native";

export default function LocationBar({
  colors,
  userLocation,
  userCity,
  userRegion,
  locationLoading,
  onLocationPress,
}) {
  return (
    <TouchableOpacity
      onPress={onLocationPress}
      disabled={locationLoading}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
      }}
    >
      {locationLoading ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <MapPin
          size={16}
          color={userLocation ? "#D4AF37" : colors.iconSecondary}
        />
      )}
      <Text
        style={{
          color: userLocation ? "#D4AF37" : colors.textSecondary,
          fontSize: 13,
          fontWeight: "500",
        }}
      >
        {userCity && userRegion
          ? `📍 ${userCity}, ${userRegion}`
          : userLocation
            ? "Showing nearby • within 10km"
            : "Tap to enable location"}
      </Text>
    </TouchableOpacity>
  );
}
