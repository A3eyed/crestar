// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import CurrencyPrice from "../CurrencyPrice";

export function BalanceCard({ earnings, formatCurrency, colors, onWithdraw }) {
  const walletCurrency = "GHS";

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 13,
            marginBottom: 4,
          }}
        >
          Wallet Balance
        </Text>
        <CurrencyPrice
          price={earnings.currentBalance || 0}
          originalCurrency={walletCurrency}
          size="large"
          textStyle={{
            color: colors.text,
            fontSize: 28,
            fontWeight: "800",
          }}
        />
        {earnings.pendingBalance > 0 && (
          <View
            style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}
          >
            <Text style={{ color: "#F59E0B", fontSize: 12, marginRight: 2 }}>
              +{" "}
            </Text>
            <CurrencyPrice
              price={earnings.pendingBalance}
              originalCurrency={walletCurrency}
              showOriginal={false}
              size="small"
              textStyle={{
                color: "#F59E0B",
                fontSize: 12,
              }}
            />
            <Text style={{ color: "#F59E0B", fontSize: 12, marginLeft: 2 }}>
              {" "}
              pending
            </Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        onPress={onWithdraw}
        style={{
          backgroundColor: colors.text,
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            color: colors.background,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          Withdraw
        </Text>
      </TouchableOpacity>
    </View>
  );
}
