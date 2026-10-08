// @ts-nocheck
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Image } from "expo-image";
import { ShoppingBag, Edit } from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PRODUCT_WIDTH = (SCREEN_WIDTH - 6) / 3;

export function ShopTab({
  products,
  services,
  onProductPress,
  formatCurrency,
  isOwnProfile,
  handleEditPress,
}) {
  const allItems = [...products, ...services];

  if (allItems.length === 0) {
    return (
      <View
        style={{
          width: SCREEN_WIDTH,
          paddingVertical: 60,
          alignItems: "center",
        }}
      >
        <ShoppingBag size={48} color="#FFFFFF" style={{ marginBottom: 16 }} />
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 15,
            marginBottom: 8,
          }}
        >
          No products yet
        </Text>
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 13,
            textAlign: "center",
            paddingHorizontal: 40,
          }}
        >
          This seller hasn't added any products to their shop yet
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 2 }}>
      {allItems.map((item) => {
        const itemImage =
          Array.isArray(item.media) && item.media.length > 0
            ? item.media[0]
            : typeof item.media === "string"
              ? item.media
              : null;

        const itemPrice = item.price || item.basic_price || 0;

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onProductPress(item)}
            style={{
              width: PRODUCT_WIDTH,
              height: PRODUCT_WIDTH * 1.4,
              position: "relative",
            }}
          >
            {itemImage ? (
              <Image
                source={{ uri: itemImage }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShoppingBag size={32} color="#FFFFFF" />
              </View>
            )}

            {/* Edit button for own profile */}
            {isOwnProfile && (
              <TouchableOpacity
                onPress={(e) => handleEditPress(item, e)}
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Edit size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: 8,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}
                numberOfLines={1}
              >
                {formatCurrency(itemPrice)}
              </Text>
              <Text
                style={{ color: "#FFFFFF", fontSize: 11 }}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </View>

            {item.is_todays_special && (
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  backgroundColor: "#D4AF37",
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}
                >
                  ⭐ SPECIAL
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
