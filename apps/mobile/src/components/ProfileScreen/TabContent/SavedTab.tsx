// @ts-nocheck
import { View, Text } from "react-native";
import { Bookmark } from "lucide-react-native";

export function SavedTab({ colors }) {
  return (
    <View style={{ paddingTop: 60, alignItems: "center" }}>
      <Bookmark
        size={40}
        color={colors.textTertiary}
        style={{ marginBottom: 12 }}
      />
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontWeight: "600",
          marginBottom: 4,
        }}
      >
        Saved videos
      </Text>
      <Text
        style={{
          color: colors.textTertiary,
          fontSize: 13,
          textAlign: "center",
          paddingHorizontal: 60,
        }}
      >
        Save videos to watch later
      </Text>
    </View>
  );
}
