// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { Link2, Copy, Share2 } from "lucide-react-native";

export function ShowcaseShareCard({ showcaseLink, onCopy, onShare, colors }) {
  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <Link2 size={20} color="#D4AF37" />
        <Text
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: "700",
          }}
        >
          Your Showcase Link
        </Text>
      </View>
      <View
        style={{
          backgroundColor: colors.cardBackgroundAlt,
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text
          style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}
          numberOfLines={1}
        >
          {showcaseLink}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TouchableOpacity
          onPress={onCopy}
          style={{
            flex: 1,
            backgroundColor: colors.cardBackgroundAlt,
            borderRadius: 10,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Copy size={16} color={colors.text} />
          <Text
            style={{
              color: colors.text,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            Copy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onShare}
          style={{
            flex: 1,
            backgroundColor: "#D4AF37",
            borderRadius: 10,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Share2 size={16} color="#FFFFFF" />
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: "700",
            }}
          >
            Share
          </Text>
        </TouchableOpacity>
      </View>
      <Text
        style={{
          color: colors.textTertiary,
          fontSize: 11,
          marginTop: 10,
          textAlign: "center",
        }}
      >
        Share like TikTok — anyone can shop your tagged products!
      </Text>
    </View>
  );
}
