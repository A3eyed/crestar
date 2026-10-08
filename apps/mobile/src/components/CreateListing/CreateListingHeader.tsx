// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { X } from "lucide-react-native";

export function CreateListingHeader({ onClose, colors, insets }) {
  return (
    <View
      style={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}>
        New Listing
      </Text>
      <TouchableOpacity
        onPress={onClose}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.cardBackgroundAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}
