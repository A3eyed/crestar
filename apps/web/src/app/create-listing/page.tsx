// @ts-nocheck
'use client';
import { useState, useEffect, useCallback } from 'react';
import useUser from '@/utils/useUser';
import useUpload from '@/utils/useUpload';
import { ArrowLeft, Upload, X, Plus, ChevronRight, ChevronLeft, Package } from 'lucide-react';
import {
  SIZING_CATEGORIES,
  SIZE_SYSTEMS,
  SIZE_TYPES,
  PER_VARIANT_SIZING,
  getSizeOptions,
} from '@/utils/sizingUtils';

// Same structured categories as the mobile app
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

export default function CreateListingPage() {
  const { data: user, loading: userLoading } = useUser();
  const [upload, { loading: uploading }] = useUpload();

  const [businessCenter, setBusinessCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  // Sizing (synced with the mobile app standards)
  const [sizingCategory, setSizingCategory] = useState('none');
  const [sizeSystem, setSizeSystem] = useState('US');
  const [sizeType, setSizeType] = useState('Regular');

  // Step 2: variants — sizes[] per variant; color can be skipped
  const [variants, setVariants] = useState([
    { color: '', images: [], stockQuantity: '', price: '', sizes: [] },
  ]);
  const [variantIndex, setVariantIndex] = useState(0);
  const [customSizeInput, setCustomSizeInput] = useState('');

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

  const fetchCenter = useCallback(async () => {
    try {
      const res = await fetch('/api/business-centers');
      if (res.ok) {
        const data = await res.json();
        if (
          data.has_center &&
          (data.center.center_type === 'seller' || data.center.center_type === 'foodhub') &&
          data.center.verification_status === 'approved'
        ) {
          setBusinessCenter(data.center);
        }
      }
    } catch (err) {
      console.error('Center fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin?callbackUrl=/create-listing';
      return;
    }
    if (user) fetchCenter();
  }, [user, userLoading, fetchCenter]);

  const listingType =
    businessCenter?.center_type === 'foodhub' ? 'food_beverage' : 'physical_goods';
  const categories = listingType === 'food_beverage' ? FOOD_CATEGORIES : PRODUCT_CATEGORIES;
  const currentVariant = variants[variantIndex];

  const isFoodHubCenter = businessCenter?.center_type === 'foodhub';
  const currentFoodHubCategories =
    foodHubType === 'drinks' ? STANDARD_DRINK_CATEGORIES : STANDARD_FOOD_CATEGORIES;

  const needsPerVariantSizes =
    listingType === 'physical_goods' &&
    sizingCategory &&
    sizingCategory !== 'none' &&
    PER_VARIANT_SIZING.includes(sizingCategory);
  const sizeOptions = getSizeOptions(sizingCategory, sizeSystem);

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const current = variants[variantIndex];
    const uploadsToDo = files.slice(0, 5 - current.images.length);
    const uploaded = [];
    const failures = [];

    for (const file of uploadsToDo) {
      const { url, error } = await upload({ file });
      if (!error && url) uploaded.push(url);
      else failures.push(error || 'Unknown error');
    }

    if (uploaded.length > 0) {
      setVariants((prev) => {
        const next = [...prev];
        next[variantIndex] = {
          ...next[variantIndex],
          images: [...next[variantIndex].images, ...uploaded],
        };
        return next;
      });
    }
    if (failures.length > 0) {
      alert(
        `${failures.length} photo(s) could not be uploaded.\n${failures[0]}\nPlease check your connection and try again.`
      );
    }
    e.target.value = '';
  };

  const removeImage = (imgIdx) => {
    setVariants((prev) => {
      const next = [...prev];
      next[variantIndex] = {
        ...next[variantIndex],
        images: next[variantIndex].images.filter((_, i) => i !== imgIdx),
      };
      return next;
    });
  };

  const updateVariant = (key, value) => {
    setVariants((prev) => {
      const next = [...prev];
      next[variantIndex] = { ...next[variantIndex], [key]: value };
      return next;
    });
  };

  const toggleVariantSize = (size) => {
    setVariants((prev) => {
      const next = [...prev];
      const current = next[variantIndex];
      const has = current.sizes.includes(size);
      next[variantIndex] = {
        ...current,
        sizes: has ? current.sizes.filter((s) => s !== size) : [...current.sizes, size],
      };
      return next;
    });
  };

  const addCustomSize = () => {
    const value = customSizeInput.trim();
    if (!value) return;
    setVariants((prev) => {
      const next = [...prev];
      const current = next[variantIndex];
      if (!current.sizes.includes(value)) {
        next[variantIndex] = { ...current, sizes: [...current.sizes, value] };
      }
      return next;
    });
    setCustomSizeInput('');
  };

  const addVariant = () => {
    const last = variants[variants.length - 1];
    setVariants((prev) => [
      ...prev,
      { color: '', images: [], stockQuantity: '', price: last.price || '', sizes: [] },
    ]);
    setVariantIndex(variants.length);
  };

  const removeVariant = (idx) => {
    if (variants.length === 1) return;
    const next = variants.filter((_, i) => i !== idx);
    setVariants(next);
    if (variantIndex >= next.length) setVariantIndex(next.length - 1);
  };

  const validateStep1 = () => {
    const finalCategory = category === 'Other' ? customCategory.trim() : category;
    if (!title || !description || !finalCategory) {
      alert('Please fill in title, description, and category');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const label = v.color || `Variant ${i + 1}`;
      // Color is OPTIONAL — sellers can skip it when colors don't apply
      if (v.images.length === 0) return alert(`Please add at least one image for ${label}`);
      if (!v.price) return alert(`Please set a price for ${label}`);
      if (listingType === 'physical_goods' && !v.stockQuantity)
        return alert(`Please enter stock quantity for ${label}`);
      if (needsPerVariantSizes && sizingCategory !== 'custom' && v.sizes.length === 0)
        return alert(`Please select at least one size for ${label}`);
    }

    if (isFoodHubCenter && !foodHubType) {
      alert('Choose Food or Drinks first so this listing appears in the right FoodHub tab.');
      return;
    }
    if (isFoodHubCenter && !foodSubcategory) {
      alert(
        `Choose a ${foodHubType === 'drinks' ? 'drink' : 'food'} category so shoppers can filter it on FoodHub.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const allMedia = variants.flatMap((v) => v.images);
      const finalCategory = category === 'Other' ? customCategory.trim() : category;
      const payload = {
        productType: isFoodHubCenter ? 'food_beverage' : 'physical_goods',
        title,
        description,
        media: allMedia,
        price: parseFloat(variants[0].price),
        category: isFoodHubCenter ? foodSubcategory : customCategory || category,
        foodHubType: isFoodHubCenter ? foodHubType : null,
        foodSubcategory: isFoodHubCenter ? foodSubcategory : null,
        foodAttributes: isFoodHubCenter && foodHubType === 'food' ? foodAttributes : {},
        drinkAttributes: isFoodHubCenter && foodHubType === 'drinks' ? drinkAttributes : {},
        sizingCategory: listingType === 'physical_goods' ? sizingCategory : null,
        sizeSystem: needsPerVariantSizes ? sizeSystem : null,
        sizeType: needsPerVariantSizes ? sizeType : null,
        variants: variants.map((v) => ({
          variant_type: 'color',
          // "Standard" is used when the seller skips colors
          variant_value: v.color || 'Standard',
          variant_images: v.images,
          sizes: v.sizes || [],
          stock_quantity: v.stockQuantity ? parseInt(v.stockQuantity) : null,
          price: parseFloat(v.price),
        })),
      };

      const res = await fetch('/api/listings/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create listing');
      }
      alert('Listing published! Your product is now live.');
      window.location.href = '/seller/dashboard';
    } catch (err) {
      alert(err.message || 'Failed to create listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFoodAttribute = (key, value) => {
    setFoodAttributes((current) => {
      const selected = current[key] || [];
      return {
        ...current,
        [key]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
  };

  const toggleDrinkAttribute = (key, value) => {
    setDrinkAttributes((current) => {
      const selected = current[key] || [];
      return {
        ...current,
        [key]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full"
          style={{ animation: 'cl-spin 1s linear infinite' }}
        />
        <style jsx global>{`
          @keyframes cl-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!businessCenter) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
        <Package size={48} className="text-white/20 mb-4" />
        <h1 className="text-xl font-bold mb-2">Become a Seller First</h1>
        <p className="text-white/60 mb-6 max-w-sm">
          You need to complete seller onboarding before creating listings
        </p>
        <a
          href="/monetization-center"
          className="bg-[#D4AF37] text-black px-8 py-3.5 rounded-xl font-bold hover:opacity-90"
        >
          Start Onboarding
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold">New Listing</h1>
              <p className="text-white/50 text-xs">Step {step} of 2</p>
            </div>
          </div>
          <a
            href="/seller/dashboard"
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <X size={20} />
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block font-bold mb-2">Product Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  listingType === 'food_beverage'
                    ? 'e.g. Jollof Rice with Grilled Chicken'
                    : 'e.g. Premium Wireless Headphones'
                }
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your product..."
                rows={4}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none resize-none"
              />
            </div>

            {isFoodHubCenter && (
              <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <h2 className="text-lg font-extrabold">FoodHub listing type</h2>
                  <p className="text-white/60 text-sm mt-1">
                    Food & Drinks seller listings stay on FoodHub. Food goes to the Food tab and
                    Drinks go to the Drinks tab, never to Shop.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {FOOD_HUB_TYPES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setFoodHubType(option.value);
                        setFoodSubcategory('');
                        setCategory('');
                      }}
                      className={`text-left rounded-xl border p-4 ${
                        foodHubType === option.value
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'bg-white/5 text-white border-white/15'
                      }`}
                    >
                      <div className="font-extrabold">{option.label}</div>
                      <div className="text-xs mt-1 opacity-75">{option.description}</div>
                    </button>
                  ))}
                </div>
                {foodHubType && (
                  <div className="space-y-4">
                    <div>
                      <label className="block font-bold mb-2">
                        {foodHubType === 'drinks' ? 'Drink category' : 'Food category'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {currentFoodHubCategories.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setFoodSubcategory(item);
                              setCategory(item);
                            }}
                            className={`px-3 py-2 rounded-full border text-sm ${
                              foodSubcategory === item
                                ? 'bg-white text-black border-white'
                                : 'bg-white/5 text-white border-white/15'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                    {foodHubType === 'food' ? (
                      <div className="grid md:grid-cols-2 gap-3">
                        <input
                          placeholder="Weight / unit size"
                          value={foodAttributes.unitSize}
                          onChange={(e) =>
                            setFoodAttributes((c) => ({ ...c, unitSize: e.target.value }))
                          }
                          className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <input
                          placeholder="Best before / expiry date"
                          value={foodAttributes.bestBefore}
                          onChange={(e) =>
                            setFoodAttributes((c) => ({ ...c, bestBefore: e.target.value }))
                          }
                          className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <input
                          placeholder="Storage instructions"
                          value={foodAttributes.storageInstructions}
                          onChange={(e) =>
                            setFoodAttributes((c) => ({
                              ...c,
                              storageInstructions: e.target.value,
                            }))
                          }
                          className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <input
                          placeholder="Country of origin"
                          value={foodAttributes.countryOfOrigin}
                          onChange={(e) =>
                            setFoodAttributes((c) => ({ ...c, countryOfOrigin: e.target.value }))
                          }
                          className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <input
                          placeholder="Brand"
                          value={foodAttributes.brand}
                          onChange={(e) =>
                            setFoodAttributes((c) => ({ ...c, brand: e.target.value }))
                          }
                          className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <input
                          placeholder="Flavor / pack size"
                          value={foodAttributes.flavor}
                          onChange={(e) =>
                            setFoodAttributes((c) => ({ ...c, flavor: e.target.value }))
                          }
                          className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <textarea
                          placeholder="Ingredients"
                          value={foodAttributes.ingredients}
                          onChange={(e) =>
                            setFoodAttributes((c) => ({ ...c, ingredients: e.target.value }))
                          }
                          className="md:col-span-2 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <textarea
                          placeholder="Nutritional info: calories, fat, sugar, protein"
                          value={foodAttributes.nutrition}
                          onChange={(e) =>
                            setFoodAttributes((c) => ({ ...c, nutrition: e.target.value }))
                          }
                          className="md:col-span-2 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <div className="md:col-span-2">
                          <p className="font-bold mb-2">Allergens</p>
                          <div className="flex flex-wrap gap-2">
                            {ALLERGEN_OPTIONS.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => toggleFoodAttribute('allergens', item)}
                                className={`px-3 py-2 rounded-full border text-sm ${
                                  foodAttributes.allergens.includes(item)
                                    ? 'bg-white text-black border-white'
                                    : 'bg-white/5 text-white border-white/15'
                                }`}
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <p className="font-bold mb-2">Dietary flags</p>
                          <div className="flex flex-wrap gap-2">
                            {DIETARY_FLAGS.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => toggleFoodAttribute('dietaryFlags', item)}
                                className={`px-3 py-2 rounded-full border text-sm ${
                                  foodAttributes.dietaryFlags.includes(item)
                                    ? 'bg-white text-black border-white'
                                    : 'bg-white/5 text-white border-white/15'
                                }`}
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-3">
                        <input
                          placeholder="Volume (ml/L)"
                          value={drinkAttributes.volume}
                          onChange={(e) =>
                            setDrinkAttributes((c) => ({ ...c, volume: e.target.value }))
                          }
                          className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <input
                          placeholder="Flavor"
                          value={drinkAttributes.flavor}
                          onChange={(e) =>
                            setDrinkAttributes((c) => ({ ...c, flavor: e.target.value }))
                          }
                          className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <input
                          placeholder="ABV % if alcoholic"
                          value={drinkAttributes.abv}
                          onChange={(e) =>
                            setDrinkAttributes((c) => ({ ...c, abv: e.target.value }))
                          }
                          className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <input
                          placeholder="Caffeine content"
                          value={drinkAttributes.caffeineContent}
                          onChange={(e) =>
                            setDrinkAttributes((c) => ({ ...c, caffeineContent: e.target.value }))
                          }
                          className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <input
                          placeholder="Pack size"
                          value={drinkAttributes.packSize}
                          onChange={(e) =>
                            setDrinkAttributes((c) => ({ ...c, packSize: e.target.value }))
                          }
                          className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <input
                          placeholder="Brand / origin"
                          value={drinkAttributes.brand}
                          onChange={(e) =>
                            setDrinkAttributes((c) => ({ ...c, brand: e.target.value }))
                          }
                          className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <input
                          placeholder="Serving temperature"
                          value={drinkAttributes.servingTemperature}
                          onChange={(e) =>
                            setDrinkAttributes((c) => ({
                              ...c,
                              servingTemperature: e.target.value,
                            }))
                          }
                          className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <textarea
                          placeholder="Ingredients"
                          value={drinkAttributes.ingredients}
                          onChange={(e) =>
                            setDrinkAttributes((c) => ({ ...c, ingredients: e.target.value }))
                          }
                          className="md:col-span-2 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white"
                        />
                        <div className="md:col-span-2">
                          <p className="font-bold mb-2">Sweetness</p>
                          <div className="flex flex-wrap gap-2">
                            {SWEETNESS_LEVELS.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() =>
                                  setDrinkAttributes((c) => ({ ...c, sweetnessLevel: item }))
                                }
                                className={`px-3 py-2 rounded-full border text-sm ${
                                  drinkAttributes.sweetnessLevel === item
                                    ? 'bg-white text-black border-white'
                                    : 'bg-white/5 text-white border-white/15'
                                }`}
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <p className="font-bold mb-2">Packaging</p>
                          <div className="flex flex-wrap gap-2">
                            {PACKAGING_TYPES.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() =>
                                  setDrinkAttributes((c) => ({ ...c, packagingType: item }))
                                }
                                className={`px-3 py-2 rounded-full border text-sm ${
                                  drinkAttributes.packagingType === item
                                    ? 'bg-white text-black border-white'
                                    : 'bg-white/5 text-white border-white/15'
                                }`}
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <p className="font-bold mb-2">Dietary flags</p>
                          <div className="flex flex-wrap gap-2">
                            {DIETARY_FLAGS.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => toggleDrinkAttribute('dietaryFlags', item)}
                                className={`px-3 py-2 rounded-full border text-sm ${
                                  drinkAttributes.dietaryFlags.includes(item)
                                    ? 'bg-white text-black border-white'
                                    : 'bg-white/5 text-white border-white/15'
                                }`}
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sizing — synced with the mobile app */}
            {listingType === 'physical_goods' && (
              <div>
                <label className="block font-bold mb-1">Sizing</label>
                <p className="text-white/50 text-sm mb-3">
                  How is this product sized? Pick "No Sizing" if it doesn't apply
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SIZING_CATEGORIES.map((sc) => (
                    <button
                      key={sc.key}
                      onClick={() => setSizingCategory(sc.key)}
                      className={`p-3 rounded-xl text-left border ${
                        sizingCategory === sc.key
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37]'
                          : 'bg-white/5 border-white/15'
                      }`}
                    >
                      <span className="block text-lg mb-1">{sc.icon}</span>
                      <span className="block text-sm font-semibold">{sc.label}</span>
                      <span className="block text-white/40 text-[11px] mt-0.5">
                        {sc.description}
                      </span>
                    </button>
                  ))}
                </div>

                {(sizingCategory === 'apparel' || sizingCategory === 'shoes') && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold mb-2">Size System</p>
                    <div className="flex flex-wrap gap-2">
                      {SIZE_SYSTEMS.map((sys) => (
                        <button
                          key={sys}
                          onClick={() => setSizeSystem(sys)}
                          className={`px-3.5 py-2 rounded-full text-sm border ${
                            sizeSystem === sys
                              ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-semibold'
                              : 'bg-white/5 text-white border-white/15'
                          }`}
                        >
                          {sys}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {sizingCategory === 'apparel' && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold mb-2">Size Type</p>
                    <div className="flex flex-wrap gap-2">
                      {SIZE_TYPES.map((st) => (
                        <button
                          key={st}
                          onClick={() => setSizeType(st)}
                          className={`px-3.5 py-2 rounded-full text-sm border ${
                            sizeType === st
                              ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-semibold'
                              : 'bg-white/5 text-white border-white/15'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                if (validateStep1()) setStep(2);
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] text-black py-4 rounded-xl font-bold hover:opacity-90"
            >
              Next: Add Variants
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Variant tabs */}
            <div className="flex flex-wrap gap-2">
              {variants.map((v, idx) => (
                <button
                  key={idx}
                  onClick={() => setVariantIndex(idx)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm border ${
                    variantIndex === idx
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-semibold'
                      : 'bg-white/5 text-white border-white/15'
                  }`}
                >
                  {v.color || `Variant ${idx + 1}`}
                  {variants.length > 1 && (
                    <X
                      size={13}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeVariant(idx);
                      }}
                    />
                  )}
                </button>
              ))}
              <button
                onClick={addVariant}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border border-dashed border-white/25 text-white/70 hover:bg-white/5"
              >
                <Plus size={14} />
                Add Variant
              </button>
            </div>

            {/* Color select — optional */}
            <div>
              <label className="block font-bold mb-1">
                Color <span className="text-white/40 font-normal text-sm">(optional)</span>
              </label>
              <p className="text-white/50 text-sm mb-2">
                Skip this if colors don't apply to your product
              </p>
              <select
                value={currentVariant.color}
                onChange={(e) => updateVariant('color', e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 text-white focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="" className="bg-black">
                  No specific color (skip)
                </option>
                {COLOR_OPTIONS.map((c) => (
                  <option key={c} value={c} className="bg-black">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Per-variant sizes — synced with the mobile app */}
            {needsPerVariantSizes && sizingCategory !== 'custom' && (
              <div>
                <label className="block font-bold mb-2">
                  Available Sizes for {currentVariant.color || 'this variant'} ({sizeSystem})
                </label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {sizeOptions.map((size) => {
                    const selected = currentVariant.sizes.includes(size);
                    return (
                      <button
                        key={size}
                        onClick={() => toggleVariantSize(size)}
                        className={`px-3.5 py-2 rounded-lg text-sm border ${
                          selected
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-semibold'
                            : 'bg-white/5 text-white border-white/15'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
                {currentVariant.sizes.length > 0 && (
                  <p className="text-white/50 text-xs mt-2">
                    {currentVariant.sizes.length} size(s) selected
                  </p>
                )}
              </div>
            )}

            {needsPerVariantSizes && sizingCategory === 'custom' && (
              <div>
                <label className="block font-bold mb-2">
                  Custom Sizes for {currentVariant.color || 'this variant'}
                </label>
                <div className="flex gap-2">
                  <input
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustomSize();
                    }}
                    placeholder="e.g. Small Batch, 2m x 3m..."
                    className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
                  />
                  <button
                    onClick={addCustomSize}
                    className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-sm font-semibold hover:bg-white/20"
                  >
                    Add
                  </button>
                </div>
                {currentVariant.sizes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {currentVariant.sizes.map((size) => (
                      <span
                        key={size}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-[#D4AF37]/15 border border-[#D4AF37]/40"
                      >
                        {size}
                        <X
                          size={12}
                          className="cursor-pointer"
                          onClick={() => toggleVariantSize(size)}
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Photos */}
            <div>
              <label className="block font-bold mb-2">
                Photos for {currentVariant.color || 'this variant'} (up to 5)
              </label>
              <label
                className={`block border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-[#D4AF37]/60 ${
                  uploading || currentVariant.images.length >= 5
                    ? 'opacity-50 pointer-events-none'
                    : ''
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Upload size={28} className="text-white/40 mx-auto mb-2" />
                <p className="font-semibold text-sm">
                  {uploading ? 'Uploading...' : 'Upload Photos'}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  {currentVariant.images.length}/5 uploaded
                </p>
              </label>

              {currentVariant.images.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {currentVariant.images.map((url, idx) => (
                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stock */}
            {listingType === 'physical_goods' && (
              <div>
                <label className="block font-bold mb-2">
                  Stock Quantity for {currentVariant.color || 'this variant'}
                </label>
                <input
                  type="number"
                  value={currentVariant.stockQuantity}
                  onChange={(e) => updateVariant('stockQuantity', e.target.value)}
                  placeholder="How many do you have?"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            )}

            {/* Price */}
            <div>
              <label className="block font-bold mb-2">
                Price for {currentVariant.color || 'this variant'} (
                {businessCenter.default_currency || 'GHS'})
              </label>
              <input
                type="number"
                value={currentVariant.price}
                onChange={(e) => updateVariant('price', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
              />
              <p className="text-white/50 text-sm mt-2">
                Platform fee: 0%. You receive the full price on every sale.
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#D4AF37] text-black py-4 rounded-xl font-bold hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
