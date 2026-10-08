// @ts-nocheck
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Upload } from "lucide-react-native";
import { Image } from "expo-image";
import { Trash2 } from "lucide-react-native";

export function MediaUploadSection({
  media,
  uploading,
  onMediaPick,
  onRemoveMedia,
  colors,
}) {
  return (
    <>
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Photos
      </Text>

      <TouchableOpacity
        onPress={onMediaPick}
        disabled={uploading}
        style={{
          borderRadius: 12,
          borderWidth: 2,
          borderColor: colors.border,
          borderStyle: "dashed",
          backgroundColor: colors.cardBackground,
          padding: 32,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <>
            <Upload size={32} color={colors.textTertiary} />
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                fontWeight: "600",
                marginTop: 12,
              }}
            >
              Upload Photos
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                marginTop: 4,
              }}
            >
              Tap to add images
            </Text>
          </>
        )}
      </TouchableOpacity>

      {media.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 32,
          }}
        >
          {media.map((url, idx) => (
            <View
              key={idx}
              style={{
                width: 100,
                height: 100,
                borderRadius: 12,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Image
                source={{ uri: url }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
              <TouchableOpacity
                onPress={() => onRemoveMedia(idx)}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </>
  );
}
