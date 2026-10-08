// @ts-nocheck
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Image } from "expo-image";

export default function PopularDrinks({
  drinks,
  colors,
  formatCurrency,
  onDrinkPress,
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 16,
          marginBottom: 14,
        }}
      >
        <Text style={{ fontSize: 20 }}>🔥</Text>
        <Text style={{ color: colors.text, fontSize: 19, fontWeight: "700" }}>
          Popular Drinks
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
      >
        <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16 }}>
          {drinks.map((drink) => (
            <TouchableOpacity
              key={drink.id}
              onPress={() => onDrinkPress(drink)}
              style={{
                width: 150,
                borderRadius: 14,
                overflow: "hidden",
                backgroundColor: colors.cardBackground,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Image
                source={{ uri: drink.image }}
                style={{ width: 150, height: 120 }}
                contentFit="cover"
              />
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  flexDirection: "row",
                  gap: 3,
                }}
              >
                {drink.sizes.map((s) => (
                  <View
                    key={s.label}
                    style={{
                      backgroundColor: "rgba(0,0,0,0.6)",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{ color: "#FFF", fontSize: 10, fontWeight: "600" }}
                    >
                      {s.label}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ padding: 10 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                  numberOfLines={1}
                >
                  {drink.name}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {drink.restaurant}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 6,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    From {formatCurrency(drink.sizes[0].price)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
