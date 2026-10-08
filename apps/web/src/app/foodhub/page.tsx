// @ts-nocheck
"use client";
import { useState, useEffect, useCallback } from "react";
import useUser from "@/utils/useUser";
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
} from "lucide-react";

const FOOD_CATEGORIES = [
  { id: "all", label: "All", icon: "🍽️" },
  { id: "local", label: "Near Me", icon: "📍" },
  { id: "african", label: "African", icon: "🍲" },
  { id: "chinese", label: "Chinese", icon: "🥡" },
  { id: "pizza", label: "Pizza", icon: "🍕" },
  { id: "burgers", label: "Burgers", icon: "🍔" },
  { id: "healthy", label: "Healthy", icon: "🥗" },
];

const DRINK_CATEGORIES = [
  { id: "all", label: "All Drinks", icon: "🥤" },
  { id: "local", label: "Near Me", icon: "📍" },
  { id: "coffee", label: "Coffee", icon: "☕" },
  { id: "juice", label: "Juice", icon: "🧃" },
  { id: "smoothie", label: "Smoothie", icon: "🥤" },
  { id: "tea", label: "Tea", icon: "🍵" },
];

const POPULAR_CITIES = [
  { city: "Accra", region: "Greater Accra" },
  { city: "Kumasi", region: "Ashanti" },
  { city: "Tamale", region: "Northern" },
  { city: "Takoradi", region: "Western" },
  { city: "Cape Coast", region: "Central" },
  { city: "Tema", region: "Greater Accra" },
  { city: "Koforidua", region: "Eastern" },
  { city: "Sunyani", region: "Bono" },
  { city: "Ho", region: "Volta" },
  { city: "Wa", region: "Upper West" },
  { city: "Bolgatanga", region: "Upper East" },
  { city: "Techiman", region: "Bono East" },
];

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
  return {
    id: product.id,
    name: product.title || "FoodHub item",
    category:
      product.food_subcategory ||
      product.category ||
      (activeTab === "drinks" ? "Drinks" : "Food"),
    prepTime: product.prep_time_minutes
      ? `${product.prep_time_minutes} min`
      : "20-30 min",
    price: Number(product.price || 0),
    currency: product.seller_currency || "GHS",
    image: firstImage(product.media) || product.thumbnail_url || "",
    sellerName:
      product.seller_business_name ||
      product.seller_name ||
      product.seller_display_name ||
      "",
    city: product.seller_city || product.city || "",
    region: product.seller_region || product.region || "",
    packaging: attributes.packagingType || "",
  };
}

function ProductCard({ item, onClick }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
    >
      <img
        src={item.image || "/placeholder-restaurant.png"}
        alt={item.name}
        className="mb-3 h-40 w-full rounded-lg object-cover"
      />
      <h3 className="mb-1 text-base font-bold text-white">{item.name}</h3>
      <p className="text-sm text-white/60">{item.category}</p>
      {item.sellerName ? (
        <p className="mt-1 text-xs text-white/40">by {item.sellerName}</p>
      ) : null}
      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
        <span className="flex items-center gap-1 text-sm text-white/60">
          <Clock size={14} />
          {item.prepTime}
        </span>
        <CurrencyPrice
          price={item.price}
          originalCurrency={item.currency}
          showOriginal={false}
          size="medium"
          textStyle={{ color: "#FFFFFF", fontWeight: "bold" }}
        />
      </div>
    </div>
  );
}

export default function FoodHubPage() {
  const { data: user } = useUser();
  const [activeTab, setActiveTab] = useState("food");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [userCity, setUserCity] = useState("");
  const [userRegion, setUserRegion] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [citySearch, setCitySearch] = useState("");

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
      setItems(
        (data.products || []).map((product) => mapProduct(product, activeTab))
      );
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
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.city) {
        setUserCity(parsed.city);
        setUserRegion(parsed.region || "");
      }
    } catch (e) {}
  }, []);

  const persistLocation = (city, region) => {
    setUserCity(city);
    setUserRegion(region || "");
    try {
      localStorage.setItem(
        "foodhub_location",
        JSON.stringify({ city, region: region || "" })
      );
    } catch (e) {}
  };

  const useCurrentLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser");
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
            setLocationError(
              "Couldn't detect your location. Please select your city below."
            );
            return;
          }
          const geo = await res.json();
          const city =
            geo.city || geo.locality || geo.principalSubdivision || "";
          const region = geo.principalSubdivision || "";
          if (!city) {
            setLocationError(
              "Couldn't detect your city. Please select it below."
            );
            return;
          }
          persistLocation(city, region);
          setShowLocationModal(false);
        } catch (e) {
          setLocationError(
            "Couldn't detect your location. Please select your city below."
          );
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        setLocationError(
          "Location permission denied. Please select your city below."
        );
      },
      { timeout: 10000 }
    );
  };

  const currentCategories =
    activeTab === "food" ? FOOD_CATEGORIES : DRINK_CATEGORIES;
  const filteredItems = items.filter((item) => {
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
      if (!cityMatch && !regionMatch) return false;
    } else if (selectedCategory !== "all") {
      if (
        !String(item.category || "")
          .toLowerCase()
          .includes(selectedCategory)
      )
        return false;
    }
    const haystack = `${item.name} ${item.sellerName}`.toLowerCase();
    return !searchQuery || haystack.includes(searchQuery.toLowerCase());
  });
  const filteredCities = POPULAR_CITIES.filter(
    (c) =>
      c.city.toLowerCase().includes(citySearch.toLowerCase()) ||
      c.region.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">FoodHub</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveTab("food");
                  setSelectedCategory("all");
                }}
                className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                  activeTab === "food"
                    ? "bg-white text-black"
                    : "bg-white/10 text-white"
                }`}
              >
                Food
              </button>
              <button
                onClick={() => {
                  setActiveTab("drinks");
                  setSelectedCategory("all");
                }}
                className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                  activeTab === "drinks"
                    ? "bg-white text-black"
                    : "bg-white/10 text-white"
                }`}
              >
                Drinks
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              setLocationError("");
              setCitySearch("");
              setShowLocationModal(true);
            }}
            className="mb-4 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition-colors hover:bg-white/10"
          >
            <MapPin size={18} className="text-[#D4AF37]" />
            <span className="text-sm font-medium text-white">
              {userCity
                ? `${userCity}${userRegion ? `, ${userRegion}` : ""}`
                : "Set your location"}
            </span>
            <span className="ml-auto text-xs text-white/60">Change</span>
          </button>
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
              />
              <input
                type="text"
                placeholder={
                  activeTab === "drinks" ? "Search drinks..." : "Search food..."
                }
                className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pl-10 pr-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <a
              href={user ? "/cart" : "/account/signin"}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 transition-colors hover:bg-white/20"
            >
              <ShoppingCart size={20} className="text-white" />
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
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 transition-colors ${
                  selectedCategory === cat.id
                    ? "border-white/30 bg-white/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span>{cat.icon}</span>
                <span
                  className={`text-sm ${
                    selectedCategory === cat.id ? "font-bold" : "font-medium"
                  }`}
                >
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#D4AF37]" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center">
            <Truck size={64} className="mx-auto mb-4 text-white/20" />
            <p className="text-lg text-white/50">
              {selectedCategory === "local" && !userCity
                ? "Set your location to see items near you"
                : selectedCategory === "local"
                ? `No ${activeTab} items found in ${userCity}`
                : `No ${activeTab} items found`}
            </p>
            {selectedCategory === "local" && !userCity && (
              <button
                onClick={() => setShowLocationModal(true)}
                className="mt-4 rounded-lg bg-[#D4AF37] px-6 py-2.5 font-semibold text-black hover:opacity-90"
              >
                Set Location
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
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
          <div className="flex max-h-[80vh] w-full flex-col rounded-t-2xl border border-white/10 bg-[#141414] sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <h3 className="text-lg font-bold">Your Location</h3>
              <button
                onClick={() => setShowLocationModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <button
                onClick={useCurrentLocation}
                disabled={locationLoading}
                className="mb-4 flex w-full items-center gap-3 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-4 transition-colors hover:bg-[#D4AF37]/20 disabled:opacity-50"
              >
                <LocateFixed size={20} className="text-[#D4AF37]" />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-[#D4AF37]">
                    {locationLoading
                      ? "Detecting your location..."
                      : "Use Current Location"}
                  </p>
                  <p className="text-xs text-white/50">
                    Automatically detect your city
                  </p>
                </div>
              </button>
              {locationError && (
                <p className="mb-4 text-sm text-yellow-400">{locationError}</p>
              )}
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3">
                <Search size={16} className="text-white/40" />
                <input
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Type your city name..."
                  className="flex-1 bg-transparent py-3 text-white placeholder-white/30 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                {filteredCities.map((c) => (
                  <button
                    key={`${c.city}-${c.region}`}
                    onClick={() => {
                      persistLocation(c.city, c.region);
                      setShowLocationModal(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left hover:bg-white/5 ${
                      userCity === c.city ? "bg-[#D4AF37]/10" : ""
                    }`}
                  >
                    <div>
                      <p
                        className={
                          userCity === c.city
                            ? "font-semibold text-[#D4AF37]"
                            : "text-white"
                        }
                      >
                        {c.city}
                      </p>
                      <p className="text-xs text-white/40">{c.region} Region</p>
                    </div>
                    {userCity === c.city && (
                      <MapPin size={16} className="text-[#D4AF37]" />
                    )}
                  </button>
                ))}
                {citySearch.trim().length >= 2 &&
                  !filteredCities.some(
                    (c) => c.city.toLowerCase() === citySearch.toLowerCase()
                  ) && (
                    <button
                      onClick={() => {
                        persistLocation(citySearch.trim(), "");
                        setShowLocationModal(false);
                      }}
                      className="w-full rounded-lg border border-dashed border-white/20 px-4 py-3 text-left hover:bg-white/5"
                    >
                      <p className="text-white">Use "{citySearch.trim()}"</p>
                      <p className="text-xs text-white/40">Set as your city</p>
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