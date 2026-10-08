// @ts-nocheck
import { View, Text, ScrollView, TouchableOpacity } from "react-native";

export default function CategoryFilter({
  categories,
  selectedCategory,
  onCategorySelect,
  colors,
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -16, flexGrow: 0 }}
    >
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16 }}>
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onCategorySelect(cat.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: isSelected
                  ? colors.text
                  : colors.cardBackground,
                borderWidth: 1,
                borderColor: isSelected ? colors.text : colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
              <Text
                style={{
                  color: isSelected ? colors.background : colors.text,
                  fontSize: 13,
                  fontWeight: isSelected ? "700" : "500",
                }}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
