// @ts-nocheck
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { VEHICLE_TYPES } from "@/constants/vehicleTypes";

export function VehicleTypeSelector({
  selectedValue,
  onSelect,
  selectedColor,
  colors,
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 15,
          fontWeight: "600",
          marginBottom: 8,
        }}
      >
        Vehicle Type <Text style={{ color: "#D4AF37" }}>*</Text>
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
      >
        <View style={{ flexDirection: "row", gap: 8 }}>
          {VEHICLE_TYPES.map((type) => {
            const isSelected = selectedValue === type.value;
            return (
              <TouchableOpacity
                key={type.value}
                onPress={() => onSelect(type.value)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: isSelected ? selectedColor : colors.border,
                  backgroundColor: isSelected
                    ? selectedColor + "15"
                    : colors.cardBackground,
                  minWidth: 80,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: isSelected ? selectedColor : colors.text,
                    fontSize: 14,
                    fontWeight: isSelected ? "600" : "400",
                  }}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
