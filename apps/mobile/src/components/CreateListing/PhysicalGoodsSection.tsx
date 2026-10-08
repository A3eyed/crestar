// @ts-nocheck
import { View, Text, TextInput, Switch } from "react-native";
import { Package } from "lucide-react-native";

export function PhysicalGoodsSection({
  stockQuantity,
  setStockQuantity,
  weight,
  setWeight,
  isWholesale,
  setIsWholesale,
  wholesaleMin,
  setWholesaleMin,
  colors,
}) {
  return (
    <>
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Stock Quantity
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 16,
          marginBottom: 24,
        }}
      >
        <Package size={20} color={colors.textTertiary} />
        <TextInput
          placeholder="How many do you have?"
          placeholderTextColor={colors.inputPlaceholder}
          value={stockQuantity}
          onChangeText={setStockQuantity}
          keyboardType="number-pad"
          style={{
            flex: 1,
            padding: 16,
            color: colors.text,
            fontSize: 15,
          }}
        />
      </View>

      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Weight (kg)
      </Text>
      <TextInput
        placeholder="For delivery calculation"
        placeholderTextColor={colors.inputPlaceholder}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        style={{
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          padding: 16,
          color: colors.text,
          fontSize: 15,
          marginBottom: 24,
        }}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 15,
            fontWeight: "600",
          }}
        >
          Wholesale Only
        </Text>
        <Switch
          value={isWholesale}
          onValueChange={setIsWholesale}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor="#FFFFFF"
        />
      </View>

      {isWholesale && (
        <>
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "700",
              marginBottom: 12,
            }}
          >
            Minimum Order Quantity
          </Text>
          <TextInput
            placeholder="e.g. 10"
            placeholderTextColor={colors.inputPlaceholder}
            value={wholesaleMin}
            onChangeText={setWholesaleMin}
            keyboardType="number-pad"
            style={{
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 12,
              padding: 16,
              color: colors.text,
              fontSize: 15,
              marginBottom: 24,
            }}
          />
        </>
      )}
    </>
  );
}
