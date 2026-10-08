// @ts-nocheck
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Flame, Plus } from "lucide-react-native";
import { Image } from "expo-image";

export default function TodaysSpecials({
  specials,
  colors,
  formatCurrency,
  onItemPress,
  onQuickAdd,
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Flame size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: "700" }}>
            Today's Specials
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
      >
        <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16 }}>
          {specials.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => onItemPress(item.restaurantId)}
              style={{
                width: 160,
                borderRadius: 14,
                overflow: "hidden",
                backgroundColor: colors.cardBackground,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ position: "relative" }}>
                <Image
                  source={{ uri: item.image }}
                  style={{ width: 160, height: 120 }}
                  contentFit="cover"
                />
                {/* Discount badge */}
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    backgroundColor: colors.text,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color: colors.background,
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    {Math.round(
                      ((item.originalPrice - item.price) / item.originalPrice) *
                        100,
                    )}
                    % OFF
                  </Text>
                </View>
                {/* Quick add */}
                <TouchableOpacity
                  onPress={() => onQuickAdd(item)}
                  style={{
                    position: "absolute",
                    bottom: 8,
                    right: 8,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.text,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={18} color={colors.background} />
                </TouchableOpacity>
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
                  {item.name}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {item.restaurant}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 6,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    {formatCurrency(item.price)}
                  </Text>
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 12,
                      textDecorationLine: "line-through",
                    }}
                  >
                    {formatCurrency(item.originalPrice)}
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
