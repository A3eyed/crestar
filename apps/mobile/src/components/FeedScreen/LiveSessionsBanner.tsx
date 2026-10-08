// @ts-nocheck
import { View, ScrollView, TouchableOpacity, Text } from "react-native";
import { Users } from "lucide-react-native";
import { Image } from "expo-image";

export function LiveSessionsBanner({ insets, liveSessions, onSessionPress }) {
  // Safety check: ensure liveSessions is an array
  if (
    !liveSessions ||
    !Array.isArray(liveSessions) ||
    liveSessions.length === 0
  )
    return null;

  return (
    <View
      style={{
        position: "absolute",
        top: insets.top + 60,
        left: 0,
        right: 0,
        zIndex: 10,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
      >
        {liveSessions.map((session) => (
          <TouchableOpacity
            key={session.id}
            onPress={() => onSessionPress(session)}
            style={{ marginRight: 8, alignItems: "center" }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                borderWidth: 2.5,
                borderColor: "#FFFFFF",
                overflow: "hidden",
              }}
            >
              {session.profile_image ? (
                <Image
                  source={{ uri: session.profile_image }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "#FFF", fontSize: 22, fontWeight: "700" }}
                  >
                    {(session.display_name || session.username || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}
              {/* Live badge */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: "#FFFFFF",
                  paddingVertical: 2,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#000000", fontSize: 8, fontWeight: "800" }}
                >
                  LIVE
                </Text>
              </View>
            </View>
            <Text
              style={{
                color: "#FFF",
                fontSize: 10,
                fontWeight: "600",
                marginTop: 4,
                maxWidth: 70,
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {session.display_name || session.username || "Shop"}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 2,
                marginTop: 2,
              }}
            >
              <Users size={8} color="rgba(255,255,255,0.5)" />
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}>
                {(session.viewer_count || 0).toLocaleString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
