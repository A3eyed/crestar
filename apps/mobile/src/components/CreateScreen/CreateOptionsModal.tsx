// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Video, Radio } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";

export function CreateOptionsModal({ onStartVideo, hasMonetization }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleGoLive = () => {
    router.push("/live/host");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.95)" }}>
      <StatusBar style="light" />

      <View
        style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 40,
          flex: 1,
          justifyContent: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: "absolute",
            top: insets.top + 16,
            left: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 32,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Create Content
        </Text>
        <Text
          style={{
            color: "rgba(255, 255, 255, 0.6)",
            fontSize: 16,
            textAlign: "center",
            marginBottom: 48,
          }}
        >
          Choose how you want to create
        </Text>

        <View style={{ gap: 16 }}>
          {/* Record Video */}
          <TouchableOpacity
            onPress={onStartVideo}
            style={{ overflow: "hidden", borderRadius: 20 }}
          >
            <BlurView
              intensity={60}
              tint="dark"
              style={{
                padding: 24,
                borderWidth: 2,
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Video size={28} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 20,
                      fontWeight: "700",
                      marginBottom: 4,
                    }}
                  >
                    Record Video
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: 14,
                    }}
                  >
                    Create and share video content
                  </Text>
                </View>
              </View>
            </BlurView>
          </TouchableOpacity>

          {/* Go Live - Only show if monetized */}
          {hasMonetization && (
            <TouchableOpacity
              onPress={handleGoLive}
              style={{ overflow: "hidden", borderRadius: 20 }}
            >
              <BlurView
                intensity={60}
                tint="dark"
                style={{
                  padding: 24,
                  borderWidth: 2,
                  borderColor: "rgba(255, 184, 0, 0.3)",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: "rgba(255, 184, 0, 0.2)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Radio size={28} color="#FFB800" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 20,
                          fontWeight: "700",
                        }}
                      >
                        Go Live
                      </Text>
                      <View
                        style={{
                          backgroundColor: "#FFFFFF",
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: "#000000",
                            fontSize: 10,
                            fontWeight: "700",
                          }}
                        >
                          LIVE
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: 14,
                      }}
                    >
                      Sell products in real-time
                    </Text>
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>
          )}
        </View>

        {!hasMonetization && (
          <View
            style={{
              marginTop: 32,
              padding: 20,
              borderRadius: 16,
              backgroundColor: "rgba(255, 184, 0, 0.1)",
              borderWidth: 1,
              borderColor: "rgba(255, 184, 0, 0.2)",
            }}
          >
            <Text
              style={{
                color: "#FFB800",
                fontSize: 14,
                fontWeight: "600",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              💰 Want to Go Live?
            </Text>
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: 13,
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Enable monetization to start live shopping sessions
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/monetization-center")}
              style={{
                backgroundColor: "#FFB800",
                borderRadius: 12,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  color: "#000000",
                  fontSize: 15,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                Enable Monetization
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
