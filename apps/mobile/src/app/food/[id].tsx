// @ts-nocheck
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  Star,
  Clock,
  MapPin,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  X,
  Leaf,
  MessageSquare,
} from "lucide-react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import useAuth from "../../utils/auth/useAuth";
import useLocalization from "../../utils/localization";
import useCartStore from "../../utils/cartStore";
import { useTheme } from "../../utils/theme";
import { authenticatedFetch } from "../../utils/authenticatedFetch";
import CurrencyPrice from "../../components/CurrencyPrice";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function ItemCustomizePanel({
  item,
  onClose,
  onAddToCart,
  formatCurrency,
  colors,
  currency = "GHS",
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [spiceLevel, setSpiceLevel] = useState(item?.spicyLevel || 0);
  const [specialInstructions, setSpecialInstructions] = useState("");

  if (!item) return null;

  const toggleAddOn = (id) =>
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const addOns = item.addOns || [];
  const addOnsTotal = selectedAddOns.reduce((sum, aId) => {
    const a = addOns.find((x) => x.id === aId);
    return sum + (a?.price || 0);
  }, 0);
  const itemTotal = (item.price + addOnsTotal) * quantity;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "75%",
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 20,
          }}
        >
          <Image
            source={{ uri: item.image }}
            style={{ width: 70, height: 70, borderRadius: 12 }}
            contentFit="cover"
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              {item.name}
            </Text>
            <CurrencyPrice
              price={item.price}
              originalCurrency={currency}
              size="medium"
              textStyle={{
                color: colors.text,
                fontSize: 20,
                fontWeight: "700",
              }}
            />
            {item.dietaryTags && item.dietaryTags.length > 0 ? (
              <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                {item.dietaryTags.map((tag) => (
                  <View
                    key={tag}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      backgroundColor: "rgba(212,175,55,0.1)",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Leaf size={10} color="#D4AF37" />
                    <Text
                      style={{
                        color: "#D4AF37",
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    >
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.inputBackground,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Spice Level */}
        {item.spicyLevel !== undefined && item.spicyLevel > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                fontWeight: "700",
                marginBottom: 10,
              }}
            >
              🌶️ Spice Level
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0, 1, 2, 3, 4, 5].map((level) => {
                const isSelected = spiceLevel === level;
                return (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setSpiceLevel(level)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: isSelected
                        ? level === 0
                          ? "rgba(212,175,55,0.2)"
                          : "rgba(245,158,11,0.2)"
                        : colors.inputBackground,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? level === 0
                          ? "#D4AF37"
                          : "#F59E0B"
                        : colors.inputBorder,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>
                      {level === 0 ? "None" : "🌶️".repeat(level)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Add-ons */}
        {addOns.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                fontWeight: "700",
                marginBottom: 10,
              }}
            >
              Add Extras
            </Text>
            {addOns.map((addon) => {
              const isSelected = selectedAddOns.includes(addon.id);
              return (
                <TouchableOpacity
                  key={addon.id}
                  onPress={() => toggleAddOn(addon.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    backgroundColor: isSelected
                      ? colors.cardBackground
                      : "transparent",
                    borderWidth: 1,
                    borderColor: isSelected ? colors.text : colors.inputBorder,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: isSelected
                          ? colors.text
                          : colors.textTertiary,
                        backgroundColor: isSelected
                          ? colors.text
                          : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected && (
                        <Text
                          style={{
                            color: colors.background,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 15,
                        fontWeight: "500",
                      }}
                    >
                      {addon.name}
                    </Text>
                  </View>
                  <CurrencyPrice
                    price={addon.price}
                    originalCurrency={currency}
                    showOriginal={false}
                    size="small"
                    textStyle={{
                      color: isSelected ? colors.text : colors.textSecondary,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Special Instructions */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 10,
            }}
          >
            <MessageSquare size={16} color={colors.text} />
            <Text
              style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}
            >
              Special Instructions
            </Text>
          </View>
          <TextInput
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            placeholder="e.g., No onions, extra sauce, allergies..."
            placeholderTextColor={colors.inputPlaceholder}
            multiline
            numberOfLines={2}
            style={{
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 12,
              padding: 12,
              color: colors.text,
              fontSize: 14,
              minHeight: 60,
              textAlignVertical: "top",
            }}
          />
        </View>
      </ScrollView>

      {/* Bottom action */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 12,
          paddingBottom: 28,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Minus size={18} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "700",
              minWidth: 28,
              textAlign: "center",
            }}
          >
            {quantity}
          </Text>
          <TouchableOpacity
            onPress={() => setQuantity(quantity + 1)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => {
            const addOnNames = selectedAddOns
              .map((aId) => addOns.find((a) => a.id === aId)?.name)
              .filter(Boolean);
            onAddToCart({
              ...item,
              quantity,
              addOnsTotal,
              selectedAddOns: addOnNames,
              spiceLevel,
              specialInstructions,
              totalPrice: itemTotal,
            });
          }}
          style={{
            flex: 1,
            backgroundColor: colors.text,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <ShoppingCart size={18} color={colors.background} />
          <Text
            style={{
              color: colors.background,
              fontSize: 16,
              fontWeight: "700",
              marginRight: 4,
            }}
          >
            Add •{" "}
          </Text>
          <CurrencyPrice
            price={itemTotal}
            originalCurrency={currency}
            showOriginal={false}
            size="small"
            textStyle={{
              color: colors.background,
              fontSize: 16,
              fontWeight: "700",
            }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FoodDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { formatCurrency } = useLocalization();
  const { isAuthenticated, signIn } = useAuth();
  const { addItem, totalItems, totalPrice } = useCartStore();
  const colors = useTheme();

  const [selectedItem, setSelectedItem] = useState(null);
  const [liked, setLiked] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Popular");
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(["Popular"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRestaurantData();
  }, [id]);

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      const sellerResponse = await authenticatedFetch(`/api/sellers/${id}`);
      if (!sellerResponse.ok) throw new Error("Restaurant not found");
      const sellerData = await sellerResponse.json();
      const sellerProfile = sellerData.profile || sellerData.seller || {};

      const productsResponse = await authenticatedFetch(
        `/api/listings/products?sellerId=${id}&productType=food_beverage`,
      );
      if (!productsResponse.ok) throw new Error("Failed to fetch menu");
      const productsData = await productsResponse.json();

      setRestaurant({
        name:
          sellerProfile.business_name ||
          sellerProfile.display_name ||
          sellerProfile.username ||
          "Restaurant",
        cuisine: "Local Dishes",
        rating: sellerProfile.stats?.rating || 4.8,
        reviews: sellerProfile.stats?.sales || 0,
        deliveryTime: "20-30 min",
        deliveryFee: 0,
        image:
          sellerProfile.profile_image ||
          "https://picsum.photos/400/300?random=" + id,
        address: `${sellerProfile.city || "Accra"}, ${sellerProfile.country || "Ghana"}`,
        currency: sellerProfile.default_currency || "GHS",
      });

      const items = productsData.products.map((p) => {
        let media = [];
        if (Array.isArray(p.media)) {
          media = p.media;
        } else if (typeof p.media === "string") {
          try {
            media = JSON.parse(p.media);
          } catch (_) {
            media = [];
          }
        }
        return {
          id: p.id,
          name: p.title,
          description: p.description || "",
          price: parseFloat(p.price),
          image: media[0] || "https://picsum.photos/400/300?random=" + p.id,
          category: p.category || "Main Course",
          spicyLevel: p.spicy_level || 0,
          prepTime: p.prep_time_minutes || 20,
          popular: p.is_todays_special || false,
          dietaryTags: p.dietary_tags || [],
          addOns: p.add_ons || [],
        };
      });

      setMenuItems(items);
      const uniqueCategories = [
        "Popular",
        ...new Set(items.map((i) => i.category).filter(Boolean)),
      ];
      setCategories(uniqueCategories);
    } catch (err) {
      console.error("Restaurant fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show popular items if any exist, otherwise show all items
  const popularItems = menuItems.filter((i) => i.popular);
  const filteredMenu =
    activeCategory === "Popular"
      ? popularItems.length > 0
        ? popularItems
        : menuItems
      : menuItems.filter((i) => i.category === activeCategory);

  const restaurantCurrency = restaurant?.currency || "GHS";

  const formatItemPrice = (item) => formatCurrency(item.price, "GHS");

  const handleAddToCart = async (customizedItem) => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    if (!restaurant) {
      Alert.alert("Error", "Restaurant data not loaded yet");
      return;
    }
    const addOnLabel =
      customizedItem.selectedAddOns?.length > 0
        ? ` + ${customizedItem.selectedAddOns.join(", ")}`
        : "";
    try {
      await addItem(
        {
          id: customizedItem.id + "_" + Date.now(),
          name: customizedItem.name + addOnLabel,
          price: customizedItem.price + (customizedItem.addOnsTotal || 0),
          sellerCurrency: "GHS",
          image: customizedItem.image,
          seller: restaurant.name,
          sellerId: id,
          type: "food",
          specialInstructions: customizedItem.specialInstructions,
        },
        customizedItem.quantity || 1,
      );
      setSelectedItem(null);
    } catch (err) {
      console.error("Add to cart error:", err);
      Alert.alert("Error", "Could not add item to cart. Please try again.");
    }
  };

  const handleQuickAdd = async (item) => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    if (!restaurant) {
      Alert.alert("Error", "Restaurant data not loaded yet");
      return;
    }
    try {
      await addItem(
        {
          id: item.id,
          name: item.name,
          price: item.price,
          sellerCurrency: "GHS",
          image: item.image,
          seller: restaurant.name,
          sellerId: id,
          type: "food",
        },
        1,
      );
      Alert.alert("Added!", `${item.name} added to cart`);
    } catch (err) {
      console.error("Quick add error:", err);
      Alert.alert("Error", "Could not add item to cart. Please try again.");
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <StatusBar style={colors.statusBar} />
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (error || !restaurant) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={colors.statusBar} />
        <View
          style={{
            position: "absolute",
            top: insets.top + 12,
            left: 16,
            zIndex: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(0,0,0,0.7)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            Restaurant Not Found
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              textAlign: "center",
            }}
          >
            This restaurant may not be available right now
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />

      {/* Header buttons */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 16,
          right: 16,
          zIndex: 10,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(0,0,0,0.7)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setLiked(!liked)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(0,0,0,0.7)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Heart
            size={22}
            color="#FFFFFF"
            fill={liked ? "#FFFFFF" : "transparent"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + (totalItems > 0 ? 150 : 100),
        }}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={{ uri: restaurant.image }}
          style={{ width: SCREEN_WIDTH, height: 240 }}
          contentFit="cover"
        />

        <View style={{ padding: 20 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 26,
              fontWeight: "800",
              marginBottom: 6,
            }}
          >
            {restaurant.name}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              marginBottom: 14,
            }}
          >
            {restaurant.cuisine}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: "rgba(255,184,0,0.1)",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Star size={14} color="#FFB800" fill="#FFB800" />
              <Text
                style={{ color: "#FFB800", fontSize: 14, fontWeight: "700" }}
              >
                {restaurant.rating}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                ({restaurant.reviews})
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: colors.inputBackground,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Clock size={14} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {restaurant.deliveryTime}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor:
                  restaurant.deliveryFee === 0
                    ? "rgba(212,175,55,0.1)"
                    : colors.inputBackground,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <MapPin
                size={14}
                color={
                  restaurant.deliveryFee === 0
                    ? "#D4AF37"
                    : colors.textSecondary
                }
              />
              {restaurant.deliveryFee === 0 ? (
                <Text
                  style={{
                    color: "#D4AF37",
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Free delivery
                </Text>
              ) : (
                <CurrencyPrice
                  price={restaurant.deliveryFee}
                  originalCurrency={restaurantCurrency}
                  showOriginal={false}
                  size="small"
                  textStyle={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                />
              )}
            </View>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginBottom: 20,
            }}
          />

          {/* Category tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -20, marginBottom: 20, flexGrow: 0 }}
          >
            <View
              style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20 }}
            >
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 9,
                      borderRadius: 20,
                      backgroundColor: isActive
                        ? colors.text
                        : colors.inputBackground,
                      borderWidth: 1,
                      borderColor: isActive ? colors.text : colors.inputBorder,
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? colors.background : colors.text,
                        fontSize: 14,
                        fontWeight: isActive ? "700" : "500",
                      }}
                    >
                      {cat === "Popular" ? "🔥 " + cat : cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Menu items */}
          {filteredMenu.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelectedItem(item)}
              activeOpacity={0.7}
              style={{ marginBottom: 16, overflow: "hidden", borderRadius: 14 }}
            >
              <BlurView
                intensity={60}
                tint={colors.glass.tint}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: "row",
                  padding: 12,
                }}
              >
                <Image
                  source={{ uri: item.image }}
                  style={{ width: 95, height: 95, borderRadius: 12 }}
                  contentFit="cover"
                />
                <View
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 16,
                          fontWeight: "700",
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.popular && (
                        <View
                          style={{
                            backgroundColor: colors.text,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          <Text
                            style={{
                              color: colors.background,
                              fontSize: 9,
                              fontWeight: "700",
                            }}
                          >
                            POPULAR
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <Clock size={12} color={colors.textTertiary} />
                        <Text
                          style={{ color: colors.textTertiary, fontSize: 11 }}
                        >
                          {item.prepTime} min
                        </Text>
                      </View>
                      {item.spicyLevel > 0 && (
                        <Text style={{ fontSize: 11 }}>
                          {"🌶️".repeat(item.spicyLevel)}
                        </Text>
                      )}
                      {item.dietaryTags?.map((tag) => (
                        <View
                          key={tag}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 2,
                            backgroundColor: "rgba(212,175,55,0.1)",
                            paddingHorizontal: 5,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          <Leaf size={9} color="#D4AF37" />
                          <Text
                            style={{
                              color: "#D4AF37",
                              fontSize: 10,
                              fontWeight: "600",
                            }}
                          >
                            {tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <CurrencyPrice
                      price={item.price}
                      originalCurrency={restaurantCurrency}
                      size="small"
                      textStyle={{
                        color: colors.text,
                        fontSize: 18,
                        fontWeight: "700",
                      }}
                    />
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleQuickAdd(item);
                      }}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: colors.text,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Plus size={18} color={colors.background} />
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>
          ))}

          {filteredMenu.length === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
                No items in this category
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating cart bar */}
      {totalItems > 0 && !selectedItem && (
        <TouchableOpacity
          onPress={() => router.push("/cart")}
          style={{
            position: "absolute",
            bottom: insets.bottom + 16,
            left: 16,
            right: 16,
            backgroundColor: colors.text,
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                backgroundColor: "rgba(127,127,127,0.3)",
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: colors.background,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                {totalItems}
              </Text>
            </View>
            <Text
              style={{
                color: colors.background,
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              View Cart
            </Text>
          </View>
          <CurrencyPrice
            price={totalPrice}
            originalCurrency={restaurantCurrency}
            showOriginal={false}
            size="small"
            textStyle={{
              color: colors.background,
              fontSize: 17,
              fontWeight: "700",
            }}
          />
        </TouchableOpacity>
      )}

      {selectedItem && (
        <ItemCustomizePanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCart={handleAddToCart}
          formatCurrency={formatCurrency}
          colors={colors}
          currency={restaurantCurrency}
        />
      )}
    </View>
  );
}
