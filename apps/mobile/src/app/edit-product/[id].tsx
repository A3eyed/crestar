// @ts-nocheck
import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  X,
  Upload,
  Package,
  Clock,
  Star,
  Trash2,
  Save,
} from "lucide-react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import useUpload from "../../utils/useUpload";
import KeyboardAvoidingAnimatedView from "../../components/KeyboardAvoidingAnimatedView";
import { useTheme } from "../../utils/theme";
import { authenticatedFetch } from "../../utils/authenticatedFetch";
import { getSymbolByCurrencyCode } from "../../utils/currency";
import AdvancedSizingSection from "../../components/CreateListing/AdvancedSizingSection";

const SPICY_LEVELS = [
  { value: 0, emoji: "😊", label: "Not Spicy" },
  { value: 1, emoji: "🌶️", label: "Mild" },
  { value: 2, emoji: "🌶️🌶️", label: "Medium" },
  { value: 3, emoji: "🌶️🌶️🌶️", label: "Hot" },
  { value: 4, emoji: "🔥🔥", label: "Very Hot" },
  { value: 5, emoji: "🔥🔥🔥", label: "Extreme" },
];

export default function EditProductScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [upload, { loading: uploading }] = useUpload();
  const colors = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState(null);

  // Form data
  const [media, setMedia] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [weight, setWeight] = useState("");
  const [isWholesale, setIsWholesale] = useState(false);
  const [wholesaleMin, setWholesaleMin] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [spicyLevel, setSpicyLevel] = useState(0);
  const [isTodaysSpecial, setIsTodaysSpecial] = useState(false);
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState("");
  const [selectedSizes, setSelectedSizes] = useState([]);

  // ── Sizing metadata (loaded from product) ──────────────────────────────
  const [sizingCategory, setSizingCategory] = useState(null);
  const [sizeSystem, setSizeSystem] = useState("US");
  const [sizeType, setSizeType] = useState("Regular");
  const [dimensionalSpecs, setDimensionalSpecs] = useState({
    length: "",
    width: "",
    height: "",
    unit: "cm",
  });

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`/api/products/${id}`);
      if (!response.ok) throw new Error("Product not found");

      const data = await response.json();
      const p = data.product;

      // Parse media
      const mediaArray = Array.isArray(p.media)
        ? p.media
        : typeof p.media === "string"
          ? JSON.parse(p.media)
          : [];

      // Parse features
      const featuresArray = Array.isArray(p.features)
        ? p.features
        : typeof p.features === "string"
          ? JSON.parse(p.features)
          : [];

      // Parse variants to extract sizes
      const variantsArray = Array.isArray(data.variants) ? data.variants : [];
      const existingSizes = variantsArray
        .flatMap((v) => {
          if (Array.isArray(v.sizes)) return v.sizes;
          if (typeof v.sizes === "string") {
            try {
              return JSON.parse(v.sizes);
            } catch {
              return [];
            }
          }
          return [];
        })
        .filter((s, i, arr) => arr.indexOf(s) === i);

      // Normalize product type (API may return camelCase or snake_case)
      const normalizedProduct = {
        ...p,
        productType: p.productType || p.product_type,
        product_type: p.product_type || p.productType,
        stockQuantity: p.stockQuantity ?? p.stock_quantity,
        weightKg: p.weightKg ?? p.weight_kg,
        isWholesale: p.isWholesale ?? p.is_wholesale,
        wholesaleMinQuantity:
          p.wholesaleMinQuantity ?? p.wholesale_min_quantity,
        prepTimeMinutes: p.prepTimeMinutes ?? p.prep_time_minutes,
        spicyLevel: p.spicyLevel ?? p.spicy_level,
        isTodaysSpecial: p.isTodaysSpecial ?? p.is_todays_special,
      };

      setProduct(normalizedProduct);
      setMedia(mediaArray);
      setTitle(normalizedProduct.title);
      setDescription(normalizedProduct.description || "");
      setPrice(normalizedProduct.price?.toString() || "");
      setStockQuantity(normalizedProduct.stockQuantity?.toString() || "");
      setWeight(normalizedProduct.weightKg?.toString() || "");
      setIsWholesale(normalizedProduct.isWholesale || false);
      setWholesaleMin(normalizedProduct.wholesaleMinQuantity?.toString() || "");
      setPrepTime(normalizedProduct.prepTimeMinutes?.toString() || "");
      setSpicyLevel(normalizedProduct.spicyLevel || 0);
      setIsTodaysSpecial(normalizedProduct.isTodaysSpecial || false);
      setCategory(normalizedProduct.category || "");
      setFeatures(featuresArray);
      setSelectedSizes(existingSizes);
      // Load sizing metadata
      setSizingCategory(p.sizing_category || null);
      setSizeSystem(p.size_system || "US");
      setSizeType(p.size_type || "Regular");
      if (p.dimensional_specs) {
        const ds =
          typeof p.dimensional_specs === "string"
            ? JSON.parse(p.dimensional_specs)
            : p.dimensional_specs;
        setDimensionalSpecs(
          ds || { length: "", width: "", height: "", unit: "cm" },
        );
      }
    } catch (error) {
      console.error("Failed to fetch product:", error);
      Alert.alert("Error", "Failed to load product");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleMediaPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uploads = [];
      for (const asset of result.assets) {
        const { url, error } = await upload({ reactNativeAsset: asset });
        if (!error) {
          uploads.push(url);
        }
      }
      setMedia([...media, ...uploads]);
    }
  };

  const removeMedia = (index) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const removeFeature = (index) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const toggleSize = (size) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  };

  const handleUpdate = async () => {
    if (media.length === 0) {
      Alert.alert("Media Required", "Please upload at least one image");
      return;
    }

    if (!title || !description || !price) {
      Alert.alert("Missing Information", "Please fill in all required fields");
      return;
    }

    // Validate drinks minimum quantity
    if (
      category?.toLowerCase().includes("drink") &&
      stockQuantity &&
      parseInt(stockQuantity) < 5
    ) {
      Alert.alert(
        "Minimum Quantity Required",
        "Drinks must have a minimum stock quantity of 5",
      );
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title,
        description,
        media,
        price: parseFloat(price),
        stockQuantity: stockQuantity ? parseInt(stockQuantity) : null,
        weightKg: weight ? parseFloat(weight) : null,
        isWholesale,
        wholesaleMinQuantity: wholesaleMin ? parseInt(wholesaleMin) : null,
        prepTimeMinutes: prepTime ? parseInt(prepTime) : null,
        spicyLevel: product.productType === "food_beverage" ? spicyLevel : null,
        isTodaysSpecial,
        category,
        features,
        sizes: selectedSizes,
        // Advanced sizing metadata
        sizingCategory,
        sizeSystem,
        sizeType,
        dimensionalSpecs:
          sizingCategory === "home_furniture" ? dimensionalSpecs : null,
      };

      const response = await authenticatedFetch(`/api/listings/products`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update product");
      }

      Alert.alert("Success", "Product updated successfully", [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Update product error:", error);
      Alert.alert("Error", error.message || "Failed to update product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Product",
      "Are you sure? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await authenticatedFetch(
                `/api/listings/products`,
                {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id }),
                },
              );

              if (!response.ok) throw new Error("Failed to delete product");

              Alert.alert("Deleted", "Product has been removed", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert("Error", "Failed to delete product");
            }
          },
        },
      ],
    );
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

  // Derive seller currency from product once loaded
  const sellerCurrencyCode = product?.seller_currency || "GHS";
  const sellerCurrencySymbol = getSymbolByCurrencyCode(sellerCurrencyCode);

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={colors.statusBar} />

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}>
            Edit Product
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={handleDelete}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.3)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={20} color={colors.error} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.cardBackgroundAlt,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Media Section */}
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "700",
              marginBottom: 12,
            }}
          >
            Photos
          </Text>
          <TouchableOpacity
            onPress={handleMediaPick}
            disabled={uploading}
            style={{
              borderRadius: 12,
              borderWidth: 2,
              borderColor: colors.border,
              borderStyle: "dashed",
              backgroundColor: colors.cardBackground,
              padding: 32,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <Upload size={32} color={colors.textTertiary} />
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: "600",
                    marginTop: 12,
                  }}
                >
                  Add More Photos
                </Text>
              </>
            )}
          </TouchableOpacity>

          {media.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 32,
              }}
            >
              {media.map((url, idx) => (
                <View
                  key={idx}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 12,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Image
                    source={{ uri: url }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    onPress={() => removeMedia(idx)}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trash2 size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Title */}
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "700",
              marginBottom: 12,
            }}
          >
            Title
          </Text>
          <TextInput
            placeholder="Product title"
            placeholderTextColor={colors.inputPlaceholder}
            value={title}
            onChangeText={setTitle}
            style={{
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 12,
              padding: 16,
              color: colors.text,
              fontSize: 15,
              marginBottom: 24,
            }}
          />

          {/* Description */}
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "700",
              marginBottom: 12,
            }}
          >
            Description
          </Text>
          <TextInput
            placeholder="Describe your product..."
            placeholderTextColor={colors.inputPlaceholder}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 12,
              padding: 16,
              color: colors.text,
              fontSize: 15,
              minHeight: 100,
              textAlignVertical: "top",
              marginBottom: 24,
            }}
          />

          {/* Category */}
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "700",
              marginBottom: 12,
            }}
          >
            Category
          </Text>
          <TextInput
            placeholder="e.g. Electronics, Food, Clothing"
            placeholderTextColor={colors.inputPlaceholder}
            value={category}
            onChangeText={setCategory}
            style={{
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 12,
              padding: 16,
              color: colors.text,
              fontSize: 15,
              marginBottom: 24,
            }}
          />

          {/* Features */}
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "700",
              marginBottom: 12,
            }}
          >
            Features (Optional)
          </Text>
          {features.map((feature, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.cardBackground,
                borderRadius: 10,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <Text
                style={{ flex: 1, color: colors.text, fontSize: 14 }}
                numberOfLines={2}
              >
                • {feature}
              </Text>
              <TouchableOpacity onPress={() => removeFeature(idx)}>
                <Trash2 size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 24,
            }}
          >
            <TextInput
              placeholder="Add a feature..."
              placeholderTextColor={colors.inputPlaceholder}
              value={newFeature}
              onChangeText={setNewFeature}
              style={{
                flex: 1,
                backgroundColor: colors.inputBackground,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                borderRadius: 10,
                padding: 12,
                color: colors.text,
                fontSize: 14,
              }}
            />
            <TouchableOpacity
              onPress={addFeature}
              disabled={!newFeature.trim()}
              style={{
                backgroundColor: newFeature.trim()
                  ? "#D4AF37"
                  : colors.inputBackground,
                paddingHorizontal: 16,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: newFeature.trim() ? "#FFFFFF" : colors.textTertiary,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {/* Price */}
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "700",
              marginBottom: 12,
            }}
          >
            Price ({sellerCurrencyCode})
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 12,
              paddingHorizontal: 16,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 18,
                fontWeight: "600",
                marginRight: 4,
              }}
            >
              {sellerCurrencySymbol}
            </Text>
            <TextInput
              placeholder="0.00"
              placeholderTextColor={colors.inputPlaceholder}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                padding: 16,
                color: colors.text,
                fontSize: 15,
              }}
            />
          </View>

          {/* Stock Quantity + Advanced Sizing */}
          {product?.productType === "physical_goods" && (
            <>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 17,
                  fontWeight: "700",
                  marginBottom: 12,
                }}
              >
                Stock Quantity
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.inputBackground,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  marginBottom: 24,
                }}
              >
                <Package size={20} color={colors.textTertiary} />
                <TextInput
                  placeholder="How many in stock?"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                  keyboardType="number-pad"
                  style={{
                    flex: 1,
                    padding: 16,
                    color: colors.text,
                    fontSize: 15,
                  }}
                />
              </View>

              {/* ════ ADVANCED SIZING SECTION ════ */}
              {sizingCategory ? (
                <>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 17,
                      fontWeight: "700",
                      marginBottom: 4,
                    }}
                  >
                    Sizes
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginBottom: 14,
                    }}
                  >
                    Sizing type: {sizingCategory?.replace(/_/g, " ")}
                  </Text>
                  <AdvancedSizingSection
                    showCategoryPicker={false}
                    sizingCategory={sizingCategory}
                    onSizingCategoryChange={setSizingCategory}
                    sizeSystem={sizeSystem}
                    onSizeSystemChange={setSizeSystem}
                    sizeType={sizeType}
                    onSizeTypeChange={setSizeType}
                    dimensionalSpecs={dimensionalSpecs}
                    onDimensionalSpecsChange={setDimensionalSpecs}
                    selectedSizes={selectedSizes}
                    onSizesChange={setSelectedSizes}
                    colors={colors}
                  />
                  <View
                    style={{
                      marginTop: 16,
                      marginBottom: 24,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                        marginBottom: 8,
                      }}
                    >
                      Change sizing type:
                    </Text>
                    <AdvancedSizingSection
                      showCategoryPicker={true}
                      sizingCategory={sizingCategory}
                      onSizingCategoryChange={(cat) => {
                        setSizingCategory(cat);
                        setSelectedSizes([]);
                      }}
                      sizeSystem={sizeSystem}
                      onSizeSystemChange={setSizeSystem}
                      sizeType={sizeType}
                      onSizeTypeChange={setSizeType}
                      dimensionalSpecs={dimensionalSpecs}
                      onDimensionalSpecsChange={setDimensionalSpecs}
                      selectedSizes={[]}
                      onSizesChange={() => {}}
                      colors={colors}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 17,
                      fontWeight: "700",
                      marginBottom: 4,
                    }}
                  >
                    Sizing Type
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginBottom: 14,
                    }}
                  >
                    This product has no sizing type set. Choose one below:
                  </Text>
                  <AdvancedSizingSection
                    showCategoryPicker={true}
                    sizingCategory={sizingCategory}
                    onSizingCategoryChange={setSizingCategory}
                    sizeSystem={sizeSystem}
                    onSizeSystemChange={setSizeSystem}
                    sizeType={sizeType}
                    onSizeTypeChange={setSizeType}
                    dimensionalSpecs={dimensionalSpecs}
                    onDimensionalSpecsChange={setDimensionalSpecs}
                    selectedSizes={selectedSizes}
                    onSizesChange={setSelectedSizes}
                    colors={colors}
                  />
                </>
              )}
            </>
          )}

          {/* Food-specific fields */}
          {product?.productType === "food_beverage" && (
            <>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 17,
                  fontWeight: "700",
                  marginBottom: 12,
                }}
              >
                Prep Time (minutes)
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.inputBackground,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  marginBottom: 24,
                }}
              >
                <Clock size={20} color={colors.textTertiary} />
                <TextInput
                  placeholder="e.g. 30"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={prepTime}
                  onChangeText={setPrepTime}
                  keyboardType="number-pad"
                  style={{
                    flex: 1,
                    padding: 16,
                    color: colors.text,
                    fontSize: 15,
                  }}
                />
              </View>

              <Text
                style={{
                  color: colors.text,
                  fontSize: 17,
                  fontWeight: "700",
                  marginBottom: 12,
                }}
              >
                Spicy Level
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 24,
                }}
              >
                {SPICY_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.value}
                    onPress={() => setSpicyLevel(level.value)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor:
                        spicyLevel === level.value
                          ? colors.accent
                          : colors.cardBackground,
                      borderWidth: 1,
                      borderColor:
                        spicyLevel === level.value
                          ? colors.accent
                          : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          spicyLevel === level.value ? "#FFFFFF" : colors.text,
                        fontSize: 13,
                        fontWeight: spicyLevel === level.value ? "600" : "400",
                      }}
                    >
                      {level.emoji} {level.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: colors.cardBackground,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Star size={20} color={colors.textTertiary} />
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    Today's Special
                  </Text>
                </View>
                <Switch
                  value={isTodaysSpecial}
                  onValueChange={setIsTodaysSpecial}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </>
          )}

          {/* Update Button */}
          <TouchableOpacity
            onPress={handleUpdate}
            disabled={submitting || media.length === 0 || !title || !price}
            style={{
              backgroundColor: "#D4AF37",
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              opacity:
                submitting || media.length === 0 || !title || !price ? 0.5 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={20} color="#FFFFFF" />
                <Text
                  style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}
                >
                  Update Product
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
