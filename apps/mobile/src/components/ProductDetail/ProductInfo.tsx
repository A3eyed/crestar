// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { Star, Package, MessageCircle } from "lucide-react-native";
import CurrencyPrice from "../CurrencyPrice";

export function ProductInfo({
  product,
  colors,
  formatCurrency,
  onSellerPress,
  onMessagePress,
}) {
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 26,
          fontWeight: "700",
          marginBottom: 8,
        }}
      >
        {product.name}
      </Text>

      <TouchableOpacity onPress={onSellerPress}>
        <Text
          style={{
            color: "#D4AF37",
            fontSize: 15,
            marginBottom: 8,
            textDecorationLine: "underline",
          }}
        >
          Sold by {product.seller}
        </Text>
      </TouchableOpacity>

      {/* Message Seller */}
      <TouchableOpacity
        onPress={onMessagePress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: "rgba(212, 175, 55, 0.1)",
          borderWidth: 1,
          borderColor: "rgba(212, 175, 55, 0.2)",
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 14,
          alignSelf: "flex-start",
          marginBottom: 16,
        }}
      >
        <MessageCircle size={16} color="#D4AF37" />
        <Text style={{ color: "#D4AF37", fontSize: 14, fontWeight: "600" }}>
          Message Seller
        </Text>
      </TouchableOpacity>

      {/* Rating */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Star size={18} color="#FFB800" fill="#FFB800" />
          <Text style={{ color: "#FFB800", fontSize: 17, fontWeight: "700" }}>
            {product.rating}
          </Text>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
          ({product.reviews} reviews)
        </Text>

        {product.inStock ? (
          <>
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: "rgba(255, 255, 255, 0.4)",
              }}
            />
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Package size={16} color="#D4AF37" />
              <Text
                style={{
                  color: "#D4AF37",
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                In Stock ({product.stockQuantity})
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {/* Price with real-time currency conversion */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <CurrencyPrice
          price={product.price}
          originalCurrency={product.seller_currency || "GHS"}
          size="xlarge"
          textStyle={{ color: colors.text, fontSize: 34, fontWeight: "700" }}
          convertedStyle={{
            fontSize: 18,
            color: colors.textSecondary,
            fontWeight: "500",
            marginTop: 4,
          }}
        />
        {product.originalPrice ? (
          <>
            <CurrencyPrice
              price={product.originalPrice}
              originalCurrency={product.seller_currency || "GHS"}
              showOriginal={false}
              size="medium"
              textStyle={{
                color: colors.text,
                fontSize: 20,
                textDecorationLine: "line-through",
              }}
            />
            <View
              style={{
                backgroundColor: "#D4AF37",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                -{product.discount}% OFF
              </Text>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}
