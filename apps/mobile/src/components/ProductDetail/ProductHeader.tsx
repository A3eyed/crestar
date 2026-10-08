// @ts-nocheck
import { View, TouchableOpacity, Dimensions } from "react-native";
import { ChevronLeft, Share2, Heart } from "lucide-react-native";

export function ProductHeader({ onBack, insets }) {
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
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ChevronLeft size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <TouchableOpacity
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Share2 size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Heart size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
