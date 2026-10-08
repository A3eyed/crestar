// @ts-nocheck
import { View, TouchableOpacity } from "react-native";
import { ChevronLeft, Share2, MoreVertical } from "lucide-react-native";
import { useTheme } from "@/utils/theme";

export function ProfileHeader({ insets, onBack }) {
  const colors = useTheme();

  return (
    <View
      style={{
        position: "absolute",
        top: insets.top + 12,
        left: 16,
        right: 16,
        zIndex: 10,
        flexDirection: "row",
        justifyContent: "space-between",
      }}
    >
      <TouchableOpacity
        onPress={onBack}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.cardBackgroundAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ChevronLeft size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <TouchableOpacity
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.cardBackgroundAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Share2 size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.cardBackgroundAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MoreVertical size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
