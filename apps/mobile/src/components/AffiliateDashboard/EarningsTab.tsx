// @ts-nocheck
import { View, Text } from "react-native";
import { EarningsHeroCard } from "./EarningsHeroCard";
import { StatCard } from "./StatCard";
import { NotificationBanner } from "./NotificationBanner";
import { ShowcaseShareCard } from "./ShowcaseShareCard";
import { RecentSalesList } from "./RecentSalesList";
import { EmptySalesState } from "./EmptySalesState";
import { ShoppingBag, Video, TrendingUp } from "lucide-react-native";

export function EarningsTab({
  earnings,
  orders,
  videoBreakdown,
  notifPermission,
  showcaseLink,
  formatCurrency,
  colors,
  onCashOut,
  onRequestPermission,
  onCopyLink,
  onShareShowcase,
  onCreateVideo,
}) {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      {/* Hero earnings card */}
      <EarningsHeroCard
        earnings={earnings}
        formatCurrency={formatCurrency}
        colors={colors}
        onCashOut={onCashOut}
      />

      {/* Stats row */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard
          icon={ShoppingBag}
          label="Sales Driven"
          value={orders.length.toString()}
          color="#D4AF37"
          colors={colors}
        />
        <StatCard
          icon={Video}
          label="Videos w/ Sales"
          value={videoBreakdown.length.toString()}
          color="#D4AF37"
          colors={colors}
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Commission"
          value={
            orders.length > 0
              ? formatCurrency((earnings.totalEarned || 0) / orders.length)
              : "GHS 0"
          }
          color="#D4AF37"
          colors={colors}
        />
      </View>

      {/* Notification enable banner */}
      <NotificationBanner
        notifPermission={notifPermission}
        onRequestPermission={onRequestPermission}
        colors={colors}
      />

      {/* Showcase share card */}
      <ShowcaseShareCard
        showcaseLink={showcaseLink}
        onCopy={onCopyLink}
        onShare={onShareShowcase}
        colors={colors}
      />

      {/* Recent sales */}
      <RecentSalesList
        orders={orders}
        formatCurrency={formatCurrency}
        colors={colors}
      />

      {/* Empty state */}
      {orders.length === 0 && (
        <EmptySalesState colors={colors} onCreateVideo={onCreateVideo} />
      )}
    </View>
  );
}
