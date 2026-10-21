// @ts-nocheck
"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import useUser from "@/utils/useUser";
import useLocalization from "@/utils/useLocalization";
import CurrencyPrice from "@/components/CurrencyPrice";
import BottomNav from "@/components/BottomNav";
import {
  MapPin,
  Search,
  ShoppingCart,
  Clock,
  Truck,
  X,
  LocateFixed,
  Star,
  ChevronRight,
  Flame,
  BadgePercent,
} from "lucide-react";

const BRAND = "#D4AF37";

/** Global city suggestions — not Ghana-only; aligns with multi-region Crestar. */
const GLOBAL_CITIES = [
  // Africa
  { city: "Accra", region: "Ghana", countryCode: "GH" },
  { city: "Kumasi", region: "Ghana", countryCode: "GH" },
  { city: "Lagos", region: "Nigeria", countryCode: "NG" },
  { city: "Abuja", region: "Nigeria", countryCode: "NG" },
  { city: "Nairobi", region: "Kenya", countryCode: "KE" },
  { city: "Johannesburg", region: "South Africa", countryCode: "ZA" },
  { city: "Cape Town", region: "South Africa", countryCode: "ZA" },
  { city: "Cairo", region: "Egypt", countryCode: "EG" },
  { city: "Casablanca", region: "Morocco", countryCode: "MA" },
  // Middle East
  { city: "Dubai", region: "United Arab Emirates", countryCode: "AE" },
  { city: "Abu Dhabi", region: "United Arab Emirates", countryCode: "AE" },
  { city: "Riyadh", region: "Saudi Arabia", countryCode: "SA" },
  { city: "Doha", region: "Qatar", countryCode: "QA" },
  // Europe
  { city: "London", region: "United Kingdom", countryCode: "GB" },
  { city: "Paris", region: "France", countryCode: "FR" },
  { city: "Berlin", region: "Germany", countryCode: "DE" },
  { city: "Madrid", region: "Spain", countryCode: "ES" },
  { city: "Amsterdam", region: "Netherlands", countryCode: "NL" },
  // Americas
  { city: "New York", region: "United States", countryCode: "US" },
  { city: "Los Angeles", region: "United States", countryCode: "US" },
  { city: "Toronto", region: "Canada", countryCode: "CA" },
  { city: "São Paulo", region: "Brazil", countryCode: "BR" },
  { city: "Mexico City", region: "Mexico", countryCode: "MX" },
  // Asia-Pacific
  { city: "Hong Kong", region: "Hong Kong", countryCode: "HK" },
  { city: "Singapore", region: "Singapore", countryCode: "SG" },
  { city: "Tokyo", region: "Japan", countryCode: "JP" },
  { city: "Seoul", region: "South Korea", countryCode: "KR" },
  { city: "Bangkok", region: "Thailand", countryCode: "TH" },
  { city: "Jakarta", region: "Indonesia", countryCode: "ID" },
  { city: "Mumbai", region: "India", countryCode: "IN" },
  { city: "Sydney", region: "Australia", countryCode: "AU" },
];

function foodCategories(t) {
  return [
    { id: "all", label: t("all"), icon: "🍽️" },
    { id: "local", label: t("nearMe"), icon: "📍" },
    { id: "fast", label: t("fastDelivery") || "Fast", icon: "⚡" },
    { id: "african", label: t("african"), icon: "🍲" },
    { id: "chinese", label: t("chinese"), icon: "🥡" },
    { id: "pizza", label: t("pizza"), icon: "🍕" },
    { id: "burgers", label: t("burgers"), icon: "🍔" },
    { id: "healthy", label: t("healthy"), icon: "🥗" },
  ];
}

function drinkCategories(t) {
  return [
    { id: "all", label: t("allDrinks"), icon: "🥤" },
    { id: "local", label: t("nearMe"), icon: "📍" },
    { id: "coffee", label: t("coffee"), icon: "☕" },
    { id: "juice", label: t("juice"), icon: "🧃" },
    { id: "smoothie", label: t("smoothie"), icon: "🥤" },
    { id: "tea", label: t("tea"), icon: "🍵" },
  ];
}

function firstImage(media) {
  let list = media;
  if (typeof media === "string") {
    try {
      list = JSON.parse(media);
    } catch {
      return media;
    }
  }
  if (!Array.isArray(list) || list.length === 0) return "";
  const first = list[0];
  if (typeof first === "string") return first;
  return first?.url || first?.uri || "";
}

function mapProduct(product, activeTab) {
  const attributes =
    activeTab === "drinks"
      ? product.drink_attributes || {}
      : product.food_attributes || {};
  const piecesPerPack =
    attributes.piecesPerPack ||
    attributes.pieces_per_pack ||
    attributes.packSize ||
    null;
  const packaging =
    attributes.packagingType ||
    attributes.packaging ||
    (piecesPerPack ? `Pack of ${piecesPerPack}` : "");

  return {
    id: product.id,
    name: product.title || "FoodHub item",
    category:
      product.food_subcategory ||
      product.category ||
      (activeTab === "drinks" ? "Drinks" : "Food"),
    prepMinutes: Number(product.prep_time_minutes) || 25,
    prepTime: product.prep_time_minutes
      ? `${product.prep_time_minutes} min`
      : "20–35 min",
    price: Number(product.price || 0),
    currency: product.seller_currency || "USD",
    image: firstImage(product.media) || product.thumbnail_url || "",
    sellerId: product.seller_id || product.user_id || product.creator_user_id,
    sellerName:
      product.seller_business_name ||
      product.seller_name ||
      product.seller_display_name ||
      "Kitchen",
    city: product.seller_city || product.city || "",
    region: product.seller_region || product.region || "",
    country: product.seller_country || product.country || "",
    packaging,
    piecesPerPack,
    rating: product.rating || product.avg_rating || null,
    soldCount: product.sold_count || product.orders_count || 0,
  };
}

/** Group items into kitchen / store cards (Keeta-style list). */
function groupByKitchen(items) {
  const map = new Map();
  for (const item of items) {
    const key = String(item.sellerId || item.sellerName || item.id);
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: item.sellerName || "Kitchen",
        city: item.city,
        region: item.region,
        country: item.country,
        cover: item.image,
        items: [],
        minPrep: item.prepMinutes,
        minPrice: item.price,
        currency: item.currency,
        categories: new Set(),
      });
    }
    const k = map.get(key);
    k.items.push(item);
    if (item.image && !k.cover) k.cover = item.image;
    k.minPrep = Math.min(k.minPrep, item.prepMinutes || 30);
    if (item.price < k.minPrice) {
      k.minPrice = item.price;
      k.currency = item.currency;
    }
    if (item.category) k.categories.add(item.category);
  }
  return Array.from(map.values()).map((k) => ({
    ...k,
    categories: Array.from(k.categories),
    itemCount: k.items.length,
    etaLabel: `${k.minPrep}–${k.minPrep + 15} min`,
  }));
}

function KitchenCard({ kitchen, t, onOpen }) {
  const topItems = kitchen.items.slice(0, 3);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden hover:bg-white/[0.07] transition-colors"
    >
      <div className="relative h-36 bg-white/5">
        {kitchen.cover ? (
          <img src={kitchen.cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-black/65 text-[11px] font-semibold text-white flex items-center gap-1">
            <Clock size={11} /> {kitchen.etaLabel}
          </span>
          {kitchen.minPrep <= 25 && (
            <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/90 text-[11px] font-bold text-black flex items-center gap-1">
              <Flame size={11} /> Fast
            </span>
          )}
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-white text-[15px] truncate">{kitchen.name}</h3>
            <p className="text-xs text-white/45 mt-0.5 truncate">
              {[kitchen.city, kitchen.region || kitchen.country].filter(Boolean).join(", ") ||
                (t("localKitchen") || "Local kitchen")}
              {kitchen.categories[0] ? ` · ${kitchen.categories[0]}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-xs text-white/70">
            <Star size={12} className="text-[#D4AF37]" fill={BRAND} />
            <span>{kitchen.rating ? Number(kitchen.rating).toFixed(1) : "New"}</span>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {topItems.map((it) => (
            <div
              key={it.id}
              className="shrink-0 w-28 rounded-xl border border-white/10 bg-black/40 p-1.5"
            >
              <div className="h-16 rounded-lg overflow-hidden bg-white/5 mb-1">
                {it.image ? (
                  <img src={it.image} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <p className="text-[11px] text-white/80 line-clamp-1">{it.name}</p>
              <CurrencyPrice
                price={it.price}
                originalCurrency={it.currency}
                showOriginal={false}
                size="small"
                textStyle={{ color: BRAND, fontSize: "0.7rem", fontWeight: "700" }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-white/50">
          <span>
            {kitchen.itemCount} {kitchen.itemCount === 1 ? (t("item") || "item") : (t("items") || "items")}
          </span>
          <span className="flex items-center gap-1 text-[#D4AF37] font-semibold">
            {t("viewMenu") || "View menu"} <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </button>
  );
}

function DishCard({ item, t, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.04] p-3 flex gap-3 hover:bg-white/[0.07]"
    >
      <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/5 shrink-0">
        {item.image ? (
          <img src={item.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col">
        <h3 className="font-semibold text-white text-sm line-clamp-2">{item.name}</h3>
        <p className="text-xs text-white/45 mt-0.5 truncate">
          {item.sellerName}
          {item.packaging ? ` · ${item.packaging}` : ""}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="flex items-center gap-1 text-xs text-white/55">
            <Clock size={12} /> {item.prepTime}
          </span>
          <CurrencyPrice
            price={item.price}
            originalCurrency={item.currency}
            showOriginal={false}
            size="small"
            textStyle={{ color: "#fff", fontWeight: "700", fontSize: "0.9rem" }}
          />
        </div>
      </div>
    </button>
  );
}

export default function FoodHubPage() {
  const { data: user } = useUser();
  const { t } = useLocalization();
  const [activeTab, setActiveTab] = useState("food");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [userCity, setUserCity] = useState("");
  const [userRegion, setUserRegion] = useState("");
  const [userCountry, setUserCountry] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [sortBy, setSortBy] = useState("recommended"); // recommended | fastest | price
  const [viewMode, setViewMode] = useState("kitchens"); // kitchens | dishes (food tab)
  const [selectedKitchen, setSelectedKitchen] = useState(null);
  const [askedGeo, setAskedGeo] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const foodHubType = activeTab === "drinks" ? "drinks" : "food";
      const res = await fetch(
        `/api/listings/products?productType=food_beverage&foodHubType=${foodHubType}`
      );
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems((data.products || []).map((product) => mapProduct(product, activeTab)));
    } catch (err) {
      console.error("Failed to fetch FoodHub products:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartCount(cart.reduce((sum, item) => sum + (item.quantity || 1), 0));
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("foodhub_location");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.city) {
          setUserCity(parsed.city);
          setUserRegion(parsed.region || "");
          setUserCountry(parsed.country || "");
          return;
        }
      }
    } catch {}
    // No saved location → request permission once (user can deny)
    if (askedGeo || typeof navigator === "undefined" || !navigator.geolocation) return;
    setAskedGeo(true);
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (!res.ok) return;
          const geo = await res.json();
          const city = geo.city || geo.locality || geo.principalSubdivision || "";
          const region = geo.principalSubdivision || "";
          const country = geo.countryName || "";
          if (city) persistLocation(city, region, country);
        } catch {
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        // Permission denied — leave location empty until user sets it
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  }, [askedGeo]);

  const persistLocation = (city, region, country) => {
    setUserCity(city);
    setUserRegion(region || "");
    setUserCountry(country || "");
    try {
      localStorage.setItem(
        "foodhub_location",
        JSON.stringify({ city, region: region || "", country: country || "" })
      );
    } catch {}
  };

  const useCurrentLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError(t("locationNotSupported") || "Location is not supported on this device");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (!res.ok) {
            setLocationError(t("couldNotDetectLocation") || "Couldn't detect your location. Choose a city below.");
            return;
          }
          const geo = await res.json();
          const city = geo.city || geo.locality || geo.principalSubdivision || "";
          const region = geo.principalSubdivision || "";
          const country = geo.countryName || "";
          if (!city) {
            setLocationError(t("couldNotDetectCity") || "Couldn't detect your city. Choose one below.");
            return;
          }
          persistLocation(city, region, country);
          setShowLocationModal(false);
        } catch {
          setLocationError(t("couldNotDetectLocation") || "Couldn't detect your location. Choose a city below.");
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        setLocationError(
          t("locationPermissionDenied") ||
            "Location permission denied. You can still pick a city below."
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const currentCategories =
    activeTab === "food" ? foodCategories(t) : drinkCategories(t);

  const filteredItems = useMemo(() => {
    let list = items.filter((item) => {
      if (selectedCategory === "local") {
        if (!userCity) return false;
        const cityMatch =
          item.city &&
          (item.city.toLowerCase().includes(userCity.toLowerCase()) ||
            userCity.toLowerCase().includes(item.city.toLowerCase()));
        const regionMatch =
          item.region &&
          userRegion &&
          item.region.toLowerCase().includes(userRegion.toLowerCase());
        const countryMatch =
          item.country &&
          userCountry &&
          item.country.toLowerCase().includes(userCountry.toLowerCase());
        if (!cityMatch && !regionMatch && !countryMatch) return false;
      } else if (selectedCategory === "fast") {
        if ((item.prepMinutes || 99) > 30) return false;
      } else if (selectedCategory !== "all") {
        if (
          !String(item.category || "")
            .toLowerCase()
            .includes(selectedCategory)
        )
          return false;
      }
      const haystack = `${item.name} ${item.sellerName} ${item.category}`.toLowerCase();
      return !searchQuery || haystack.includes(searchQuery.toLowerCase());
    });

    if (sortBy === "fastest") {
      list = [...list].sort((a, b) => (a.prepMinutes || 99) - (b.prepMinutes || 99));
    } else if (sortBy === "price") {
      list = [...list].sort((a, b) => a.price - b.price);
    }
    return list;
  }, [items, selectedCategory, searchQuery, userCity, userRegion, userCountry, sortBy]);

  const kitchens = useMemo(() => groupByKitchen(filteredItems), [filteredItems]);

  const filteredCities = GLOBAL_CITIES.filter(
    (c) =>
      c.city.toLowerCase().includes(citySearch.toLowerCase()) ||
      c.region.toLowerCase().includes(citySearch.toLowerCase())
  );

  const locationLabel = userCity
    ? `${userCity}${userRegion ? `, ${userRegion}` : userCountry ? `, ${userCountry}` : ""}`
    : locationLoading
      ? t("detectingLocation")
      : t("setLocation");

  // Kitchen menu overlay
  if (selectedKitchen) {
    return (
      <div className="min-h-screen bg-black text-white pb-24">
        <div className="sticky top-0 z-20 border-b border-white/10 bg-black/95 backdrop-blur">
          <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedKitchen(null)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
            >
              <X size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold truncate">{selectedKitchen.name}</h1>
              <p className="text-xs text-white/50 truncate">
                {selectedKitchen.etaLabel} · {selectedKitchen.itemCount}{" "}
                {t("items") || "items"}
              </p>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-4 py-4 space-y-3">
          {selectedKitchen.items.map((item) => (
            <DishCard
              key={item.id}
              item={item}
              t={t}
              onClick={() => {
                window.location.href = `/product/${item.id}`;
              }}
            />
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-2xl font-bold">{t("foodhub")}</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("food");
                  setSelectedCategory("all");
                  setViewMode("kitchens");
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  activeTab === "food" ? "bg-white text-black" : "bg-white/10 text-white"
                }`}
              >
                {t("food")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("drinks");
                  setSelectedCategory("all");
                  setViewMode("dishes");
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  activeTab === "drinks" ? "bg-white text-black" : "bg-white/10 text-white"
                }`}
              >
                {t("drinks")}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setLocationError("");
              setCitySearch("");
              setShowLocationModal(true);
            }}
            className="mb-3 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition-colors hover:bg-white/10"
          >
            <MapPin size={18} className="text-[#D4AF37] shrink-0" />
            <span className="text-sm font-medium text-white truncate">{locationLabel}</span>
            <span className="ml-auto text-xs text-white/55 shrink-0">{t("change")}</span>
          </button>

          <div className="mb-3 flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                placeholder={
                  activeTab === "drinks" ? t("searchDrinks") : t("searchFood")
                }
                className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pl-10 pr-4 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <a
              href={user ? "/cart" : "/account/signin"}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37] text-[11px] font-bold text-black">
                  {cartCount}
                </div>
              )}
            </a>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {currentCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition-colors ${
                  selectedCategory === cat.id
                    ? "border-[#D4AF37]/50 bg-[#D4AF37]/15 font-bold"
                    : "border-white/10 bg-white/5 font-medium"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "food" && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex gap-1.5">
                {[
                  { id: "recommended", label: t("recommended") || "For you" },
                  { id: "fastest", label: t("fastest") || "Fastest" },
                  { id: "price", label: t("price") || "Price" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSortBy(s.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      sortBy === s.id
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode("kitchens")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    viewMode === "kitchens" ? "bg-[#D4AF37] text-black" : "bg-white/10 text-white/70"
                  }`}
                >
                  {t("kitchens") || "Kitchens"}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("dishes")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    viewMode === "dishes" ? "bg-[#D4AF37] text-black" : "bg-white/10 text-white/70"
                  }`}
                >
                  {t("dishes") || "Dishes"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-5 pb-28">
        {activeTab === "food" && !loading && filteredItems.length > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-2.5 text-sm">
            <BadgePercent size={16} className="text-[#D4AF37] shrink-0" />
            <span className="text-white/80">
              {t("foodHubPromo") ||
                "Order from nearby kitchens — prep times shown before you buy. Delivery fees depend on the seller."}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#D4AF37]" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center">
            <Truck size={64} className="mx-auto mb-4 text-white/20" />
            <p className="text-lg text-white/50">
              {selectedCategory === "local" && !userCity
                ? t("setLocationToSeeNearby")
                : selectedCategory === "local"
                  ? `${t("noItemsFound")} (${userCity})`
                  : t("noItemsFound")}
            </p>
            {selectedCategory === "local" && !userCity && (
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="mt-4 rounded-full bg-[#D4AF37] px-6 py-2.5 font-semibold text-black"
              >
                {t("setLocation")}
              </button>
            )}
          </div>
        ) : activeTab === "food" && viewMode === "kitchens" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {kitchens.map((kitchen) => (
              <KitchenCard
                key={kitchen.id}
                kitchen={kitchen}
                t={t}
                onOpen={() => setSelectedKitchen(kitchen)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <DishCard
                key={item.id}
                item={item}
                t={t}
                onClick={() => {
                  window.location.href = `/product/${item.id}`;
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
          <div className="flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-white/10 bg-[#141414] sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <h3 className="text-lg font-bold">{t("yourLocation")}</h3>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locationLoading}
                className="mb-4 flex w-full items-center gap-3 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-4 hover:bg-[#D4AF37]/20 disabled:opacity-50"
              >
                <LocateFixed size={20} className="text-[#D4AF37]" />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-[#D4AF37]">
                    {locationLoading ? t("detectingLocation") : t("useCurrentLocation")}
                  </p>
                  <p className="text-xs text-white/50">
                    {t("autoDetectCityPermission") ||
                      "Uses your device location only with your permission"}
                  </p>
                </div>
              </button>
              {locationError && (
                <p className="mb-4 text-sm text-yellow-400">{locationError}</p>
              )}
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3">
                <Search size={16} className="text-white/40" />
                <input
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder={t("typeCity")}
                  className="flex-1 bg-transparent py-3 text-white placeholder-white/30 focus:outline-none"
                />
              </div>
              <p className="text-xs text-white/40 mb-2 px-1">
                {t("citiesWorldwide") || "Cities worldwide — Crestar delivers where sellers are active"}
              </p>
              <div className="space-y-1">
                {filteredCities.map((c) => (
                  <button
                    key={`${c.city}-${c.region}`}
                    type="button"
                    onClick={() => {
                      persistLocation(c.city, c.region, c.region);
                      setShowLocationModal(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left hover:bg-white/5 ${
                      userCity === c.city ? "bg-[#D4AF37]/10" : ""
                    }`}
                  >
                    <div>
                      <p className={userCity === c.city ? "font-semibold text-[#D4AF37]" : "text-white"}>
                        {c.city}
                      </p>
                      <p className="text-xs text-white/40">{c.region}</p>
                    </div>
                    {userCity === c.city && <MapPin size={16} className="text-[#D4AF37]" />}
                  </button>
                ))}
                {citySearch.trim().length >= 2 &&
                  !filteredCities.some(
                    (c) => c.city.toLowerCase() === citySearch.trim().toLowerCase()
                  ) && (
                    <button
                      type="button"
                      onClick={() => {
                        persistLocation(citySearch.trim(), "", "");
                        setShowLocationModal(false);
                      }}
                      className="w-full rounded-lg border border-dashed border-white/20 px-4 py-3 text-left hover:bg-white/5"
                    >
                      <p className="text-white">{citySearch.trim()}</p>
                      <p className="text-xs text-white/40">{t("setLocation")}</p>
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
