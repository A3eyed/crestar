// @ts-nocheck
import { View, Text, TextInput } from "react-native";

export function BasicInfoSection({
  title,
  setTitle,
  description,
  setDescription,
  category,
  setCategory,
  listingType,
  colors,
}) {
  return (
    <>
      {/* Title */}
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Title
      </Text>
      <TextInput
        placeholder={
          listingType === "food_beverage"
            ? "e.g. Jollof Rice with Grilled Chicken"
            : "e.g. Premium Wireless Headphones"
        }
        placeholderTextColor={colors.inputPlaceholder}
        value={title}
        onChangeText={setTitle}
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

      {/* Description */}
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Description
      </Text>
      <TextInput
        placeholder="Describe your product..."
        placeholderTextColor={colors.inputPlaceholder}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={{
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          padding: 16,
          color: colors.text,
          fontSize: 15,
          minHeight: 100,
          textAlignVertical: "top",
          marginBottom: 24,
        }}
      />

      {/* Category */}
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Category
      </Text>
      <TextInput
        placeholder={
          listingType === "food_beverage"
            ? "e.g. Main Dishes, Desserts, Drinks"
            : "e.g. Electronics, Clothing, Home"
        }
        placeholderTextColor={colors.inputPlaceholder}
        value={category}
        onChangeText={setCategory}
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
  );
}
