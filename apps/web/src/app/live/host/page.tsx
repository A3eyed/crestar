// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import useUser from "@/utils/useUser";
import CurrencyPrice from "@/components/CurrencyPrice";
import {
  ArrowLeft,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Users,
  ShoppingBag,
  Plus,
  X,
} from "lucide-react";

export default function LiveHostPage() {
  const { data: user } = useUser();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  useEffect(() => {
    if (!user) {
      window.location.href = "/account/signin";
      return;
    }
    fetchUserProducts();
  }, [user]);

  const fetchUserProducts = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/listings/products?sellerId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  const handleStartLive = async () => {
    if (!title) {
      alert("Please enter a title for your live session");
      return;
    }

    try {
      const res = await fetch("/api/live/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          productIds: selectedProducts.map((p) => p.id),
        }),
      });

      if (res.ok) {
        setIsLive(true);
      } else {
        alert("Failed to start live session");
      }
    } catch (err) {
      console.error("Failed to start live:", err);
      alert("Failed to start live session");
    }
  };

  const handleEndLive = async () => {
    setIsLive(false);
    window.location.href = "/";
  };

  const toggleProductSelection = (product) => {
    const isSelected = selectedProducts.find((p) => p.id === product.id);
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter((p) => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  if (!user) {
    return null;
  }

  if (isLive) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="relative h-screen bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-red-500 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                <span className="text-white text-xs font-bold">LIVE</span>
              </div>

              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Users size={16} />
                <span className="text-sm font-semibold">0</span>
              </div>
            </div>
          </div>

          {/* Center Content */}
          <div className="text-center">
            <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Video size={64} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            <p className="text-white/80 mb-8">{description}</p>

            {selectedProducts.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-white/60 mb-3">
                  {selectedProducts.length} product(s) showcased
                </p>
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setMicEnabled(!micEnabled)}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  micEnabled ? "bg-white/20" : "bg-red-500"
                }`}
              >
                {micEnabled ? <Mic size={24} /> : <MicOff size={24} />}
              </button>

              <button
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  videoEnabled ? "bg-white/20" : "bg-red-500"
                }`}
              >
                {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
            </div>

            <button
              onClick={handleEndLive}
              className="w-full py-4 bg-red-500 rounded-xl font-bold hover:bg-red-600 transition-colors"
            >
              End Live Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Start Live Session</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            Live Session Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., New arrivals showcase"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell viewers what to expect..."
            className="w-full h-24 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            maxLength={300}
          />
        </div>

        {/* Products */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            Showcase Products
          </label>
          <button
            onClick={() => setShowProductPicker(true)}
            className="w-full py-4 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
          >
            <Plus size={20} />
            Add Products ({selectedProducts.length})
          </button>

          {selectedProducts.length > 0 && (
            <div className="mt-4 space-y-2">
              {selectedProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 bg-white/5 p-3 rounded-lg"
                >
                  {product.media?.[0] && (
                    <img
                      src={product.media[0]}
                      alt={product.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{product.title}</p>
                    <CurrencyPrice
                      price={parseFloat(product.price)}
                      originalCurrency={product.seller_currency || "GHS"}
                      showOriginal={false}
                      size="small"
                      textStyle={{ color: "#A855F7", fontSize: "0.75rem" }}
                    />
                  </div>
                  <button
                    onClick={() => toggleProductSelection(product)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartLive}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          Start Live Session
        </button>
      </div>

      {/* Product Picker Modal */}
      {showProductPicker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-[#1A1A1A] rounded-t-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Select Products</h3>
                <button
                  onClick={() => setShowProductPicker(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2">
                {products.map((product) => {
                  const isSelected = selectedProducts.find(
                    (p) => p.id === product.id,
                  );
                  return (
                    <button
                      key={product.id}
                      onClick={() => toggleProductSelection(product)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-purple-500/20 border-2 border-purple-500"
                          : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                      }`}
                    >
                      {product.media?.[0] && (
                        <img
                          src={product.media[0]}
                          alt={product.title}
                          className="w-16 h-16 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-semibold">{product.title}</p>
                        <CurrencyPrice
                          price={parseFloat(product.price)}
                          originalCurrency={product.seller_currency || "GHS"}
                          showOriginal={false}
                          size="small"
                          textStyle={{ color: "#A855F7", fontSize: "0.875rem" }}
                        />
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <ShoppingBag size={14} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
