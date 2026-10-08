// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  Upload,
  Package,
  Clock,
  Flame,
  Star,
  Trash2,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  Plus,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import useUpload from '../utils/useUpload';
import KeyboardAvoidingAnimatedView from '../components/KeyboardAvoidingAnimatedView';
import { useTheme } from '../utils/theme';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import { getSymbolByCurrencyCode } from '../utils/currency';
import AdvancedSizingSection from '../components/CreateListing/AdvancedSizingSection';

const SPICY_LEVELS = [
  { value: 0, emoji: '😊', label: 'Not Spicy' },
  { value: 1, emoji: '🌶️', label: 'Mild' },
  { value: 2, emoji: '🌶️🌶️', label: 'Medium' },
  { value: 3, emoji: '🌶️🌶️🌶️', label: 'Hot' },
  { value: 4, emoji: '🔥🔥', label: 'Very Hot' },
  { value: 5, emoji: '🔥🔥🔥', label: 'Extreme' },
];

const COLOR_OPTIONS = [
  'Black',
  'White',
  'Red',
  'Blue',
  'Green',
  'Yellow',
  'Orange',
  'Purple',
  'Pink',
  'Gray',
  'Brown',
  'Beige',
  'Navy',
  'Maroon',
  'Gold',
  'Silver',
  'Multi-Color',
];

// Sizing categories that require per-variant selection (not dimensional)
const PER_VARIANT_SIZING = [
  'apparel',
  'shoes',
  'pants',
  'dress_shirts',
  'bags',
  'unit_count',
  'custom',
];

const FOOD_HUB_TYPES = [
  {
    value: 'food',
    label: 'Food',
    description: 'Meals, groceries, bakery, pantry, snacks, frozen and special diet items',
  },
  {
    value: 'drinks',
    label: 'Drinks',
    description: 'Water, soft drinks, juices, coffee, tea, milk, alcoholic and hot drinks',
  },
];

const STANDARD_FOOD_CATEGORIES = [
  'Fresh Produce',
  'Meat & Poultry',
  'Seafood',
  'Dairy & Eggs',
  'Bakery',
  'Pantry Staples',
  'Snacks & Confectionery',
  'Frozen Food',
  'Ready Meals',
  'Special Diets',
];

const STANDARD_DRINK_CATEGORIES = [
  'Water',
  'Soft Drinks',
  'Juices',
  'Energy Drinks',
  'Coffee',
  'Tea',
  'Plant-Based Milk',
  'Alcoholic',
  'Hot Chocolate / Other Hot Drinks',
];

const DIETARY_FLAGS = [
  'Vegan',
  'Vegetarian',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Organic',
  'Halal',
  'Keto',
];
const ALLERGEN_OPTIONS = [
  'Celery',
  'Cereals containing gluten',
  'Crustaceans',
  'Eggs',
  'Fish',
  'Lupin',
  'Milk',
  'Molluscs',
  'Mustard',
  'Peanuts',
  'Sesame',
  'Soybeans',
  'Sulphur dioxide / sulphites',
  'Tree nuts',
];
const PACKAGING_TYPES = ['Bottle', 'Can', 'Carton', 'Pouch', 'Box', 'Jar', 'Cup', 'Keg'];
const SWEETNESS_LEVELS = ['Unsweetened', 'Low sugar', 'Regular', 'Sweet', 'Extra sweet'];

// Structured category options so sellers pick a clear, consistent category
const PRODUCT_CATEGORIES = [
  'Electronics',
  'Phones & Tablets',
  'Computers & Accessories',
  'Fashion & Clothing',
  'Shoes',
  'Bags & Accessories',
  'Jewelry & Watches',
  'Beauty & Personal Care',
  'Health & Wellness',
  'Home & Furniture',
  'Appliances',
  'Baby & Kids',
  'Sports & Outdoors',
  'Automotive',
  'Books & Stationery',
  'Groceries',
  'Other',
];

const FOOD_CATEGORIES = [
  'Main Dishes',
  'Local Dishes',
  'Fast Food',
  'Breakfast',
  'Snacks',
  'Desserts',
  'Drinks',
  'Smoothies & Juices',
  'Bakery',
  'Grills & BBQ',
  'Soups',
  'Vegan & Healthy',
  'Other',
];

export default function CreateListingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [upload, { loading: uploading }] = useUpload();
  const colors = useTheme();

  const [businessCenter, setBusinessCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listingType, setListingType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 = Basic Info, 2 = Variants

  // Step 1: Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  // Step 2: Color Variants
  const [colorVariants, setColorVariants] = useState([
    {
      color: '',
      images: [],
      sizes: [],
      stockQuantity: '',
      price: '',
    },
  ]);
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Food-specific fields
  const [prepTime, setPrepTime] = useState('');
  const [spicyLevel, setSpicyLevel] = useState(0);
  const [isTodaysSpecial, setIsTodaysSpecial] = useState(false);

  // FoodHub structured fields
  const [foodHubType, setFoodHubType] = useState(null);
  const [foodSubcategory, setFoodSubcategory] = useState('');
  const [foodAttributes, setFoodAttributes] = useState({
    unitSize: '',
    ingredients: '',
    allergenStatus: 'Contains',
    allergens: [],
    dietaryFlags: [],
    bestBefore: '',
    storageInstructions: '',
    countryOfOrigin: '',
    brand: '',
    flavor: '',
    packSize: '',
    nutrition: '',
  });
  const [drinkAttributes, setDrinkAttributes] = useState({
    volume: '',
    flavor: '',
    sweetnessLevel: '',
    abv: '',
    caffeineContent: '',
    ingredients: '',
    dietaryFlags: [],
    packagingType: '',
    packSize: '',
    brand: '',
    origin: '',
    servingTemperature: '',
  });

  // Physical goods specific
  const [weight, setWeight] = useState('');
  const [isWholesale, setIsWholesale] = useState(false);
  const [wholesaleMin, setWholesaleMin] = useState('');

  // ── Product-level sizing metadata ────────────────────────────────────────
  const [sizingCategory, setSizingCategory] = useState(null);
  const [sizeSystem, setSizeSystem] = useState('US');
  const [sizeType, setSizeType] = useState('Regular');
  const [dimensionalSpecs, setDimensionalSpecs] = useState({
    length: '',
    width: '',
    height: '',
    unit: 'cm',
  });

  useEffect(() => {
    fetchBusinessCenter();
  }, []);

  const fetchBusinessCenter = async () => {
    try {
      const response = await authenticatedFetch('/api/business-centers');
      if (response.ok) {
        const data = await response.json();

        if (data.has_center && data.center) {
          const center = data.center;

          if (
            (center.center_type === 'seller' || center.center_type === 'foodhub') &&
            center.verification_status === 'approved'
          ) {
            setBusinessCenter(center);
            const productType =
              center.center_type === 'foodhub' ? 'food_beverage' : 'physical_goods';
            setListingType(productType);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch business center:', error);
    } finally {
      setLoading(false);
    }
  };

  // Derive seller's currency from their business center profile
  const sellerCurrency = businessCenter?.default_currency || 'GHS';
  const sellerCurrencySymbol = getSymbolByCurrencyCode(sellerCurrency);

  const isFoodAndDrinksListing = listingType === 'food_beverage';
  const currentFoodHubCategories =
    foodHubType === 'drinks' ? STANDARD_DRINK_CATEGORIES : STANDARD_FOOD_CATEGORIES;

  const toggleFoodAttribute = (key, value) => {
    setFoodAttributes((current) => {
      const selected = current[key] || [];
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return { ...current, [key]: next };
    });
  };

  const toggleDrinkAttribute = (key, value) => {
    setDrinkAttributes((current) => {
      const selected = current[key] || [];
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return { ...current, [key]: next };
    });
  };

  // Compress an image before upload so uploads are fast and never exceed
  // the backend body-size limit. Falls back to the original if compression fails.
  const compressAsset = async (asset) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );
      return { ...asset, uri: result.uri, mimeType: 'image/jpeg' };
    } catch (e) {
      console.warn('Image compression failed, using original:', e?.message);
      return asset;
    }
  };

  const handleMediaPick = async (variantIndex) => {
    const currentVariant = colorVariants[variantIndex];
    if (currentVariant.images.length >= 5) {
      Alert.alert('Limit Reached', 'Maximum 5 images per color variant');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uploads = [];
      const failures = [];
      for (const asset of result.assets) {
        if (currentVariant.images.length + uploads.length >= 5) {
          break;
        }
        const compressed = await compressAsset(asset);
        const { url, error } = await upload({ reactNativeAsset: compressed });
        if (!error && url) {
          uploads.push(url);
        } else {
          failures.push(error || 'Unknown error');
        }
      }

      if (uploads.length > 0) {
        const updatedVariants = [...colorVariants];
        updatedVariants[variantIndex].images = [
          ...updatedVariants[variantIndex].images,
          ...uploads,
        ];
        setColorVariants(updatedVariants);
      }

      if (failures.length > 0) {
        Alert.alert(
          uploads.length > 0 ? 'Some Photos Failed' : 'Upload Failed',
          `${failures.length} photo${failures.length > 1 ? 's' : ''} could not be uploaded.\n\n${failures[0]}\n\nPlease check your connection and try again.`
        );
      }
    }
  };

  const removeMedia = (variantIndex, imageIndex) => {
    const updatedVariants = [...colorVariants];
    updatedVariants[variantIndex].images = updatedVariants[variantIndex].images.filter(
      (_, i) => i !== imageIndex
    );
    setColorVariants(updatedVariants);
  };

  const handleColorSelect = (color) => {
    const updatedVariants = [...colorVariants];
    updatedVariants[currentVariantIndex].color = color;
    setColorVariants(updatedVariants);
    setShowColorPicker(false);
  };

  const toggleSize = (size) => {
    const updatedVariants = [...colorVariants];
    const currentSizes = updatedVariants[currentVariantIndex].sizes;
    if (currentSizes.includes(size)) {
      updatedVariants[currentVariantIndex].sizes = currentSizes.filter((s) => s !== size);
    } else {
      updatedVariants[currentVariantIndex].sizes = [...currentSizes, size];
    }
    setColorVariants(updatedVariants);
  };

  // Update sizes for current variant from AdvancedSizingSection
  const handleVariantSizesChange = (newSizes) => {
    const updated = [...colorVariants];
    updated[currentVariantIndex].sizes = newSizes;
    setColorVariants(updated);
  };

  const addNewVariant = () => {
    const lastVariant = colorVariants[colorVariants.length - 1];
    setColorVariants([
      ...colorVariants,
      {
        color: '',
        images: [],
        sizes: [],
        stockQuantity: '',
        price: lastVariant.price || '', // Carry over last price
      },
    ]);
    setCurrentVariantIndex(colorVariants.length);
  };

  const removeVariant = (index) => {
    if (colorVariants.length === 1) {
      Alert.alert('Error', 'You must have at least one color variant');
      return;
    }
    const updatedVariants = colorVariants.filter((_, i) => i !== index);
    setColorVariants(updatedVariants);
    if (currentVariantIndex >= updatedVariants.length) {
      setCurrentVariantIndex(updatedVariants.length - 1);
    }
  };

  // Platform fee removed — sellers keep 100% of their sales
  const calculatePlatformFee = (price) => {
    if (!price) return 0;
    return (0).toFixed(2);
  };

  const calculateYouReceive = (price) => {
    if (!price) return 0;
    const amount = parseFloat(price);
    return amount.toFixed(2);
  };

  const validateStep1 = () => {
    if (isFoodAndDrinksListing && !foodHubType) {
      Alert.alert(
        'Choose Food or Drinks',
        'Select Food or Drinks first so your listing appears in the right FoodHub tab.'
      );
      return false;
    }
    if (isFoodAndDrinksListing && !foodSubcategory) {
      Alert.alert(
        'Choose a category',
        `Select a ${foodHubType === 'drinks' ? 'drink' : 'food'} category so shoppers can filter it on FoodHub.`
      );
      return false;
    }
    const finalCategory = isFoodAndDrinksListing
      ? foodSubcategory
      : category === 'Other'
        ? customCategory.trim()
        : category;
    if (!title || !description || !finalCategory) {
      Alert.alert('Missing Information', 'Please fill in title, description, and category');
      return false;
    }
    if (listingType === 'physical_goods' && !sizingCategory) {
      Alert.alert('Sizing Type Required', 'Please select a sizing type for this product');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    for (let i = 0; i < colorVariants.length; i++) {
      const variant = colorVariants[i];
      const label = variant.color || `Variant ${i + 1}`;
      // Color is OPTIONAL — sellers can skip it when colors don't apply
      if (variant.images.length === 0) {
        Alert.alert('Missing Images', `Please add at least one image for ${label}`);
        return false;
      }
      if (!variant.price) {
        Alert.alert('Missing Price', `Please set a price for ${label}`);
        return false;
      }
      if (
        listingType === 'physical_goods' &&
        sizingCategory &&
        PER_VARIANT_SIZING.includes(sizingCategory) &&
        variant.sizes.length === 0
      ) {
        Alert.alert('Missing Sizes', `Please select at least one size for ${label}`);
        return false;
      }
      if (listingType === 'physical_goods' && !variant.stockQuantity) {
        Alert.alert('Missing Stock', `Please enter stock quantity for ${label}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setSubmitting(true);
    try {
      const allMedia = colorVariants.flatMap((v) => v.images);
      const basePrice = parseFloat(colorVariants[0].price);
      const finalCategory = isFoodAndDrinksListing
        ? foodSubcategory
        : category === 'Other'
          ? customCategory.trim()
          : category;
      const payload = {
        productType: listingType,
        title,
        description,
        media: allMedia,
        price: basePrice,
        category: finalCategory,
        foodHubType: isFoodAndDrinksListing ? foodHubType : null,
        foodSubcategory: isFoodAndDrinksListing ? foodSubcategory : null,
        foodAttributes: isFoodAndDrinksListing && foodHubType === 'food' ? foodAttributes : {},
        drinkAttributes: isFoodAndDrinksListing && foodHubType === 'drinks' ? drinkAttributes : {},
        prepTimeMinutes: prepTime ? parseInt(prepTime) : null,
        spicyLevel: listingType === 'food_beverage' ? spicyLevel : null,
        isTodaysSpecial,
        weightKg: weight ? parseFloat(weight) : null,
        isWholesale,
        wholesaleMinQuantity: wholesaleMin ? parseInt(wholesaleMin) : null,
        // Advanced sizing metadata
        sizingCategory: listingType === 'physical_goods' ? sizingCategory : null,
        sizeSystem: listingType === 'physical_goods' ? sizeSystem : null,
        sizeType: listingType === 'physical_goods' ? sizeType : null,
        dimensionalSpecs: sizingCategory === 'home_furniture' ? dimensionalSpecs : null,
        // Color variants
        variants: colorVariants.map((v) => ({
          variant_type: 'color',
          // "Standard" is used when the seller skips colors
          variant_value: v.color || 'Standard',
          variant_images: v.images,
          sizes: v.sizes,
          stock_quantity: v.stockQuantity ? parseInt(v.stockQuantity) : null,
          price: parseFloat(v.price),
        })),
      };

      const response = await authenticatedFetch('/api/listings/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create listing');
      }
      Alert.alert('Listing Published', 'Your listing is now live and ready for customers', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Create listing error:', error);
      Alert.alert('Error', error.message || 'Failed to create listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <StatusBar style={colors.statusBar} />
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (!businessCenter) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <StatusBar style={colors.statusBar} />
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: '700',
            marginBottom: 12,
          }}
        >
          Become a Seller First
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          You need to complete seller onboarding before creating listings
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/monetization-center')}
          style={{
            backgroundColor: colors.accent,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: colors.accentText, fontSize: 16, fontWeight: '600' }}>
            Start Onboarding
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentVariant = colorVariants[currentVariantIndex];

  const sizingSubtitle = () => {
    if (sizingCategory === 'apparel')
      return `${sizeType !== 'Regular' ? sizeType + ' ' : ''}Alpha · ${sizeSystem || 'US'}`;
    if (sizingCategory === 'shoes') return `Shoe sizing · ${sizeSystem || 'US'}`;
    if (sizingCategory === 'pants') return 'Waist × Inseam combinations';
    if (sizingCategory === 'dress_shirts') return 'Neck × Sleeve combinations';
    if (sizingCategory === 'bags') return 'Volume / Capacity options';
    if (sizingCategory === 'unit_count') return 'Pack-count options';
    if (sizingCategory === 'home_furniture') return 'L × W × H dimensions';
    return 'Custom sizes';
  };

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
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {currentStep === 2 && (
              <TouchableOpacity
                onPress={() => setCurrentStep(1)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.cardBackgroundAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronLeft size={24} color={colors.text} />
              </TouchableOpacity>
            )}
            <View>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>
                New Listing
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  marginTop: 2,
                }}
              >
                Step {currentStep} of 2
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.cardBackgroundAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 1: BASIC INFO */}
          {currentStep === 1 && (
            <>
              {/* FoodHub Type Selection */}
              {isFoodAndDrinksListing && (
                <View style={{ marginBottom: 24 }}>
                  <Text
                    style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 }}
                  >
                    What are you listing first?
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                    Food & Drinks items stay on FoodHub. Food appears in the Food tab and Drinks
                    appear in the Drinks tab, never in Shop.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    {FOOD_HUB_TYPES.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => {
                          setFoodHubType(option.value);
                          setFoodSubcategory('');
                          setCategory('');
                        }}
                        style={{
                          flex: 1,
                          backgroundColor:
                            foodHubType === option.value ? colors.text : colors.cardBackground,
                          borderWidth: 1,
                          borderColor: foodHubType === option.value ? colors.text : colors.border,
                          borderRadius: 16,
                          padding: 14,
                        }}
                      >
                        <Text
                          style={{
                            color: foodHubType === option.value ? colors.background : colors.text,
                            fontSize: 16,
                            fontWeight: '800',
                            marginBottom: 6,
                          }}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={{
                            color:
                              foodHubType === option.value
                                ? colors.background
                                : colors.textSecondary,
                            fontSize: 12,
                            lineHeight: 17,
                          }}
                        >
                          {option.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {foodHubType && (
                    <View>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 16,
                          fontWeight: '700',
                          marginBottom: 10,
                        }}
                      >
                        {foodHubType === 'drinks' ? 'Drink category' : 'Food category'}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}
                      >
                        {currentFoodHubCategories.map((item) => (
                          <TouchableOpacity
                            key={item}
                            onPress={() => {
                              setFoodSubcategory(item);
                              setCategory(item);
                            }}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 9,
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: foodSubcategory === item ? colors.text : colors.border,
                              backgroundColor:
                                foodSubcategory === item ? colors.text : colors.cardBackground,
                            }}
                          >
                            <Text
                              style={{
                                color: foodSubcategory === item ? colors.background : colors.text,
                                fontSize: 13,
                                fontWeight: '600',
                              }}
                            >
                              {item}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {foodHubType === 'food' ? (
                        <View style={{ gap: 12 }}>
                          <TextInput
                            placeholder="Weight / unit size"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={foodAttributes.unitSize}
                            onChangeText={(text) =>
                              setFoodAttributes((current) => ({ ...current, unitSize: text }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="Ingredients"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={foodAttributes.ingredients}
                            onChangeText={(text) =>
                              setFoodAttributes((current) => ({ ...current, ingredients: text }))
                            }
                            multiline
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                              minHeight: 76,
                              textAlignVertical: 'top',
                            }}
                          />
                          <TextInput
                            placeholder="Best before / expiry date"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={foodAttributes.bestBefore}
                            onChangeText={(text) =>
                              setFoodAttributes((current) => ({ ...current, bestBefore: text }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="Storage instructions"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={foodAttributes.storageInstructions}
                            onChangeText={(text) =>
                              setFoodAttributes((current) => ({
                                ...current,
                                storageInstructions: text,
                              }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="Country of origin"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={foodAttributes.countryOfOrigin}
                            onChangeText={(text) =>
                              setFoodAttributes((current) => ({
                                ...current,
                                countryOfOrigin: text,
                              }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="Brand"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={foodAttributes.brand}
                            onChangeText={(text) =>
                              setFoodAttributes((current) => ({ ...current, brand: text }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="Flavor"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={foodAttributes.flavor}
                            onChangeText={(text) =>
                              setFoodAttributes((current) => ({ ...current, flavor: text }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="Pack size"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={foodAttributes.packSize}
                            onChangeText={(text) =>
                              setFoodAttributes((current) => ({ ...current, packSize: text }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="Nutritional info: calories, fat, sugar, protein"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={foodAttributes.nutrition}
                            onChangeText={(text) =>
                              setFoodAttributes((current) => ({ ...current, nutrition: text }))
                            }
                            multiline
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                              minHeight: 76,
                              textAlignVertical: 'top',
                            }}
                          />
                          <Text style={{ color: colors.text, fontWeight: '700' }}>Allergens</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {ALLERGEN_OPTIONS.map((item) => (
                              <TouchableOpacity
                                key={item}
                                onPress={() => toggleFoodAttribute('allergens', item)}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 8,
                                  borderRadius: 999,
                                  backgroundColor: foodAttributes.allergens.includes(item)
                                    ? colors.text
                                    : colors.cardBackground,
                                  borderWidth: 1,
                                  borderColor: colors.border,
                                }}
                              >
                                <Text
                                  style={{
                                    color: foodAttributes.allergens.includes(item)
                                      ? colors.background
                                      : colors.text,
                                    fontSize: 12,
                                  }}
                                >
                                  {item}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <Text style={{ color: colors.text, fontWeight: '700' }}>
                            Dietary flags
                          </Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {DIETARY_FLAGS.map((item) => (
                              <TouchableOpacity
                                key={item}
                                onPress={() => toggleFoodAttribute('dietaryFlags', item)}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 8,
                                  borderRadius: 999,
                                  backgroundColor: foodAttributes.dietaryFlags.includes(item)
                                    ? colors.text
                                    : colors.cardBackground,
                                  borderWidth: 1,
                                  borderColor: colors.border,
                                }}
                              >
                                <Text
                                  style={{
                                    color: foodAttributes.dietaryFlags.includes(item)
                                      ? colors.background
                                      : colors.text,
                                    fontSize: 12,
                                  }}
                                >
                                  {item}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ) : (
                        <View style={{ gap: 12 }}>
                          <TextInput
                            placeholder="Volume (ml/L)"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={drinkAttributes.volume}
                            onChangeText={(text) =>
                              setDrinkAttributes((current) => ({ ...current, volume: text }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="Flavor"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={drinkAttributes.flavor}
                            onChangeText={(text) =>
                              setDrinkAttributes((current) => ({ ...current, flavor: text }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="ABV % if alcoholic"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={drinkAttributes.abv}
                            onChangeText={(text) =>
                              setDrinkAttributes((current) => ({ ...current, abv: text }))
                            }
                            keyboardType="decimal-pad"
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="Caffeine content"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={drinkAttributes.caffeineContent}
                            onChangeText={(text) =>
                              setDrinkAttributes((current) => ({
                                ...current,
                                caffeineContent: text,
                              }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="Ingredients"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={drinkAttributes.ingredients}
                            onChangeText={(text) =>
                              setDrinkAttributes((current) => ({ ...current, ingredients: text }))
                            }
                            multiline
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                              minHeight: 76,
                              textAlignVertical: 'top',
                            }}
                          />
                          <TextInput
                            placeholder="Pack size"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={drinkAttributes.packSize}
                            onChangeText={(text) =>
                              setDrinkAttributes((current) => ({ ...current, packSize: text }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="Brand"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={drinkAttributes.brand}
                            onChangeText={(text) =>
                              setDrinkAttributes((current) => ({ ...current, brand: text }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="Origin"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={drinkAttributes.origin}
                            onChangeText={(text) =>
                              setDrinkAttributes((current) => ({ ...current, origin: text }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <TextInput
                            placeholder="Serving temperature recommendation"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={drinkAttributes.servingTemperature}
                            onChangeText={(text) =>
                              setDrinkAttributes((current) => ({
                                ...current,
                                servingTemperature: text,
                              }))
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              borderRadius: 12,
                              padding: 14,
                              color: colors.text,
                            }}
                          />
                          <Text style={{ color: colors.text, fontWeight: '700' }}>Sweetness</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {SWEETNESS_LEVELS.map((item) => (
                              <TouchableOpacity
                                key={item}
                                onPress={() =>
                                  setDrinkAttributes((current) => ({
                                    ...current,
                                    sweetnessLevel: item,
                                  }))
                                }
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 8,
                                  borderRadius: 999,
                                  backgroundColor:
                                    drinkAttributes.sweetnessLevel === item
                                      ? colors.text
                                      : colors.cardBackground,
                                  borderWidth: 1,
                                  borderColor: colors.border,
                                }}
                              >
                                <Text
                                  style={{
                                    color:
                                      drinkAttributes.sweetnessLevel === item
                                        ? colors.background
                                        : colors.text,
                                    fontSize: 12,
                                  }}
                                >
                                  {item}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <Text style={{ color: colors.text, fontWeight: '700' }}>Packaging</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {PACKAGING_TYPES.map((item) => (
                              <TouchableOpacity
                                key={item}
                                onPress={() =>
                                  setDrinkAttributes((current) => ({
                                    ...current,
                                    packagingType: item,
                                  }))
                                }
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 8,
                                  borderRadius: 999,
                                  backgroundColor:
                                    drinkAttributes.packagingType === item
                                      ? colors.text
                                      : colors.cardBackground,
                                  borderWidth: 1,
                                  borderColor: colors.border,
                                }}
                              >
                                <Text
                                  style={{
                                    color:
                                      drinkAttributes.packagingType === item
                                        ? colors.background
                                        : colors.text,
                                    fontSize: 12,
                                  }}
                                >
                                  {item}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <Text style={{ color: colors.text, fontWeight: '700' }}>
                            Dietary flags
                          </Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {DIETARY_FLAGS.map((item) => (
                              <TouchableOpacity
                                key={item}
                                onPress={() => toggleDrinkAttribute('dietaryFlags', item)}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 8,
                                  borderRadius: 999,
                                  backgroundColor: drinkAttributes.dietaryFlags.includes(item)
                                    ? colors.text
                                    : colors.cardBackground,
                                  borderWidth: 1,
                                  borderColor: colors.border,
                                }}
                              >
                                <Text
                                  style={{
                                    color: drinkAttributes.dietaryFlags.includes(item)
                                      ? colors.background
                                      : colors.text,
                                    fontSize: 12,
                                  }}
                                >
                                  {item}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* Title */}
              <Text
                style={{
                  color: colors.text,
                  fontSize: 17,
                  fontWeight: '700',
                  marginBottom: 12,
                }}
              >
                Product Title
              </Text>
              <TextInput
                placeholder={
                  listingType === 'food_beverage'
                    ? 'e.g. Jollof Rice with Grilled Chicken'
                    : 'e.g. Premium Wireless Headphones'
                }
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
                  fontWeight: '700',
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
                  textAlignVertical: 'top',
                  marginBottom: 24,
                }}
              />

              {/* Category — structured picker (only for non-food listings) */}
              {!isFoodAndDrinksListing && (
                <>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 17,
                      fontWeight: '700',
                      marginBottom: 4,
                    }}
                  >
                    Category
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginBottom: 12,
                    }}
                  >
                    Pick the category that best fits your product — buyers use this to find it
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: category === 'Other' ? 12 : 24,
                    }}
                  >
                    {PRODUCT_CATEGORIES.map((cat) => {
                      const isSelected = category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setCategory(cat)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 20,
                            backgroundColor: isSelected ? colors.accent : colors.cardBackground,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.accent : colors.border,
                          }}
                        >
                          <Text
                            style={{
                              color: isSelected ? colors.accentText : colors.text,
                              fontSize: 13,
                              fontWeight: isSelected ? '600' : '400',
                            }}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {category === 'Other' && (
                    <TextInput
                      placeholder="Type your category..."
                      placeholderTextColor={colors.inputPlaceholder}
                      value={customCategory}
                      onChangeText={setCustomCategory}
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
                  )}
                </>
              )}

              {/* Food-specific fields */}
              {listingType === 'food_beverage' && (
                <>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 17,
                      fontWeight: '700',
                      marginBottom: 12,
                    }}
                  >
                    Prep Time (minutes)
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
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
                      fontWeight: '700',
                      marginBottom: 12,
                    }}
                  >
                    Spicy Level
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
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
                            spicyLevel === level.value ? colors.accent : colors.cardBackground,
                          borderWidth: 1,
                          borderColor: spicyLevel === level.value ? colors.accent : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            color: spicyLevel === level.value ? colors.accentText : colors.text,
                            fontSize: 13,
                            fontWeight: spicyLevel === level.value ? '600' : '400',
                          }}
                        >
                          {level.emoji} {level.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
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
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <Star size={20} color={colors.textTertiary} />
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 15,
                          fontWeight: '600',
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

              {/* Physical goods optional fields */}
              {listingType === 'physical_goods' && (
                <>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 17,
                      fontWeight: '700',
                      marginBottom: 12,
                    }}
                  >
                    Weight (kg) - Optional
                  </Text>
                  <TextInput
                    placeholder="For delivery calculation"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
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

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: colors.cardBackground,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 15,
                        fontWeight: '600',
                      }}
                    >
                      Wholesale Only
                    </Text>
                    <Switch
                      value={isWholesale}
                      onValueChange={setIsWholesale}
                      trackColor={{ false: colors.border, true: colors.accent }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {isWholesale && (
                    <>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 17,
                          fontWeight: '700',
                          marginBottom: 12,
                        }}
                      >
                        Minimum Order Quantity
                      </Text>
                      <TextInput
                        placeholder="e.g. 10"
                        placeholderTextColor={colors.inputPlaceholder}
                        value={wholesaleMin}
                        onChangeText={setWholesaleMin}
                        keyboardType="number-pad"
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
                    </>
                  )}

                  {/* ════ SIZING TYPE PICKER ════ */}
                  <View style={{ marginTop: 8, marginBottom: 28 }}>
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
                      selectedSizes={[]}
                      onSizesChange={() => {}}
                      colors={colors}
                    />
                  </View>
                </>
              )}

              <TouchableOpacity
                onPress={() => {
                  if (validateStep1()) {
                    setCurrentStep(2);
                  }
                }}
                style={{
                  backgroundColor: colors.accent,
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                <Text style={{ color: colors.accentText, fontSize: 16, fontWeight: '700' }}>
                  Next: Add Color Variants
                </Text>
                <ChevronRight size={20} color={colors.accentText} />
              </TouchableOpacity>
            </>
          )}

          {/* STEP 2: COLOR VARIANTS */}
          {currentStep === 2 && (
            <>
              {/* Variant Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
              >
                {colorVariants.map((variant, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setCurrentVariantIndex(index)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor:
                        currentVariantIndex === index ? colors.accent : colors.cardBackground,
                      borderWidth: 1,
                      borderColor: currentVariantIndex === index ? colors.accent : colors.border,
                      marginRight: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: currentVariantIndex === index ? colors.accentText : colors.text,
                        fontSize: 14,
                        fontWeight: currentVariantIndex === index ? '600' : '400',
                      }}
                    >
                      {variant.color || `Color ${index + 1}`}
                    </Text>
                    {colorVariants.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeVariant(index)}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor:
                            currentVariantIndex === index
                              ? 'rgba(255,255,255,0.2)'
                              : 'rgba(0,0,0,0.1)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <X
                          size={12}
                          color={currentVariantIndex === index ? colors.accentText : colors.text}
                        />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={addNewVariant}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: colors.cardBackground,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderStyle: 'dashed',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Plus size={16} color={colors.text} />
                  <Text style={{ color: colors.text, fontSize: 14 }}>Add Color</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Color Selector — optional */}
              <Text
                style={{
                  color: colors.text,
                  fontSize: 17,
                  fontWeight: '700',
                  marginBottom: 4,
                }}
              >
                Color
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                Optional — skip this if colors don't apply to your product
              </Text>
              <TouchableOpacity
                onPress={() => setShowColorPicker(true)}
                style={{
                  backgroundColor: colors.inputBackground,
                  borderWidth: 1,
                  borderColor: currentVariant.color ? '#D4AF37' : colors.inputBorder,
                  borderRadius: 12,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{
                    color: currentVariant.color ? colors.text : colors.inputPlaceholder,
                    fontSize: 15,
                  }}
                >
                  {currentVariant.color || 'No specific color (optional)'}
                </Text>
                <ChevronRight size={18} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Photos for this color */}
              <Text
                style={{
                  color: colors.text,
                  fontSize: 17,
                  fontWeight: '700',
                  marginBottom: 12,
                }}
              >
                Photos for {currentVariant.color || 'this variant'} (up to 5)
              </Text>

              <TouchableOpacity
                onPress={() => handleMediaPick(currentVariantIndex)}
                disabled={uploading || currentVariant.images.length >= 5}
                style={{
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderStyle: 'dashed',
                  backgroundColor: colors.cardBackground,
                  padding: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  opacity: uploading || currentVariant.images.length >= 5 ? 0.5 : 1,
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
                        fontWeight: '600',
                        marginTop: 12,
                      }}
                    >
                      Upload Photos
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    >
                      {currentVariant.images.length}/5 uploaded
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {currentVariant.images.length > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 32,
                  }}
                >
                  {currentVariant.images.map((url, idx) => (
                    <View
                      key={idx}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 12,
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <Image
                        source={{ uri: url }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                      <TouchableOpacity
                        onPress={() => removeMedia(currentVariantIndex, idx)}
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* ════ ADVANCED SIZING — per variant ════ */}
              {listingType === 'physical_goods' &&
                sizingCategory &&
                PER_VARIANT_SIZING.includes(sizingCategory) && (
                  <View style={{ marginBottom: 24 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 17,
                        fontWeight: '700',
                        marginBottom: 4,
                      }}
                    >
                      Sizes for {currentVariant.color || 'this variant'}
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 13,
                        marginBottom: 14,
                      }}
                    >
                      {sizingSubtitle()}
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
                      selectedSizes={currentVariant.sizes}
                      onSizesChange={handleVariantSizesChange}
                      colors={colors}
                    />
                  </View>
                )}

              {/* ════ DIMENSIONAL SIZING — home_furniture (once per product) ════ */}
              {listingType === 'physical_goods' && sizingCategory === 'home_furniture' && (
                <View style={{ marginBottom: 24 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 17,
                      fontWeight: '700',
                      marginBottom: 4,
                    }}
                  >
                    Product Dimensions
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginBottom: 14,
                    }}
                  >
                    L × W × H — applies to all variants
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
                    selectedSizes={currentVariant.sizes}
                    onSizesChange={handleVariantSizesChange}
                    colors={colors}
                  />
                </View>
              )}

              {/* Stock Quantity */}
              {listingType === 'physical_goods' && (
                <>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 17,
                      fontWeight: '700',
                      marginBottom: 12,
                    }}
                  >
                    Stock Quantity for {currentVariant.color || 'this variant'}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
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
                      placeholder="How many do you have?"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={currentVariant.stockQuantity}
                      onChangeText={(val) => {
                        const updated = [...colorVariants];
                        updated[currentVariantIndex].stockQuantity = val;
                        setColorVariants(updated);
                      }}
                      keyboardType="number-pad"
                      style={{
                        flex: 1,
                        padding: 16,
                        color: colors.text,
                        fontSize: 15,
                      }}
                    />
                  </View>
                </>
              )}

              {/* Price - Step 2 variant pricing */}
              <Text
                style={{
                  color: colors.text,
                  fontSize: 17,
                  fontWeight: '700',
                  marginBottom: 12,
                }}
              >
                Price for {currentVariant.color || 'this variant'} ({sellerCurrency})
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.inputBackground,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 18,
                    fontWeight: '600',
                    marginRight: 4,
                  }}
                >
                  {sellerCurrencySymbol}
                </Text>
                <TextInput
                  placeholder="0.00"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={currentVariant.price}
                  onChangeText={(val) => {
                    const updated = [...colorVariants];
                    updated[currentVariantIndex].price = val;
                    setColorVariants(updated);
                  }}
                  keyboardType="decimal-pad"
                  style={{
                    flex: 1,
                    padding: 16,
                    color: colors.text,
                    fontSize: 15,
                  }}
                />
              </View>

              {/* Profit Preview */}
              {currentVariant.price && (
                <View
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 24,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginBottom: 8,
                    }}
                  >
                    💰 Earnings Breakdown
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 14 }}>Buyer pays</Text>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                    >
                      {sellerCurrencySymbol}
                      {parseFloat(currentVariant.price).toFixed(2)}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                      Platform fee (0%)
                    </Text>
                    <Text style={{ color: '#34C759', fontSize: 14 }}>
                      {sellerCurrencySymbol}0.00
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.border,
                      marginBottom: 8,
                    }}
                  />
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: '700',
                      }}
                    >
                      You receive
                    </Text>
                    <Text
                      style={{
                        color: '#D4AF37',
                        fontSize: 16,
                        fontWeight: '700',
                      }}
                    >
                      {sellerCurrencySymbol}
                      {calculateYouReceive(currentVariant.price)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Publish Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                style={{
                  backgroundColor: colors.accent,
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.accentText} />
                ) : (
                  <Text
                    style={{
                      color: colors.accentText,
                      fontSize: 16,
                      fontWeight: '700',
                    }}
                  >
                    Publish Listing
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* Color Picker Modal */}
        <Modal visible={showColorPicker} animationType="slide" transparent>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.modalBackground,
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                backgroundColor: colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: '60%',
                paddingBottom: insets.bottom,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: '700',
                  }}
                >
                  Select Color
                </Text>
                <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {/* Skip option — sellers can list without a color */}
                <TouchableOpacity
                  onPress={() => handleColorSelect('')}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderLight,
                    backgroundColor:
                      currentVariant.color === '' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: currentVariant.color === '' ? '600' : '400',
                    }}
                  >
                    — No specific color (skip)
                  </Text>
                </TouchableOpacity>
                {COLOR_OPTIONS.map((color, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleColorSelect(color)}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderLight,
                      backgroundColor:
                        currentVariant.color === color ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 15,
                        fontWeight: currentVariant.color === color ? '600' : '400',
                      }}
                    >
                      {color}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
