// @ts-nocheck
import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal } from "react-native";
import { X, Minus, Plus, ShoppingCart } from "lucide-react-native";
import { Image } from "expo-image";

const ICE_OPTIONS = [
  { id: "no", label: "No Ice" },
  { id: "less", label: "Less" },
  { id: "regular", label: "Regular" },
  { id: "extra", label: "Extra" },
];

const SUGAR_OPTIONS = [
  { id: "0", label: "0%" },
  { id: "25", label: "25%" },
  { id: "50", label: "50%" },
  { id: "75", label: "75%" },
  { id: "100", label: "100%" },
];

const TOPPINGS = [
  { id: "boba", label: "Boba Pearls", price: 3 },
  { id: "jelly", label: "Coconut Jelly", price: 2 },
  { id: "cream", label: "Whipped Cream", price: 2 },
  { id: "shot", label: "Extra Shot", price: 3 },
];

export default function DrinkCustomizeModal({
  visible,
  drink,
  onClose,
  onAddToCart,
  formatCurrency,
}) {
  const [selectedSize, setSelectedSize] = useState(1);
  const [iceLevel, setIceLevel] = useState("regular");
  const [sugarLevel, setSugarLevel] = useState("100");
  const [quantity, setQuantity] = useState(1);
  const [selectedToppings, setSelectedToppings] = useState([]);

  const sizes = drink?.sizes || [
    { label: "S", price: drink?.price ? drink.price - 3 : 10 },
    { label: "M", price: drink?.price || 15 },
    { label: "L", price: drink?.price ? drink.price + 5 : 20 },
  ];

  const toggleTopping = (toppingId) => {
    setSelectedToppings((prev) =>
      prev.includes(toppingId)
        ? prev.filter((t) => t !== toppingId)
        : [...prev, toppingId],
    );
  };

  const basePrice = sizes[selectedSize]?.price || drink?.price || 0;
  const toppingsPrice = selectedToppings.reduce((sum, tId) => {
    const topping = TOPPINGS.find((t) => t.id === tId);
    return sum + (topping?.price || 0);
  }, 0);
  const totalPrice = (basePrice + toppingsPrice) * quantity;

  if (!drink) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#1A1A1A",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "85%",
          }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 20,
                paddingBottom: 0,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "700" }}
              >
                Customize Drink
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 14, padding: 20 }}>
              <Image
                source={{ uri: drink.image }}
                style={{ width: 80, height: 80, borderRadius: 12 }}
                contentFit="cover"
              />
              <View style={{ flex: 1, justifyContent: "center" }}>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 17,
                    fontWeight: "700",
                    marginBottom: 4,
                  }}
                >
                  {drink.name}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                  {drink.restaurant}
                </Text>
              </View>
            </View>

            {/* Size */}
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: 12,
                }}
              >
                Size
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {sizes.map((size, idx) => {
                  const isSelected = selectedSize === idx;
                  return (
                    <TouchableOpacity
                      key={size.label}
                      onPress={() => setSelectedSize(idx)}
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        borderRadius: 12,
                        backgroundColor: isSelected
                          ? "rgba(255,255,255,0.18)"
                          : "rgba(255,255,255,0.08)",
                        borderWidth: 1,
                        borderColor: isSelected
                          ? "#FFFFFF"
                          : "rgba(255,255,255,0.15)",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 18,
                          fontWeight: "800",
                          marginBottom: 2,
                        }}
                      >
                        {size.label}
                      </Text>
                      <Text
                        style={{
                          color: isSelected
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(255,255,255,0.5)",
                          fontSize: 13,
                        }}
                      >
                        {formatCurrency(size.price)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Ice Level */}
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: 12,
                }}
              >
                🧊 Ice Level
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {ICE_OPTIONS.map((opt) => {
                  const isSelected = iceLevel === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => setIceLevel(opt.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: isSelected
                          ? "rgba(255,255,255,0.18)"
                          : "rgba(255,255,255,0.08)",
                        borderWidth: 1,
                        borderColor: isSelected
                          ? "#FFFFFF"
                          : "rgba(255,255,255,0.12)",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected
                            ? "#FFFFFF"
                            : "rgba(255,255,255,0.7)",
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sugar Level */}
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: 12,
                }}
              >
                🍯 Sugar Level
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {SUGAR_OPTIONS.map((opt) => {
                  const isSelected = sugarLevel === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => setSugarLevel(opt.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: isSelected
                          ? "rgba(255,255,255,0.18)"
                          : "rgba(255,255,255,0.08)",
                        borderWidth: 1,
                        borderColor: isSelected
                          ? "#FFFFFF"
                          : "rgba(255,255,255,0.12)",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected
                            ? "#FFFFFF"
                            : "rgba(255,255,255,0.7)",
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Toppings */}
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: 12,
                }}
              >
                Add-ons
              </Text>
              {TOPPINGS.map((topping) => {
                const isSelected = selectedToppings.includes(topping.id);
                return (
                  <TouchableOpacity
                    key={topping.id}
                    onPress={() => toggleTopping(topping.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      backgroundColor: isSelected
                        ? "rgba(255,255,255,0.12)"
                        : "transparent",
                      borderWidth: 1,
                      borderColor: isSelected
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(255,255,255,0.08)",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 15,
                        fontWeight: "500",
                      }}
                    >
                      {topping.label}
                    </Text>
                    <Text
                      style={{
                        color: isSelected ? "#FFFFFF" : "rgba(255,255,255,0.5)",
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      +{formatCurrency(topping.price)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Bottom bar */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "#1A1A1A",
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.1)",
              paddingTop: 12,
              paddingBottom: 28,
              paddingHorizontal: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <TouchableOpacity
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Minus size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 17,
                  fontWeight: "700",
                  minWidth: 24,
                  textAlign: "center",
                }}
              >
                {quantity}
              </Text>
              <TouchableOpacity
                onPress={() => setQuantity(quantity + 1)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                const sizeLabel = sizes[selectedSize]?.label || "M";
                onAddToCart({
                  ...drink,
                  name: `${drink.name} (${sizeLabel})`,
                  price: basePrice + toppingsPrice,
                  quantity,
                  customization: {
                    size: sizeLabel,
                    ice: iceLevel,
                    sugar: sugarLevel,
                    toppings: selectedToppings,
                  },
                });
                onClose();
              }}
              style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <ShoppingCart size={18} color="#000000" />
              <Text
                style={{ color: "#000000", fontSize: 16, fontWeight: "700" }}
              >
                Add • {formatCurrency(totalPrice)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
