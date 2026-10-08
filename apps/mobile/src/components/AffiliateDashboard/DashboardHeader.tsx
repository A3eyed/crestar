// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { ArrowLeft, Wallet } from "lucide-react-native";

export function DashboardHeader({
  insets,
  colors,
  username,
  onBack,
  onWalletPress,
}) {
  return (
    <View
      style={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <TouchableOpacity onPress={onBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
            Creator Dashboard
          </Text>
          <Text style={{ color: "#D4AF37", fontSize: 12, fontWeight: "600" }}>
            @{username}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onWalletPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: "#D4AF37",
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
        }}
      >
        <Wallet size={16} color="#FFFFFF" />
        <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>
          Wallet
        </Text>
      </TouchableOpacity>
    </View>
  );
}
