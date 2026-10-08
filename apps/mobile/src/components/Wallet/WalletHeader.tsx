// @ts-nocheck
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { ChevronLeft } from "lucide-react-native";

export function WalletHeader({ colors, insets, onBack, title = "Wallet" }) {
  const top = insets?.top || 0;
  return (
    <View
      style={{
        paddingTop: top + 8,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: colors.background,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          height: 44,
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.cardBackground,
            alignItems: "center",
            justifyContent: "center",
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
              },
              android: { elevation: 1 },
            }),
          }}
        >
          <ChevronLeft size={20} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <View style={{ width: 44 }} />
      </View>
    </View>
  );
}