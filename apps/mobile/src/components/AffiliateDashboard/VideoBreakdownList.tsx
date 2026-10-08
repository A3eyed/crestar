// @ts-nocheck
import { View, Text } from "react-native";
import { Video } from "lucide-react-native";
import CurrencyPrice from "../CurrencyPrice";

export function VideoBreakdownList({
  videoBreakdown,
  earnings,
  formatCurrency,
  colors,
}) {
  const commissionCurrency = "GHS";

  if (videoBreakdown.length === 0) {
    return (
      <View style={{ paddingVertical: 48, alignItems: "center" }}>
        <Video size={48} color={colors.textTertiary} />
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 16,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          No commissions yet. Post a shoppable video to start!
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontWeight: "700",
        }}
      >
        Top Performing Videos
      </Text>
      {videoBreakdown.map((v, index) => (
        <View
          key={v.videoId}
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#D4AF37" + "20",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "#D4AF37",
                  fontSize: 16,
                  fontWeight: "800",
                }}
              >
                #{index + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Video {v.videoId ? v.videoId.substring(0, 8) + "..." : "Direct"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {v.salesCount} {v.salesCount === 1 ? "sale" : "sales"} ·{" "}
                </Text>
                <CurrencyPrice
                  price={v.totalSalesValue}
                  originalCurrency={commissionCurrency}
                  showOriginal={false}
                  size="small"
                  textStyle={{
                    color: colors.textSecondary,
                    fontSize: 12,
                  }}
                />
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {" "}
                  GMV
                </Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    color: "#D4AF37",
                    fontSize: 16,
                    fontWeight: "700",
                    marginRight: 2,
                  }}
                >
                  +
                </Text>
                <CurrencyPrice
                  price={v.totalCommission}
                  originalCurrency={commissionCurrency}
                  showOriginal={false}
                  size="small"
                  textStyle={{
                    color: "#D4AF37",
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                />
              </View>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                earned
              </Text>
            </View>
          </View>

          {/* Mini progress bar */}
          <View
            style={{
              marginTop: 12,
              height: 4,
              backgroundColor: colors.cardBackgroundAlt,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 4,
                width: `${Math.min(100, (v.totalCommission / Math.max(earnings.totalEarned, 1)) * 100)}%`,
                backgroundColor: "#D4AF37",
                borderRadius: 2,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
