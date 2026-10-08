// @ts-nocheck
import { View, Text, Platform } from "react-native";
import { formatDistanceToNow } from "date-fns";
import { Circle } from "lucide-react-native";
import {
  getTransactionIcon,
  getTransactionColor,
  getTransactionLabel,
  isIncomingTransaction,
} from "@/utils/walletHelpers";
import CurrencyPrice from "../CurrencyPrice";

function safeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (e) {
    return "";
  }
}

export function TransactionList({ transactions, colors }) {
  const rows = Array.isArray(transactions) ? transactions : [];

  if (rows.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.cardBackground || colors.background,
          borderRadius: 16,
          padding: 48,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          No transactions yet
        </Text>
        <Text
          style={{ color: colors.textTertiary, fontSize: 14, marginTop: 6 }}
        >
          Your activity will appear here
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground || colors.background,
        borderRadius: 16,
        overflow: "hidden",
        ...Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
          },
          android: { elevation: 2 },
        }),
      }}
    >
      {rows.map((tx, index) => {
        const Icon = getTransactionIcon(tx.transaction_type) || Circle;
        const txColor =
          getTransactionColor(tx.transaction_type, colors) || colors.text;
        const incoming = isIncomingTransaction(tx.transaction_type);
        const isPending = tx.status === "pending";
        const displayAmount = Math.abs(parseFloat(tx.amount) || 0);
        const txCurrency = tx.currency || "GHS";
        return (
          <View key={`${tx.id || "tx"}-${index}`}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: `${txColor}15`,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Icon size={18} color={txColor} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.text,
                    marginBottom: 2,
                  }}
                >
                  {getTransactionLabel(tx)}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textTertiary }}>
                  {safeDate(tx.created_at)}
                </Text>
                {[
                  "order_payout",
                  "creator_commission",
                  "delivery_fee",
                  "escrow_release",
                ].includes(tx.transaction_type) ? (
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textTertiary,
                      marginTop: 2,
                    }}
                  >
                    After Crestar’s 3% fee
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: incoming ? "#34C759" : colors.text,
                      marginRight: 2,
                    }}
                  >
                    {incoming ? "+" : "−"}
                  </Text>
                  <CurrencyPrice
                    price={displayAmount}
                    originalCurrency={txCurrency}
                    showOriginal={false}
                    size="small"
                    textStyle={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: incoming ? "#34C759" : colors.text,
                    }}
                  />
                </View>
                {isPending ? (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: "#FF9F0A",
                      marginTop: 2,
                    }}
                  >
                    Pending PIN
                  </Text>
                ) : null}
              </View>
            </View>
            {index < rows.length - 1 && (
              <View
                style={{
                  height: 0.5,
                  backgroundColor: colors.borderLight || "rgba(0,0,0,0.06)",
                  marginLeft: 68,
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}