// @ts-nocheck
import { View, Text } from "react-native";
import { History, Wallet, DollarSign } from "lucide-react-native";
import CurrencyPrice from "../CurrencyPrice";

export function WithdrawalList({ withdrawals, formatCurrency, colors }) {
  const walletCurrency = "GHS";

  if (withdrawals.length === 0) {
    return (
      <View style={{ paddingVertical: 60, alignItems: "center" }}>
        <History size={48} color={colors.textTertiary} />
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 16,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          No withdrawals yet.{"\n"}Your earnings will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {withdrawals.map((txn) => {
        const isWithdrawal =
          txn.type === "withdrawal" || txn.type === "p2p_transfer_out";
        const isCommission = txn.type === "creator_commission";
        return (
          <View
            key={txn.id}
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
                backgroundColor: isWithdrawal
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(212,175,55,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isWithdrawal ? (
                <Wallet size={20} color="#EF4444" />
              ) : (
                <DollarSign size={20} color="#D4AF37" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {isCommission
                  ? "Affiliate Commission"
                  : isWithdrawal
                    ? "Withdrawal"
                    : txn.type.replace(/_/g, " ")}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {txn.description || "—"} ·{" "}
                {new Date(txn.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    color: isWithdrawal ? "#EF4444" : "#D4AF37",
                    fontSize: 15,
                    fontWeight: "700",
                    marginRight: 2,
                  }}
                >
                  {isWithdrawal ? "-" : "+"}
                </Text>
                <CurrencyPrice
                  price={txn.amount}
                  originalCurrency={walletCurrency}
                  showOriginal={false}
                  size="small"
                  textStyle={{
                    color: isWithdrawal ? "#EF4444" : "#D4AF37",
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
                    txn.status === "completed"
                      ? "rgba(212,175,55,0.15)"
                      : "rgba(245,158,11,0.15)",
                }}
              >
                <Text
                  style={{
                    color: txn.status === "completed" ? "#D4AF37" : "#F59E0B",
                    fontSize: 11,
                    fontWeight: "600",
                  }}
                >
                  {txn.status}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
