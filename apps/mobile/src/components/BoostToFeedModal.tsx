// @ts-nocheck
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Video, Upload, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Boost to Feed Modal - Post-Product-Creation Prompt
 *
 * Appears immediately after successful product creation.
 * Follows "Marketplace-First, Feed-Second" sequence.
 *
 * @param {boolean} visible - Modal visibility
 * @param {object} product - The product that was just created
 * @param {function} onClose - Close modal callback
 * @param {function} onUploadVideo - Navigate to video upload callback
 */
export default function BoostToFeedModal({
  visible,
  product,
  onClose,
  onUploadVideo,
}) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleUploadVideo = () => {
    onClose();
    // Navigate to create screen with product tagging
    setTimeout(() => {
      router.push({
        pathname: "/(tabs)/create",
        params: {
          tagProductId: product?.id,
          productName: product?.title,
          productPrice: product?.price,
        },
      });
    }, 300);
  };

  const handleAddLater = () => {
    onClose();
    // Navigate to seller dashboard/inventory view
    setTimeout(() => {
      router.push("/seller/dashboard");
    }, 300);
  };

  if (!product) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.modalBackground,
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom + 20,
            paddingTop: 24,
            paddingHorizontal: 20,
          }}
        >
          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.cardBackgroundAlt,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <X size={18} color={colors.text} />
          </TouchableOpacity>

          {/* Icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(212, 175, 55, 0.1)",
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "center",
              marginBottom: 24,
            }}
          >
            <Video size={40} color="#D4AF37" />
          </View>

          {/* Headline */}
          <Text
            style={{
              color: colors.text,
              fontSize: 24,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Boost this to the Feed?
          </Text>

          {/* Body */}
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 16,
              textAlign: "center",
              lineHeight: 24,
              marginBottom: 32,
              paddingHorizontal: 20,
            }}
          >
            Upload a short video of this product to engage buyers on the main
            feed
          </Text>

          {/* Product Preview */}
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              {product.title}
            </Text>
            <Text
              style={{
                color: "#D4AF37",
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              GHS {product.price?.toFixed(2)}
            </Text>
          </View>

          {/* Action A: Upload Video */}
          <TouchableOpacity
            onPress={handleUploadVideo}
            style={{
              backgroundColor: "#D4AF37",
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              flexDirection: "row",
              gap: 10,
            }}
          >
            <Upload size={20} color="#FFFFFF" />
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 17,
                fontWeight: "700",
                letterSpacing: 0.3,
              }}
            >
              Upload Video
            </Text>
          </TouchableOpacity>

          {/* Action B: Add Video Later */}
          <TouchableOpacity
            onPress={handleAddLater}
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: "600",
              }}
            >
              Add Video Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
