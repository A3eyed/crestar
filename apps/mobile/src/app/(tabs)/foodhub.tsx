// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, TextInput } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import useLocalization from "@/utils/localization";
import useCartStore from "@/utils/cartStore";
import useAuth from "@/utils/auth/useAuth";
import { useTheme } from "@/utils/theme";
import { useFoodHubLocation } from "@/hooks/useFoodHubLocation";
import { getFoodCategories, DRINK_CATEGORIES } from "@/data/foodhubData";
import FoodHubHeader from "@/components/FoodHub/FoodHubHeader";
import LocationBar from "@/components/FoodHub/LocationBar";
import CategoryFilter from "@/components/FoodHub/CategoryFilter";
import RestaurantsList from "@/components/FoodHub/RestaurantsList";
import FloatingCartBar from "@/components/FoodHub/FloatingCartBar";
import DrinkCustomizeModal from "@/components/FoodHub/DrinkCustomizeModal";

function firstImage(media) {
  let list = media;
  if (typeof media === "string") {
    try {
      list = JSON.parse(media);
    } catch {
      return media;
    }
  }
  if (!Array.isArray(list) || !list.length) return "";
  const first = list[0];
  return typeof first === "string" ? first : first?.url || first?.uri || "";
}

export default function FoodHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { formatCurrency } = useLocalization();
  const { isAuthenticated, signIn } = useAuth();
  const { addItem, totalItems, totalPrice } = useCartStore();
  const colors = useTheme();
  const [activeTab, setActiveTab] = useState("food");
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [customizeDrink, setCustomizeDrink] = useState(null);
  const {
    userLocation,
    userCity,
    userRegion,
    locationLoading,
    requestLocationPermission,
  } = useFoodHubLocation();

  const loadItems = useCallback(async () => {
    const foodHubType = activeTab === "drinks" ? "drinks" : "food";
    const response = await fetch(
      `/api/listings/products?productType=food_beverage&foodHubType=${foodHubType}`
    );
    if (!response.ok) {
      setItems([]);
      return;
    }
    const data = await response.json();
    setItems(
      (data.products || []).map((product) => ({
        id: product.id,
        name: product.title,
        image: firstImage(product.media),
        price: Number(product.price || 0),
        currency: product.seller_currency || "GHS",
        category: product.food_subcategory || product.category || foodHubType,
        city: product.seller_city || product.city || "",
        region: product.seller_region || product.region || "",
        restaurant:
          product.seller_business_name ||
          product.seller_name ||
          product.seller_display_name ||
          "",
        restaurantId: product.seller_id,
        stock:
          product.stock_quantity == null
            ? null
            : Number(product.stock_quantity),
        tags: product.is_todays_special ? ["Today's Special"] : [],
      }))
    );
  }, [activeTab]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const visible = items.filter((item) => {
    if (selectedCategory === "local") {
      if (!userCity) return false;
      const city = String(item.city || "").toLowerCase();
      const region = String(item.region || "").toLowerCase();
      if (
        !city.includes(userCity.toLowerCase()) &&
        !region.includes(String(userRegion || "").toLowerCase())
      )
        return false;
    } else if (
      selectedCategory !== "all" &&
      !String(item.category || "")
        .toLowerCase()
        .includes(selectedCategory)
    ) {
      return false;
    }
    return (
      !search ||
      `${item.name} ${item.restaurant}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });

  const handleAddDrinkToCart = async (drink) => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    await addItem(
      {
        id: drink.id,
        name: drink.name,
        price: drink.price,
        image: drink.image,
        seller: drink.restaurant,
        sellerId: drink.restaurantId,
        seller_currency: drink.currency || "GHS",
        type: "drink",
        customization: drink.customization,
      },
      drink.quantity || 1
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <FoodHubHeader
          colors={colors}
          activeTab={activeTab}
          onTabChange={(next) => {
            setActiveTab(next);
            setSelectedCategory("all");
          }}
          onSearchPress={() => setShowSearch((open) => !open)}
        />
        {showSearch && (
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={
              activeTab === "drinks" ? "Search drinks" : "Search food"
            }
            placeholderTextColor={colors.inputPlaceholder}
            style={{
              marginTop: 10,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              padding: 12,
              color: colors.text,
            }}
          />
        )}
        <LocationBar
          colors={colors}
          userLocation={userLocation}
          userCity={userCity}
          userRegion={userRegion}
          locationLoading={locationLoading}
          onLocationPress={requestLocationPermission}
        />
        <CategoryFilter
          categories={
            activeTab === "food"
              ? getFoodCategories(userCity)
              : DRINK_CATEGORIES
          }
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          colors={colors}
        />
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + (totalItems > 0 ? 140 : 100),
          paddingTop: 16,
        }}
      >
        <RestaurantsList
          restaurants={visible}
          selectedCategory={selectedCategory}
          userCity={userCity}
          userLocation={userLocation}
          activeTab={activeTab}
          colors={colors}
          formatCurrency={formatCurrency}
          onRestaurantPress={(id) => {
            const item = visible.find((row) => row.id === id);
            if (activeTab === "drinks" && item) setCustomizeDrink(item);
            else router.push(`/product/${id}`);
          }}
          onEnableLocation={requestLocationPermission}
        />
      </ScrollView>
      <FloatingCartBar
        totalItems={totalItems}
        totalPrice={totalPrice}
        formatCurrency={formatCurrency}
        onPress={() => router.push("/cart")}
        insets={insets}
      />
      <DrinkCustomizeModal
        visible={!!customizeDrink}
        drink={customizeDrink}
        onClose={() => setCustomizeDrink(null)}
        onAddToCart={handleAddDrinkToCart}
        formatCurrency={formatCurrency}
      />
    </View>
  );
}