// @ts-nocheck
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Camera, CheckCircle2, AlertCircle } from "lucide-react-native";
import { useState, useEffect } from "react";

export function ImageUploadField({
  label,
  required,
  helpText,
  imageUrl,
  onPress,
  uploading,
  uploadProgress,
  error,
  colors,
}) {
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // ✅ FIX: Reset states when imageUrl changes
  useEffect(() => {
    if (imageUrl) {
      console.log(
        `🖼️ ImageUploadField [${label}]: URL updated:`,
        imageUrl.substring(0, 80),
      );

      // Validate URL format
      if (typeof imageUrl !== "string") {
        console.error(
          `❌ Invalid imageUrl type for ${label}:`,
          typeof imageUrl,
        );
        setImageError(true);
        setImageLoading(false);
        setImageLoaded(false);
        return;
      }

      // Check if URL is valid
      const isValidUrl =
        imageUrl.startsWith("http://") ||
        imageUrl.startsWith("https://") ||
        imageUrl.startsWith("file://");

      if (!isValidUrl) {
        console.error(
          `❌ Invalid imageUrl format for ${label}:`,
          imageUrl.substring(0, 100),
        );
        setImageError(true);
        setImageLoading(false);
        setImageLoaded(false);
        return;
      }

      // Reset states and prepare to load new image
      setImageError(false);
      setImageLoading(true);
      setImageLoaded(false);
    } else {
      // Reset states when imageUrl is cleared
      setImageError(false);
      setImageLoading(false);
      setImageLoaded(false);
    }
  }, [imageUrl, label]);

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 15,
          fontWeight: "600",
          marginBottom: 8,
        }}
      >
        {label} {required && <Text style={{ color: "#D4AF37" }}>*</Text>}
      </Text>
      {helpText && (
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 13,
            marginBottom: 8,
          }}
        >
          {helpText}
        </Text>
      )}
      <TouchableOpacity
        onPress={onPress}
        disabled={uploading}
        style={{
          borderRadius: 12,
          borderWidth: 2,
          borderColor: error ? "#D4AF37" : imageUrl ? "#D4AF37" : colors.border,
          borderStyle: imageUrl ? "solid" : "dashed",
          backgroundColor: colors.cardBackground,
          padding: 20,
          alignItems: "center",
          justifyContent: "center",
          minHeight: imageUrl ? 120 : 100,
        }}
      >
        {imageUrl ? (
          <>
            <View
              style={{ position: "relative", width: "100%", marginBottom: 12 }}
            >
              <Image
                key={`${label}-${imageUrl}`}
                source={{ uri: imageUrl }}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 8,
                }}
                contentFit="cover"
                cachePolicy="memory-disk"
                priority="high"
                transition={200}
                recyclingKey={`${label}-${imageUrl}`}
                onLoadStart={() => {
                  console.log(`🔄 Image loading started for ${label}`);
                  setImageLoading(true);
                  setImageError(false);
                  setImageLoaded(false);
                }}
                onLoad={() => {
                  console.log(`✅ Image loaded successfully for ${label}`);
                  setImageLoading(false);
                  setImageError(false);
                  setImageLoaded(true);
                }}
                onError={(e) => {
                  const errorDetails =
                    e?.nativeEvent?.error || e?.error || "Image failed to load";
                  console.error(`❌ Image load error for ${label}:`, {
                    error: errorDetails,
                    url: imageUrl?.substring(0, 100),
                    eventType: e?.type,
                    nativeEvent: e?.nativeEvent,
                  });
                  setImageError(true);
                  setImageLoading(false);
                  setImageLoaded(false);
                }}
              />
              {imageLoading && !imageError && (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.cardBackground,
                    borderRadius: 8,
                  }}
                >
                  <ActivityIndicator size="large" color="#D4AF37" />
                  <Text
                    style={{
                      color: colors.textSecondary,
                      marginTop: 8,
                      fontSize: 13,
                    }}
                  >
                    Loading preview...
                  </Text>
                </View>
              )}
              {imageError && (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.cardBackground,
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <AlertCircle size={32} color="#D4AF37" />
                  <Text
                    style={{
                      color: colors.text,
                      marginTop: 12,
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    Preview unavailable
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      marginTop: 4,
                      fontSize: 12,
                      textAlign: "center",
                    }}
                  >
                    File uploaded successfully ✓
                  </Text>
                  <Text
                    style={{
                      color: colors.textTertiary,
                      marginTop: 8,
                      fontSize: 11,
                      textAlign: "center",
                    }}
                  >
                    Tap to replace image
                  </Text>
                </View>
              )}
            </View>
            {imageLoaded && !imageError && (
              <>
                <CheckCircle2 size={24} color="#D4AF37" />
                <Text
                  style={{
                    color: "#D4AF37",
                    fontSize: 14,
                    fontWeight: "600",
                    marginTop: 8,
                  }}
                >
                  Uploaded Successfully
                </Text>
              </>
            )}
          </>
        ) : (
          <>
            {uploading ? (
              <>
                <ActivityIndicator size="large" color={colors.text} />
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: "600",
                    marginTop: 16,
                    textAlign: "center",
                  }}
                >
                  {uploadProgress?.message || "Uploading..."}
                </Text>

                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    marginTop: 6,
                    textAlign: "center",
                  }}
                >
                  Please wait...
                </Text>
              </>
            ) : (
              <>
                <Camera size={32} color={colors.textTertiary} />
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 14,
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  Tap to upload {label.toLowerCase()}
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 12,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  Clear, well-lit photo
                </Text>
              </>
            )}
          </>
        )}
      </TouchableOpacity>
      {error && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
          }}
        >
          <AlertCircle size={14} color="#D4AF37" />
          <Text style={{ color: "#D4AF37", fontSize: 13 }}>{error}</Text>
        </View>
      )}
    </View>
  );
}
