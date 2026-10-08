// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import CurrencyPrice from "@/components/CurrencyPrice";
import useUser from "@/utils/useUser";
import {
  Search,
  Filter,
  ShoppingCart,
  Star,
  Play,
  Home,
  ShoppingBag,
  Truck,
  User,
  Plus,
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "For You", icon: "✨" },
  { id: "fashion", label: "Fashion", icon: "👗" },
  { id: "beauty", label: "Beauty", icon: "💄" },
  { id: "tech", label: "Tech", icon: "📱" },
  { id: "home", label: "Home", icon: "🏠" },
  { id: "food", label: "Food", icon: "🍕" },
];

function ProductCard({ product, onPress, onAddToCart }) {
  return (
    <div onClick={onPress} className="cursor-pointer group">
      <div className="relative mb-3 overflow-hidden rounded-xl">
        <img
          src={product.image || "/placeholder-product.png"}
          alt={product.name}
          className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {product.hasVideo && (
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
            <Play size={12} className="text-white fill-white" />
            <span className="text-white text-[10px] font-semibold">Video</span>
          </div>
        )}

        {product.discount && (
          <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-md">
            <span className="text-black text-xs font-bold">
              -{product.discount}%
            </span>
          </div>
        )}

        {product.tags && product.tags.length > 0 && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md">
            <span className="text-white text-[10px] font-semibold">
              {product.tags[0]}
            </span>
          </div>
        )}
      </div>

      <h3 className="text-white text-sm font-semibold mb-2 line-clamp-2">
        {product.name}
      </h3>

      <div className="flex items-center gap-1 mb-2">
        <Star size={12} className="text-[#FFD700] fill-[#FFD700]" />
        <span className="text-[#FFD700] text-xs font-semibold">
          {product.rating}
        </span>
        <span className="text-white/50 text-[11px]">({product.reviews})</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <CurrencyPrice
          price={product.price}
          originalCurrency={product.seller_currency || "GHS"}
          showOriginal={false}
          size="medium"
          textStyle={{
            color: "#FFFFFF",
            fontSize: "1.125rem",
            fontWeight: "bold",
          }}
        />
        {product.originalPrice && (
          <CurrencyPrice
            price={product.originalPrice}
            originalCurrency={product.seller_currency || "GHS"}
            showOriginal={false}
            size="small"
            textStyle={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.875rem",
              textDecoration: "line-through",
            }}
          />
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart(product);
        }}
        className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg py-2 hover:bg-white/20 transition-colors"
      >
        <span className="text-white text-sm font-bold">Add to Cart</span>
      </button>
    </div>
  );
}

export default function ShopPage() {
  const { data: user } = useUser();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetchProducts();
    loadCartCount();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Filter to only show physical_goods products (exclude food_beverage)
      const res = await fetch(
        "/api/listings/products?status=active&productType=physical_goods&limit=50",
      );
      if (res.ok) {
        const data = await res.json();
        const transformed = (data.products || []).map((p) => {
          const media = Array.isArray(p.media)
            ? p.media
            : typeof p.media === "string"
              ? JSON.parse(p.media)
              : [];
          return {
            id: p.id,
            name: p.title,
            price: parseFloat(p.price) || 0,
            rating: 4.5,
            reviews: 0,
            image: media[0] || null,
            seller:
              p.seller_business_name ||
              p.seller_display_name ||
              `@${p.seller_username}`,
            sellerId: p.seller_id,
            hasVideo: false,
            tags: p.is_todays_special ? ["Today's Special"] : [],
            category: (p.category || "all").toLowerCase(),
          };
        });
        setProducts(transformed);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCartCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartCount(cart.reduce((sum, item) => sum + (item.quantity || 1), 0));
    } catch {
      setCartCount(0);
    }
  };

  const handleAddToCart = (product) => {
    if (!user) {
      window.location.href = "/account/signin";
      return;
    }
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const existing = cart.find((item) => item.id === product.id);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        cart.push({ ...product, quantity: 1 });
      }
      localStorage.setItem("cart", JSON.stringify(cart));
      loadCartCount();
      alert(`${product.name} added to cart!`);
    } catch (err) {
      console.error("Failed to add to cart:", err);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black border-b border-white/10 backdrop-blur-xl bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
              />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button className="w-11 h-11 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
              <Filter size={20} className="text-white" />
            </button>

            <a
              href="/cart"
              className="w-11 h-11 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors relative"
            >
              <ShoppingCart size={20} className="text-white" />
              {cartCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-white text-black w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold">
                  {cartCount}
                </div>
              )}
            </a>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full border flex items-center gap-2 whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-white/10 border-white/30"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <span>{cat.icon}</span>
                <span
                  className={`text-sm ${selectedCategory === cat.id ? "font-bold" : "font-medium"}`}
                >
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full"></div>
            <style jsx>{`
              @keyframes spin {
                to {
                  transform: rotate(360deg);
                }
              }
              div > div {
                animation: spin 1s linear infinite;
              }
            `}</style>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/50 text-lg">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() =>
                  (window.location.href = `/product/${product.id}`)
                }
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-black border-t border-white/10 backdrop-blur-xl bg-opacity-95">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-around relative">
          <a href="/" className="flex flex-col items-center gap-1 py-2">
            <Home size={26} className="text-white/60" />
            <span className="text-xs font-semibold text-white/60">Home</span>
          </a>
          <a href="/shop" className="flex flex-col items-center gap-1 py-2">
            <ShoppingBag size={26} className="text-white" />
            <span className="text-xs font-semibold text-white">Shop</span>
          </a>

          {/* Circular Create Button */}
          <a href="/create" className="flex flex-col items-center">
            <div className="relative -mt-6">
              <div className="w-16 h-16 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-lg border-4 border-black">
                <Plus size={32} color="white" strokeWidth={3} />
              </div>
            </div>
          </a>

          <a href="/foodhub" className="flex flex-col items-center gap-1 py-2">
            <Truck size={26} className="text-white/60" />
            <span className="text-xs font-semibold text-white/60">FoodHub</span>
          </a>
          {user ? (
            <a
              href="/profile"
              className="flex flex-col items-center gap-1 py-2"
            >
              <User size={26} className="text-white/60" />
              <span className="text-xs font-semibold text-white/60">
                Profile
              </span>
            </a>
          ) : (
            <a
              href="/account/signin"
              className="flex flex-col items-center gap-1 py-2"
            >
              <User size={26} className="text-white/60" />
              <span className="text-xs font-semibold text-white/60">
                Sign In
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
