// @ts-nocheck
import { View, Text } from "react-native";
import { CommissionSummaryCard, CommissionInfoBanner } from "./CommissionCards";
import { VideoBreakdownList } from "./VideoBreakdownList";
import { AllSalesList } from "./AllSalesList";

export function CommissionsTab({
  earnings,
  orders,
  videoBreakdown,
  formatCurrency,
  colors,
}) {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>
        Commission Breakdown
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 14,
          marginTop: -8,
        }}
      >
        See which videos are driving the most sales
      </Text>

      {/* Summary row */}
      <CommissionSummaryCard
        earnings={earnings}
        formatCurrency={formatCurrency}
        colors={colors}
      />

      {/* Commission rate info */}
      <CommissionInfoBanner colors={colors} />

      {/* Per-video breakdown */}
      <VideoBreakdownList
        videoBreakdown={videoBreakdown}
        earnings={earnings}
        formatCurrency={formatCurrency}
        colors={colors}
      />

      {/* All orders */}
      <AllSalesList
        orders={orders}
        formatCurrency={formatCurrency}
        colors={colors}
      />
    </View>
  );
}
