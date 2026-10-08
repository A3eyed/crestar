// @ts-nocheck
import { View, Text } from "react-native";
import { STATUS_COLORS, STATUS_LABELS } from "@/constants/affiliateConstants";
import CurrencyPrice from "../CurrencyPrice";

export function AllSalesList({ orders, formatCurrency, colors }) {
  if (orders.length === 0) return null;

  const commissionCurrency = "GHS";

  return (
    <View>
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        All Attributed Sales
      </Text>
      <View style={{ gap: 10 }}>
        {orders.map((order) => (
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                  }}
                >
                  #{order.orderNumber} · Sale:{" "}
                </Text>
                <CurrencyPrice
                  price={order.subtotal}
                  originalCurrency={order.currency || commissionCurrency}
                  showOriginal={false}
                  size="small"
                  textStyle={{
                    color: colors.textSecondary,
                    fontSize: 12,
                  }}
                />
              </View>
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
              <Text
                style={{
                  color: STATUS_COLORS[order.status] || "#6B7280",
                  fontSize: 11,
                  marginTop: 2,
                  fontWeight: "600",
                }}
              >
                {STATUS_LABELS[order.status] || order.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
