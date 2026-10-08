// @ts-nocheck
import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, ShoppingCart, Play } from "lucide-react-native";
import { Image } from "expo-image";
import useCartStore from "../../utils/cartStore";
import useLocalization from "../../utils/localization";
import useAuth from "../../utils/auth/useAuth";
import { useRouter } from "expo-router";
import { useTheme } from "../../utils/theme";
import CurrencyPrice from "../../components/CurrencyPrice";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PRODUCT_WIDTH = (SCREEN_WIDTH - 48) / 2;
const BRAND = "#D4AF37";

function firstImage(media) {
  let list = media;
  if (typeof media === "string") {
    try {
      list = JSON.parse(media);
    } catch {
      return media;
    }
  }
  if (!Array.isArray(list) || list.length === 0) return null;
  const first = list[0];
  return typeof first === "string" ? first : first?.url || first?.uri || null;
}

function ProductCard({ product, onPress, onAddToCart, colors, t }) {
  const soldOut = product.stock === 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ width: PRODUCT_WIDTH, marginBottom: 16 }}
    >
      <View style={{ position: "relative", marginBottom: 8 }}>
        <Image
          source={{ uri: product.image || "https://picsum.photos/400/520" }}
          style={{
            width: PRODUCT_WIDTH,
            height: PRODUCT_WIDTH * 1.25,
            borderRadius: 12,
            opacity: soldOut ? 0.45 : 1,
          }}
          contentFit="cover"
        />
        {product.hasVideo && (
          <View
            style={{
              position: "absolute",
              left: 8,
              bottom: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: "rgba(0,0,0,0.7)",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
            }}
          >
            <Play size={11} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>
              Watch
            </Text>
          </View>
        )}
        {soldOut && (
          <View
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              backgroundColor: "rgba(0,0,0,0.7)",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>
              Sold out
            </Text>
          </View>
        )}
      </View>
      <Text
        style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}
        numberOfLines={2}
      >
        {product.name}
      </Text>
      <Text
        style={{ color: colors.textTertiary, fontSize: 12, marginTop: 4 }}
        numberOfLines={1}
      >
        {product.seller}
      </Text>
      <View style={{ marginTop: 6 }}>
        <CurrencyPrice
          price={product.price}
          originalCurrency={product.seller_currency || "GHS"}
          showOriginal={false}
          textStyle={{ color: colors.text, fontSize: 17, fontWeight: "800" }}
        />
      </View>
      {product.soldCount > 0 && (
        <Text
          style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}
        >
          {product.soldCount} sold
        </Text>
      )}
      <TouchableOpacity
        onPress={() => onAddToCart(product)}
        disabled={soldOut}
        style={{
          marginTop: 8,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: soldOut ? colors.cardBackground : BRAND,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#000000", fontSize: 13, fontWeight: "700" }}>
          {soldOut ? "Sold out" : t("addToCart")}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const { isAuthenticated, signIn } = useAuth();
  const { totalItems, addItem } = useCartStore();
  const router = useRouter();
  const colors = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sort, setSort] = useState("forYou");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const categories = [
    { id: "all", label: "For you" },
    { id: "fashion", label: "Fashion" },
    { id: "beauty", label: "Beauty" },
    { id: "tech", label: "Tech" },
    { id: "electronics", label: "Electronics" },
    { id: "home", label: "Home" },
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async (retryCount = 0, isRefresh = false) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      if (retryCount === 0) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
      }
      const response = await fetch(
        `/api/listings/products?status=active&limit=50&_t=${Date.now()}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const data = await response.json();
      setProducts(
        (data.products || [])
          .filter(
            (product) =>
              product.product_type !== "food_beverage" &&
              product.food_hub_type == null &&
              product.foodHubType == null
          )
          .map((p) => ({
            id: p.id,
            name: p.title,
            price: parseFloat(p.price) || 0,
            image: firstImage(p.media),
            seller:
              p.seller_business_name ||
              p.seller_display_name ||
              (p.seller_username ? `@${p.seller_username}` : "Seller"),
            sellerId: p.seller_id,
            seller_currency: p.seller_currency || "GHS",
            category: String(p.category || "all").toLowerCase(),
            stock:
              p.stock_quantity == null || p.stock_quantity === ""
                ? null
                : Number(p.stock_quantity),
            soldCount: Number(p.sold_count || p.orders_count || 0),
            hasVideo: !!(p.video_id || p.has_video || p.origin_video_id),
            videoId: p.video_id || p.origin_video_id || null,
            createdAt: p.created_at || "",
          }))
      );
    } catch (err) {
      clearTimeout(timeoutId);
      if (retryCount < 1) {
        setTimeout(() => fetchProducts(retryCount + 1, isRefresh), 1500);
        return;
      }
      setProducts([]);
      setError(t("noProductsFound"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddToCart = (product) => {
    if (product.stock === 0) return;
    if (!isAuthenticated) {
      signIn();
      return;
    }
    addItem(product, 1);
  };

  const visible = products
    .filter((product) => {
      const matchesCategory =
        selectedCategory === "all" ||
        product.category.includes(selectedCategory);
      const matchesSearch =
        !searchQuery ||
        `${product.name} ${product.seller}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sort === "price") return a.price - b.price;
      if (sort === "sold") return b.soldCount - a.soldCount;
      if (sort === "new")
        return String(b.createdAt).localeCompare(String(a.createdAt));
      return Number(b.hasVideo) - Number(a.hasVideo);
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 12,
              paddingHorizontal: 12,
            }}
          >
            <Search size={18} color={colors.iconSecondary} />
            <TextInput
              placeholder={t("searchProducts")}
              placeholderTextColor={colors.inputPlaceholder}
              style={{
                flex: 1,
                marginLeft: 8,
                color: colors.text,
                fontSize: 15,
                paddingVertical: 10,
              }}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            onPress={() => router.push("/cart")}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShoppingCart size={20} color={colors.icon} />
            {totalItems > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  backgroundColor: BRAND,
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ color: "#000", fontSize: 11, fontWeight: "700" }}
                >
                  {totalItems}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor:
                    selectedCategory === cat.id ? BRAND : colors.cardBackground,
                }}
              >
                <Text
                  style={{
                    color: selectedCategory === cat.id ? "#000" : colors.text,
                    fontWeight: "700",
                  }}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          {[
            ["forYou", "For you"],
            ["sold", "Best selling"],
            ["new", "New"],
            ["price", "Price"],
          ].map(([id, label]) => (
            <TouchableOpacity key={id} onPress={() => setSort(id)}>
              <Text
                style={{
                  color: sort === id ? BRAND : colors.textTertiary,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProducts(0, true)}
          />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.text} />
          ) : visible.length === 0 ? (
            <Text
              style={{
                color: colors.textSecondary,
                textAlign: "center",
                marginTop: 40,
              }}
            >
              {error || "No products found"}
            </Text>
          ) : (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              {visible.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  colors={colors}
                  t={t}
                  onPress={() => router.push(`/product/${product.id}`)}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}