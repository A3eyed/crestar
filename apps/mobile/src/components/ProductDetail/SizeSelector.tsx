// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { Info } from "lucide-react-native";

export function SizeSelector({
  colors,
  availableSizes,
  selectedSize,
  onSizeSelect,
  onShowSizeGuide,
}) {
  if (availableSizes.length === 0) return null;

  return (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "700",
          }}
        >
          Size: {selectedSize || "Select"}
        </Text>
        <TouchableOpacity
          onPress={onShowSizeGuide}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: "rgba(212, 175, 55, 0.1)",
            borderWidth: 1,
            borderColor: "rgba(212, 175, 55, 0.2)",
          }}
        >
          <Info size={14} color="#D4AF37" />
          <Text
            style={{
              color: "#D4AF37",
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            Size Guide
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {availableSizes.map((size) => (
          <TouchableOpacity
            key={size}
            onPress={() => onSizeSelect(size)}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor:
                selectedSize === size ? "#D4AF37" : colors.cardBackground,
              borderWidth: 2,
              borderColor: selectedSize === size ? "#D4AF37" : colors.border,
              minWidth: 60,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: selectedSize === size ? "#FFFFFF" : colors.text,
                fontSize: 15,
                fontWeight: selectedSize === size ? "700" : "500",
              }}
            >
              {size}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
