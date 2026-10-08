// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@/utils/theme";
import CurrencyPrice from "@/components/CurrencyPrice";
import useCartStore from "@/utils/cartStore";

export default function FloatingCartBar({
  totalItems,
  totalPrice,
  onPress,
  insets,
}) {
  const colors = useTheme();
  const { items } = useCartStore();

  if (totalItems === 0) return null;

  // Get original currency from first cart item (fallback to GHS)
  const originalCurrency =
    items[0]?.seller_currency || items[0]?.currency || "GHS";

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        position: "absolute",
        bottom: insets.bottom + 70,
        left: 16,
        right: 16,
        backgroundColor: colors.text,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            backgroundColor: "rgba(127,127,127,0.3)",
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: colors.background,
              fontSize: 14,
              fontWeight: "700",
            }}
          >
            {totalItems}
          </Text>
        </View>
        <Text
          style={{ color: colors.background, fontSize: 16, fontWeight: "700" }}
        >
          View Cart
        </Text>
      </View>
      <CurrencyPrice
        price={totalPrice}
        originalCurrency={originalCurrency}
        showOriginal={false}
        size="small"
        textStyle={{
          color: colors.background,
          fontSize: 17,
          fontWeight: "700",
        }}
      />
    </TouchableOpacity>
  );
}
