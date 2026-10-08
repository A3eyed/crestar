// @ts-nocheck
import { View, Text } from "react-native";
import { Bookmark } from "lucide-react-native";

export function SavedTab() {
  return (
    <View style={{ paddingTop: 60, alignItems: "center" }}>
      <Bookmark size={40} color="#FFFFFF" style={{ marginBottom: 12 }} />
      <Text style={{ color: "#FFFFFF", fontSize: 15, marginBottom: 4 }}>
        Saved videos
      </Text>
      <Text style={{ color: "#FFFFFF", fontSize: 13 }}>
        Private to this user
      </Text>
    </View>
  );
}
