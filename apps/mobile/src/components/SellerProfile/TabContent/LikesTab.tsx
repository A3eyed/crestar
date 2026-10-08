// @ts-nocheck
import { View, Text } from "react-native";
import { Heart } from "lucide-react-native";

export function LikesTab() {
  return (
    <View style={{ paddingTop: 60, alignItems: "center" }}>
      <Heart size={40} color="#FFFFFF" style={{ marginBottom: 12 }} />
      <Text style={{ color: "#FFFFFF", fontSize: 15, marginBottom: 4 }}>
        Liked videos
      </Text>
      <Text style={{ color: "#FFFFFF", fontSize: 13 }}>
        Private to this user
      </Text>
    </View>
  );
}
