// @ts-nocheck
import { View, Text, TouchableOpacity, Platform } from "react-native";
import {
  Eye,
  EyeOff,
  Wallet as WalletIcon,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react-native";
import CurrencyPrice from "../CurrencyPrice";
import { PLATFORM_FEE_PERCENT } from "@/utils/platformFee";

const feePercent =
  PLATFORM_FEE_PERCENT > 1
    ? PLATFORM_FEE_PERCENT
    : Math.round(PLATFORM_FEE_PERCENT * 100);

export function BalanceCard({
  colors,
  balance,
  walletData,
  walletVisible,
  onToggleVisibility,
  onWithdraw,
  canWithdraw = true,
  isEarningsWallet = false,
}) {
  const actualBalance =
    walletData?.actualBalance ?? walletData?.actual_balance ?? balance ?? 0;
  const pendingBalance = Number(
    walletData?.pendingBalance ?? walletData?.pending_balance ?? 0
  );
  const walletCurrency = walletData?.currency || "GHS";
  const ink = isEarningsWallet ? "#1A1A1A" : "#FFFFFF";
  const muted = isEarningsWallet
    ? "rgba(0,0,0,0.62)"
    : "rgba(255,255,255,0.65)";

  return (
    <View style={{ marginBottom: 28 }}>
      <View
        style={{
          backgroundColor: isEarningsWallet ? "#D4AF37" : "#1C1C1E",
          borderRadius: 20,
          padding: 24,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
            },
            android: { elevation: 10 },
          }),
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: isEarningsWallet ? "#1A1A1A" : "#D4AF37",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              {isEarningsWallet ? (
                <TrendingUp size={18} color="#D4AF37" strokeWidth={2.5} />
              ) : (
                <WalletIcon size={18} color="#FFFFFF" strokeWidth={2.5} />
              )}
            </View>
            <Text style={{ color: ink, fontSize: 17, fontWeight: "600" }}>
              {isEarningsWallet ? "Earnings" : "Wallet"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onToggleVisibility}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: isEarningsWallet
                ? "rgba(0,0,0,0.08)"
                : "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {walletVisible ? (
              <EyeOff size={16} color={ink} />
            ) : (
              <Eye size={16} color={ink} />
            )}
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: pendingBalance > 0 ? 4 : 28 }}>
          <Text
            style={{
              color: muted,
              fontSize: 13,
              fontWeight: "500",
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            {isEarningsWallet ? "Available to cash out" : "Available balance"}
          </Text>
          {walletVisible ? (
            <CurrencyPrice
              price={actualBalance}
              originalCurrency={walletCurrency}
              showOriginal={false}
              size="xlarge"
              textStyle={{ color: ink, fontSize: 36, fontWeight: "700" }}
            />
          ) : (
            <Text style={{ color: ink, fontSize: 36, fontWeight: "700" }}>
              ••••••
            </Text>
          )}
        </View>

        {pendingBalance > 0 && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 24,
              marginTop: 4,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#7A4E00",
                marginRight: 8,
              }}
            />
            {walletVisible ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <CurrencyPrice
                  price={pendingBalance}
                  originalCurrency={walletCurrency}
                  showOriginal={false}
                  size="small"
                  textStyle={{ color: muted, fontSize: 14, fontWeight: "500" }}
                />
                <Text style={{ color: muted, fontSize: 14, marginLeft: 4 }}>
                  pending delivery PIN
                </Text>
              </View>
            ) : (
              <Text style={{ color: muted, fontSize: 14 }}>
                •••••• pending delivery PIN
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          onPress={onWithdraw}
          disabled={!canWithdraw}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: canWithdraw
              ? "rgba(0,0,0,0.88)"
              : "rgba(0,0,0,0.25)",
            borderRadius: 14,
            paddingVertical: 15,
            gap: 8,
          }}
        >
          <ArrowUpRight size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
            {canWithdraw ? "Cash out" : "Cash out locked"}
          </Text>
        </TouchableOpacity>
        <Text
          style={{
            color: muted,
            fontSize: 12,
            lineHeight: 16,
            textAlign: "center",
            marginTop: 12,
          }}
        >
          Crestar’s {feePercent}% fee is already removed. This is what you keep.
        </Text>
      </View>
    </View>
  );
}