// @ts-nocheck
import { View, ScrollView, Dimensions } from "react-native";
import { Image } from "expo-image";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function ProductImageGallery({ images, onImageChange }) {
  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      onScroll={(e) => {
        const x = e.nativeEvent.contentOffset.x;
        onImageChange(Math.round(x / SCREEN_WIDTH));
      }}
      scrollEventThrottle={16}
    >
      {images.map((img, index) => (
        <Image
          key={index}
          source={{ uri: img }}
          style={{
            width: SCREEN_WIDTH,
            height: SCREEN_WIDTH * 1.2,
          }}
          contentFit="cover"
        />
      ))}
    </ScrollView>
  );
}
