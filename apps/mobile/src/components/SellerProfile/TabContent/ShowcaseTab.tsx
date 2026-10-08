// @ts-nocheck
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { Image } from "expo-image";
import {
  ShoppingBag,
  UtensilsCrossed,
  Star,
  ChevronRight,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import useLocalization from "@/utils/localization";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2;

export function ShowcaseTab({ sellerId, sellerType }) {
  const router = useRouter();
  const { formatCurrency } = useLocalization();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sellerId) {
      fetchShowcaseProducts();
    }
  }, [sellerId]);

  const fetchShowcaseProducts = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(
        `/api/listings/products?sellerId=${sellerId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch showcase products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductPress = (item) => {
    if (item.product_type === "food_beverage") {
      router.push(`/food/${sellerId}`);
    } else {
      router.push(`/product/${item.id}`);
    }
  };

  const isFood = sellerType === "food_beverage";
  const IconComponent = isFood ? UtensilsCrossed : ShoppingBag;

  if (loading) {
    return (
      <View style={{ paddingTop: 60, alignItems: "center" }}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={{ paddingTop: 60, alignItems: "center" }}>
        <IconComponent size={48} color="#FFFFFF" style={{ marginBottom: 16 }} />
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 15,
            marginBottom: 8,
          }}
        >
          {isFood ? "No menu items yet" : "No showcase items yet"}
        </Text>
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 13,
            textAlign: "center",
            paddingHorizontal: 40,
          }}
        >
          {isFood
            ? "This kitchen hasn't added any items to their menu yet"
            : "This seller hasn't added any products to their showcase yet"}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}>
      {/* Showcase Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <IconComponent size={20} color="#D4AF37" />
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: "700",
            flex: 1,
          }}
        >
          {isFood
            ? `Menu (${products.length})`
            : `Showcase (${products.length})`}
        </Text>
      </View>

      {/* Product Grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {products.map((item) => {
          const media = Array.isArray(item.media) ? item.media : [];
          const firstImage = media.length > 0 ? media[0] : null;
          const price = parseFloat(item.price || item.basic_price || 0);

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleProductPress(item)}
              style={{
                width: ITEM_WIDTH,
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                marginBottom: 4,
              }}
            >
              {/* Product Image */}
              {firstImage ? (
                <Image
                  source={{ uri: firstImage }}
                  style={{ width: "100%", height: ITEM_WIDTH }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: ITEM_WIDTH,
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconComponent size={32} color="#FFFFFF" />
                </View>
              )}

              {/* Today's Special Badge */}
              {item.is_todays_special && (
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    backgroundColor: "#D4AF37",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    ⭐ SPECIAL
                  </Text>
                </View>
              )}

              {/* Spicy indicator for food */}
              {item.spicy_level > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 12 }}>
                    {"🌶️".repeat(Math.min(item.spicy_level, 3))}
                  </Text>
                </View>
              )}

              {/* Product Info */}
              <View style={{ padding: 10 }}>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: "600",
                    marginBottom: 4,
                  }}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                <Text
                  style={{
                    color: "#D4AF37",
                    fontSize: 16,
                    fontWeight: "700",
                    marginBottom: 4,
                  }}
                >
                  {formatCurrency(price)}
                </Text>

                {/* Category tag */}
                {item.category && (
                  <View
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 11 }}>
                      {item.category}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
