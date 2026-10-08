// @ts-nocheck
import { View } from "react-native";

export function ImageIndicators({ images, selectedIndex, colors }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 16,
      }}
    >
      {images.map((_, index) => (
        <View
          key={index}
          style={{
            width: selectedIndex === index ? 24 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor:
              selectedIndex === index ? "#D4AF37" : colors.textTertiary,
          }}
        />
      ))}
    </View>
  );
}
