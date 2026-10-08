// @ts-nocheck
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import useLocalization from "@/utils/localization";

export function TaggedProductsList({ products, onRemoveProduct }) {
  const { formatCurrency } = useLocalization();

  if (products.length === 0) {
    return null;
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 14,
          fontWeight: "600",
          marginBottom: 8,
        }}
      >
        Tagged Products ({products.length})
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
      >
        <View style={{ flexDirection: "row", gap: 8 }}>
          {products.map((product) => (
            <View
              key={product.id}
              style={{
                overflow: "hidden",
                borderRadius: 12,
                minWidth: 140,
              }}
            >
              <BlurView
                intensity={80}
                tint="dark"
                style={{
                  padding: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Image
                    source={{ uri: product.image }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 6,
                    }}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                      numberOfLines={1}
                    >
                      {product.name}
                    </Text>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      {formatCurrency(product.price)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onRemoveProduct(product.id)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "rgba(239, 68, 68, 0.8)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trash2 size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
