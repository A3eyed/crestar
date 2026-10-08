// @ts-nocheck
import { View } from "react-native";
import { WithdrawalHeader } from "./WithdrawalHeader";
import { BalanceCard } from "./BalanceCard";
import { WithdrawalList } from "./WithdrawalList";

export function WithdrawalsTab({
  earnings,
  withdrawals,
  formatCurrency,
  colors,
  onCashOut,
}) {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      <WithdrawalHeader colors={colors} onCashOut={onCashOut} />

      {/* Current balance */}
      <BalanceCard
        earnings={earnings}
        formatCurrency={formatCurrency}
        colors={colors}
        onWithdraw={onCashOut}
      />

      {/* Withdrawal list */}
      <WithdrawalList
        withdrawals={withdrawals}
        formatCurrency={formatCurrency}
        colors={colors}
      />
    </View>
  );
}
