// @ts-nocheck
import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import useCartStore from "../utils/cartStore";
import useLocalization from "../utils/localization";
import { useTheme } from "../utils/theme";
import CurrencyPrice from "../components/CurrencyPrice";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { formatCurrency, t } = useLocalization();
  const colors = useTheme();
  const { items, totalPrice, removeItem, updateQuantity, clearCart, loadCart } =
    useCartStore();

  useEffect(() => {
    loadCart();
  }, []);

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert(t("emptyCart"), t("emptyCart"));
      return;
    }
    router.push("/checkout");
  };

  const handleClearCart = () => {
    Alert.alert(t("clear"), t("emptyCart") + "?", [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("clear"),
        style: "destructive",
        onPress: () => clearCart(),
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
            {t("cart")} ({items.length})
          </Text>
        </View>

        {items.length > 0 && (
          <TouchableOpacity onPress={handleClearCart}>
            <Text
              style={{ color: colors.error, fontSize: 15, fontWeight: "600" }}
            >
              {t("clear")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <ShoppingBag size={80} color={colors.textTertiary} />
          <Text
            style={{
              color: colors.text,
              fontSize: 22,
              fontWeight: "700",
              marginTop: 24,
              marginBottom: 12,
            }}
          >
            {t("emptyCart")}
          </Text>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 15,
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            {t("startShopping")}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/shop")}
            style={{
              backgroundColor: colors.text,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 32,
            }}
          >
            <Text
              style={{
                color: colors.background,
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              {t("shopNow")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{
              padding: 20,
              paddingBottom: insets.bottom + 140,
            }}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => {
              const itemKey = item.cartKey || item.id;
              return (
                <View
                  key={itemKey}
                  style={{
                    marginBottom: 16,
                    overflow: "hidden",
                    borderRadius: 12,
                  }}
                >
                  <View
                    style={{
                      padding: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.cardBackground,
                      borderRadius: 12,
                    }}
                  >
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <Image
                        source={{ uri: item.image }}
                        style={{
                          width: 90,
                          height: 90,
                          borderRadius: 8,
                        }}
                        contentFit="cover"
                      />

                      <View
                        style={{ flex: 1, justifyContent: "space-between" }}
                      >
                        <View>
                          <Text
                            style={{
                              color: colors.text,
                              fontSize: 16,
                              fontWeight: "600",
                              marginBottom: 4,
                            }}
                          >
                            {item.name}
                          </Text>
                          {item.seller && (
                            <Text
                              style={{
                                color: colors.textTertiary,
                                fontSize: 13,
                                marginBottom: 4,
                              }}
                            >
                              {item.seller}
                            </Text>
                          )}
                          {(item.selectedColor || item.selectedSize) && (
                            <Text
                              style={{
                                color: colors.textSecondary,
                                fontSize: 12,
                                marginBottom: 6,
                              }}
                            >
                              {[item.selectedColor, item.selectedSize]
                                .filter(Boolean)
                                .join(" · ")}
                            </Text>
                          )}
                          <CurrencyPrice
                            price={item.price * item.quantity}
                            originalCurrency={item.seller_currency || "GHS"}
                            size="medium"
                            textStyle={{
                              color: colors.text,
                              fontSize: 18,
                              fontWeight: "700",
                            }}
                          />
                        </View>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: 8,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <TouchableOpacity
                              onPress={() =>
                                updateQuantity(
                                  itemKey,
                                  Math.max(1, item.quantity - 1),
                                )
                              }
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: colors.inputBackground,
                                borderWidth: 1,
                                borderColor: colors.border,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Minus size={16} color={colors.text} />
                            </TouchableOpacity>

                            <Text
                              style={{
                                color: colors.text,
                                fontSize: 16,
                                fontWeight: "700",
                                minWidth: 28,
                                textAlign: "center",
                              }}
                            >
                              {item.quantity}
                            </Text>

                            <TouchableOpacity
                              onPress={() =>
                                updateQuantity(itemKey, item.quantity + 1)
                              }
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: colors.inputBackground,
                                borderWidth: 1,
                                borderColor: colors.border,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Plus size={16} color={colors.text} />
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity
                            onPress={() => removeItem(itemKey)}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              backgroundColor: "rgba(239, 68, 68, 0.15)",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Trash2 size={18} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Bottom Checkout Bar */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 16,
              paddingBottom: insets.bottom + 16,
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
                {t("total")} ({items.length})
              </Text>
              <CurrencyPrice
                price={totalPrice}
                originalCurrency={items[0]?.seller_currency || "GHS"}
                size="large"
                textStyle={{
                  color: colors.text,
                  fontSize: 22,
                  fontWeight: "700",
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleCheckout}
              style={{
                backgroundColor: colors.text,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <ShoppingBag size={20} color={colors.background} />
              <Text
                style={{
                  color: colors.background,
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                {t("checkout")}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
