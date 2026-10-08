// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { Video } from "lucide-react-native";

export function EmptySalesState({ colors, onCreateVideo }) {
  return (
    <View
      style={{
        paddingVertical: 48,
        alignItems: "center",
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Video size={48} color={colors.textTertiary} />
      <Text
        style={{
          color: colors.text,
          fontSize: 18,
          fontWeight: "700",
          marginTop: 16,
          marginBottom: 8,
        }}
      >
        No sales yet
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 14,
          textAlign: "center",
          paddingHorizontal: 32,
        }}
      >
        Post a shoppable video by tagging a product — you earn 5% of every sale
        it drives!
      </Text>
      <TouchableOpacity
        onPress={onCreateVideo}
        style={{
          marginTop: 20,
          backgroundColor: "#D4AF37",
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          Post a Video
        </Text>
      </TouchableOpacity>
    </View>
  );
}
