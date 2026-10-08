// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";

export function IdTypeSelector({
  idTypes,
  selectedIdType,
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
        Select ID Type <Text style={{ color: "#D4AF37" }}>*</Text>
      </Text>
      <View style={{ gap: 8 }}>
        {idTypes.map((idType) => {
          const isSelected = selectedIdType === idType.code;
          return (
            <TouchableOpacity
              key={idType.code}
              onPress={() => onSelect(idType.code)}
              style={{
                padding: 14,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: isSelected ? selectedColor : colors.border,
                backgroundColor: isSelected
                  ? selectedColor + "15"
                  : colors.cardBackground,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: isSelected ? selectedColor : colors.textTertiary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  backgroundColor: isSelected ? selectedColor : "transparent",
                }}
              >
                {isSelected && (
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    ✓
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: "500",
                  }}
                >
                  {idType.name}
                </Text>
                {idType.primary && (
                  <Text
                    style={{
                      color: selectedColor,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Recommended
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
