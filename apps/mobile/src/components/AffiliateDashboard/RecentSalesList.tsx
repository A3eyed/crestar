// @ts-nocheck
import { View, Text } from "react-native";
import { ShoppingBag } from "lucide-react-native";
import { STATUS_COLORS, STATUS_LABELS } from "@/constants/affiliateConstants";
import CurrencyPrice from "../CurrencyPrice";

export function RecentSalesList({ orders, formatCurrency, colors }) {
  if (orders.length === 0) return null;

  const commissionCurrency = "GHS";

  return (
    <View>
      <Text
        style={{
          color: colors.text,
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Recent Sales
      </Text>
      <View style={{ gap: 10 }}>
        {orders.slice(0, 5).map((order) => (
          <View
            key={order.id}
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(212, 175, 55, 0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShoppingBag size={20} color="#D4AF37" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: "600",
                }}
                numberOfLines={1}
              >
                {order.itemTitle}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                #{order.orderNumber} ·{" "}
                {new Date(order.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    color: "#D4AF37",
                    fontSize: 15,
                    fontWeight: "700",
                    marginRight: 2,
                  }}
                >
                  +
                </Text>
                <CurrencyPrice
                  price={order.commission}
                  originalCurrency={commissionCurrency}
                  showOriginal={false}
                  size="small"
                  textStyle={{
                    color: "#D4AF37",
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                />
              </View>
              <View
                style={{
                  marginTop: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor:
                    (STATUS_COLORS[order.status] || "#6B7280") + "20",
                }}
              >
                <Text
                  style={{
                    color: STATUS_COLORS[order.status] || "#6B7280",
                    fontSize: 11,
                    fontWeight: "600",
                  }}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
