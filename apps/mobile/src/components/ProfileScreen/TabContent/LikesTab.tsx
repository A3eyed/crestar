// @ts-nocheck
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { Image } from "expo-image";
import { Play, ShoppingBag, Heart } from "lucide-react-native";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { useRouter } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = (SCREEN_WIDTH - 48) / 3;

export function LikesTab({ colors, userId }) {
  const router = useRouter();
  const [likedVideos, setLikedVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLikedVideos();
  }, [userId]);

  const fetchLikedVideos = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual liked videos API endpoint when implemented
      // For now, return empty array
      setLikedVideos([]);
    } catch (error) {
      console.error("Fetch liked videos error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoPress = (video) => {
    router.push({
      pathname: "/(tabs)/feed",
      params: { videoId: video.id },
    });
  };

  if (loading) {
    return (
      <View style={{ paddingTop: 80, alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (likedVideos.length === 0) {
    return (
      <View
        style={{
          paddingTop: 80,
          alignItems: "center",
          paddingHorizontal: 40,
        }}
      >
        <Heart size={48} color={colors.textTertiary} />
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 16,
            textAlign: "center",
            marginTop: 16,
          }}
        >
          No liked videos yet
        </Text>
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 14,
            textAlign: "center",
            marginTop: 8,
            opacity: 0.7,
          }}
        >
          Videos you like will appear here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={likedVideos}
      numColumns={3}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 100,
      }}
      columnWrapperStyle={{ gap: 4 }}
      renderItem={({ item }) => {
        const hasTaggedProducts =
          item.taggedItems?.length > 0 || item.tagged_items?.length > 0;

        return (
          <TouchableOpacity
            onPress={() => handleVideoPress(item)}
            style={{
              width: ITEM_WIDTH,
              height: ITEM_WIDTH * 1.5,
              marginBottom: 4,
              position: "relative",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <Image
              source={{
                uri: item.thumbnail_url || item.thumbnailUrl || item.video_url,
              }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />

            {hasTaggedProducts && (
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "rgba(212, 175, 55, 0.9)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShoppingBag size={14} color="#FFFFFF" />
              </View>
            )}

            <View
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: "600",
                  textShadowColor: "rgba(0, 0, 0, 0.8)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {item.views_count || item.viewsCount || 0}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }}
      keyExtractor={(item) => item.id}
    />
  );
}
