// @ts-nocheck
import { View, TouchableOpacity } from "react-native";
import { Menu } from "lucide-react-native";

export function ProfileHeader({ colors, onMenuPress }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingHorizontal: 16,
        marginBottom: 20,
      }}
    >
      <TouchableOpacity
        onPress={onMenuPress}
        style={{
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Menu size={26} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}
