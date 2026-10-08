// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";

export function WithdrawalHeader({ colors, onCashOut }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>
        Withdrawal History
      </Text>
      <TouchableOpacity
        onPress={onCashOut}
        style={{
          backgroundColor: "#D4AF37",
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>
          Cash Out
        </Text>
      </TouchableOpacity>
    </View>
  );
}
