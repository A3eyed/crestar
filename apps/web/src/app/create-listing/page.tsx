// @ts-nocheck
'use client';
import { useState, useEffect, useCallback } from 'react';
import useUser from '@/utils/useUser';
import useUpload from '@/utils/useUpload';
import { X, Plus, ChevronRight, ChevronLeft, Package, Upload } from 'lucide-react';
import {
  SIZING_CATEGORIES,
  SIZE_SYSTEMS,
  SIZE_TYPES,
  PER_VARIANT_SIZING,
  getSizeOptions,
} from '@/utils/sizingUtils';

const PRODUCT_CATEGORIES = [
  'Electronics', 'Phones & Tablets', 'Computers & Accessories', 'Fashion & Clothing',
  'Shoes', 'Bags & Accessories', 'Jewelry & Watches', 'Beauty & Personal Care',
  'Health & Wellness', 'Home & Furniture', 'Appliances', 'Baby & Kids',
  'Sports & Outdoors', 'Automotive', 'Books & Stationery', 'Groceries', 'Other',
];

const FOOD_HUB_TYPES = [
  { value: 'food', label: 'Food', description: 'Meals, groceries, bakery, snacks' },
  { value: 'drinks', label: 'Drinks', description: 'Water, soft drinks, juices, coffee' },
];
const STANDARD_FOOD_CATEGORIES = ['Fresh Produce','Meat & Poultry','Seafood','Dairy & Eggs','Bakery','Pantry Staples','Snacks & Confectionery','Frozen Food','Ready Meals','Special Diets'];
const STANDARD_DRINK_CATEGORIES = ['Water','Soft Drinks','Juices','Energy Drinks','Coffee','Tea','Plant-Based Milk','Alcoholic','Hot Chocolate / Other Hot Drinks'];
const COLOR_OPTIONS = ['Black','White','Red','Blue','Green','Yellow','Orange','Purple','Pink','Gray','Brown','Beige','Navy','Maroon','Gold','Silver','Multi-Color'];

export default function CreateListingPage() {
  const { data: user, loading: userLoading } = useUser();
  const [upload, { loading: uploading }] = useUpload();
  const [businessCenter, setBusinessCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [sizingCategory, setSizingCategory] = useState('none');
  const [sizeSystem, setSizeSystem] = useState('US');
  const [sizeType, setSizeType] = useState('Regular');
  const [variants, setVariants] = useState([{ color: '', images: [], stockQuantity: '', price: '', sizes: [] }]);
  const [variantIndex, setVariantIndex] = useState(0);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [foodHubType, setFoodHubType] = useState(null);
  const [foodSubcategory, setFoodSubcategory] = useState('');

  const fetchCenter = useCallback(async () => {
    try {
      const res = await fetch('/api/business-centers');
      if (res.ok) {
        const data = await res.json();
        if (
          data.has_center &&
          (data.center.center_type === 'seller' || data.center.center_type === 'foodhub') &&
          (data.center.verification_status === 'approved' || data.center.status === 'active')
        ) {
          setBusinessCenter(data.center);
        }
      }
    } catch (err) {
      console.error(err);
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

  const listingType = businessCenter?.center_type === 'foodhub' ? 'food_beverage' : 'physical_goods';
  const isFoodHubCenter = businessCenter?.center_type === 'foodhub';
  const currentVariant = variants[variantIndex];
  const needsPerVariantSizes =
    listingType === 'physical_goods' &&
    sizingCategory &&
    sizingCategory !== 'none' &&
    PER_VARIANT_SIZING.includes(sizingCategory);
  const sizeOptions = getSizeOptions(sizingCategory, sizeSystem);
  const currentFoodHubCategories =
    foodHubType === 'drinks' ? STANDARD_DRINK_CATEGORIES : STANDARD_FOOD_CATEGORIES;

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const current = variants[variantIndex];
    const uploadsToDo = files.slice(0, 5 - current.images.length);
    const uploaded = [];
    for (const file of uploadsToDo) {
      const { url, error } = await upload({ file });
      if (!error && url) uploaded.push(url);
    }
    if (uploaded.length) {
      setVariants((prev) => {
        const next = [...prev];
        next[variantIndex] = {
          ...next[variantIndex],
          images: [...next[variantIndex].images, ...uploaded],
        };
        return next;
      });
    }
    e.target.value = '';
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
    const finalCategory =
      category === 'Other' ? customCategory.trim() : (category || '').trim();
    const missing = [];
    if (!(title || '').trim()) missing.push('title');
    if (!(description || '').trim()) missing.push('description');
    if (isFoodHubCenter) {
      if (!foodHubType) missing.push('Food or Drinks type');
      if (!foodSubcategory) missing.push('category');
    } else if (!finalCategory) {
      missing.push('category');
    }
    if (missing.length) {
      alert('Please add a ' + missing.join(' and ') + ' to continue.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const label = v.color || ('Variant ' + (i + 1));
      if (v.images.length === 0) return alert('Please add at least one image for ' + label);
      if (!v.price) return alert('Please set a price for ' + label);
      if (listingType === 'physical_goods' && !v.stockQuantity)
        return alert('Please enter stock quantity for ' + label);
      if (needsPerVariantSizes && sizingCategory !== 'custom' && v.sizes.length === 0)
        return alert('Please select at least one size for ' + label);
    }
    setSubmitting(true);
    try {
      const allMedia = variants.flatMap((v) => v.images);
      const finalCategory = category === 'Other' ? customCategory.trim() : category;
      const payload = {
        productType: isFoodHubCenter ? 'food_beverage' : 'physical_goods',
        title: title.trim(),
        description: description.trim(),
        media: allMedia,
        price: parseFloat(variants[0].price),
        category: isFoodHubCenter ? foodSubcategory : finalCategory,
        foodHubType: isFoodHubCenter ? foodHubType : null,
        foodSubcategory: isFoodHubCenter ? foodSubcategory : null,
        sizingCategory: listingType === 'physical_goods' ? sizingCategory : null,
        sizeSystem: needsPerVariantSizes ? sizeSystem : null,
        sizeType: needsPerVariantSizes ? sizeType : null,
        variants: variants.map((v) => ({
          variant_type: 'color',
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

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  if (!businessCenter) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
        <Package size={48} className="text-white/20 mb-4" />
        <h1 className="text-xl font-bold mb-2">Become a Seller First</h1>
        <p className="text-white/60 mb-6 max-w-sm">
          Complete seller onboarding before creating listings
        </p>
        <a
          href="/monetization-center"
          className="bg-[#D4AF37] text-black px-8 py-3.5 rounded-xl font-bold"
        >
          Start Onboarding
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
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
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
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
                placeholder="e.g. Premium Wireless Headphones"
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

            {!isFoodHubCenter && (
              <div>
                <label className="block font-bold mb-2">Category</label>
                <p className="text-white/50 text-sm mb-3">
                  Choose where this item should appear in Shop
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_CATEGORIES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setCategory(item);
                        if (item !== 'Other') setCustomCategory('');
                      }}
                      className={
                        'px-3.5 py-2 rounded-full text-sm border ' +
                        (category === item
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-semibold'
                          : 'bg-white/5 text-white border-white/15')
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {category === 'Other' && (
                  <input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Type your category"
                    className="mt-3 w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
                  />
                )}
              </div>
            )}

            {isFoodHubCenter && (
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h2 className="text-lg font-extrabold">FoodHub listing type</h2>
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
                      className={
                        'text-left rounded-xl border p-4 ' +
                        (foodHubType === option.value
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'bg-white/5 text-white border-white/15')
                      }
                    >
                      <div className="font-extrabold">{option.label}</div>
                      <div className="text-xs mt-1 opacity-75">{option.description}</div>
                    </button>
                  ))}
                </div>
                {foodHubType && (
                  <div className="flex flex-wrap gap-2">
                    {currentFoodHubCategories.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setFoodSubcategory(item);
                          setCategory(item);
                        }}
                        className={
                          'px-3 py-2 rounded-full border text-sm ' +
                          (foodSubcategory === item
                            ? 'bg-white text-black border-white'
                            : 'bg-white/5 text-white border-white/15')
                        }
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {listingType === 'physical_goods' && (
              <div>
                <label className="block font-bold mb-1">Sizing</label>
                <p className="text-white/50 text-sm mb-3">How buyers choose a size for this item</p>
                <div className="grid grid-cols-2 gap-2">
                  {SIZING_CATEGORIES.map((sc) => (
                    <button
                      key={sc.key}
                      type="button"
                      onClick={() => setSizingCategory(sc.key)}
                      className={
                        'text-left rounded-xl border p-3 ' +
                        (sizingCategory === sc.key
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37]'
                          : 'bg-white/5 border-white/15')
                      }
                    >
                      <div className="font-semibold text-sm">{sc.label}</div>
                      <div className="text-white/50 text-xs mt-0.5">{sc.hint}</div>
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
                          type="button"
                          onClick={() => setSizeSystem(sys)}
                          className={
                            'px-3.5 py-2 rounded-full text-sm border ' +
                            (sizeSystem === sys
                              ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-semibold'
                              : 'bg-white/5 text-white border-white/15')
                          }
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
                          type="button"
                          onClick={() => setSizeType(st)}
                          className={
                            'px-3.5 py-2 rounded-full text-sm border ' +
                            (sizeType === st
                              ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-semibold'
                              : 'bg-white/5 text-white border-white/15')
                          }
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
              type="button"
              onClick={() => {
                if (validateStep1()) setStep(2);
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] text-black py-4 rounded-xl font-bold active:opacity-90"
            >
              Next: Add Variants <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {variants.map((v, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setVariantIndex(idx)}
                  className={
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm border ' +
                    (variantIndex === idx
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-semibold'
                      : 'bg-white/5 text-white border-white/15')
                  }
                >
                  {v.color || ('Variant ' + (idx + 1))}
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
                type="button"
                onClick={addVariant}
                className="px-4 py-2 rounded-full text-sm border border-dashed border-white/30 text-white/70 flex items-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <div>
              <label className="block font-bold mb-2">Color (optional)</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateVariant('color', c)}
                    className={
                      'px-3 py-1.5 rounded-full text-sm border ' +
                      (currentVariant.color === c
                        ? 'bg-white text-black border-white'
                        : 'bg-white/5 text-white border-white/15')
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold mb-2">Photos</label>
              <div className="flex flex-wrap gap-2">
                {currentVariant.images.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden bg-white/10">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        updateVariant(
                          'images',
                          currentVariant.images.filter((_, j) => j !== i),
                        )
                      }
                      className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {currentVariant.images.length < 5 && (
                  <label className="w-24 h-24 rounded-lg border border-dashed border-white/30 flex flex-col items-center justify-center cursor-pointer">
                    <Upload size={18} className="text-white/50" />
                    <span className="text-[10px] text-white/40 mt-1">
                      {uploading ? 'Uploading…' : 'Add'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-2">Price (GHS)</label>
                <input
                  value={currentVariant.price}
                  onChange={(e) => updateVariant('price', e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold mb-2">Stock</label>
                <input
                  value={currentVariant.stockQuantity}
                  onChange={(e) => updateVariant('stockQuantity', e.target.value)}
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>

            {needsPerVariantSizes && (
              <div>
                <label className="block font-bold mb-2">Sizes</label>
                <div className="flex flex-wrap gap-2">
                  {(sizeOptions || []).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleVariantSize(s)}
                      className={
                        'px-3 py-1.5 rounded-full text-sm border ' +
                        (currentVariant.sizes.includes(s)
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'bg-white/5 text-white border-white/15')
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    placeholder="Custom size"
                    className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = customSizeInput.trim();
                      if (v) {
                        toggleVariantSize(v);
                        setCustomSizeInput('');
                      }
                    }}
                    className="px-3 py-2 bg-white/10 rounded-xl text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full bg-[#D4AF37] text-black py-4 rounded-xl font-bold disabled:opacity-50"
            >
              {submitting ? 'Publishing…' : 'Publish Listing'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
