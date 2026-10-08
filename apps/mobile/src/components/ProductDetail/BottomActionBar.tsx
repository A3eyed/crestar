// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { Minus, Plus, ShoppingBag } from "lucide-react-native";

export function BottomActionBar({
  colors,
  insets,
  quantity,
  onQuantityChange,
  onAddToCart,
  onBuyNow,
}) {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 16,
        paddingBottom: insets.bottom + 16,
        paddingHorizontal: 20,
      }}
    >
      {/* Quantity Selector */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
          }}
        >
          Quantity
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Minus size={18} color={colors.text} />
          </TouchableOpacity>

          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "700",
              minWidth: 32,
              textAlign: "center",
            }}
          >
            {quantity}
          </Text>

          <TouchableOpacity
            onPress={() => onQuantityChange(quantity + 1)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <TouchableOpacity
          onPress={onAddToCart}
          style={{
            flex: 1,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            backgroundColor: "rgba(212, 175, 55, 0.15)",
            borderWidth: 2,
            borderColor: "#D4AF37",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <ShoppingBag size={18} color="#D4AF37" />
          <Text style={{ color: "#D4AF37", fontSize: 16, fontWeight: "700" }}>
            Add to Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onBuyNow}
          style={{
            flex: 1,
            backgroundColor: "#D4AF37",
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <ShoppingBag size={18} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
            Buy Now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
