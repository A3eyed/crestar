// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import useUser from "@/utils/useUser";
import CurrencyPrice from "@/components/CurrencyPrice";
import {
  ArrowLeft,
  Eye,
  Heart,
  MessageCircle,
  ShoppingBag,
  X,
  Check,
} from "lucide-react";

export default function LiveWatchPage() {
  const { data: user } = useUser();
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("sessionId");
    if (sessionId) {
      fetchSession(sessionId);
      fetchSessionProducts(sessionId);
    }
  }, []);

  const fetchSession = async (sessionId) => {
    try {
      const res = await fetch(`/api/live/sessions?id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setViewerCount(data.session?.viewer_count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionProducts = async (sessionId) => {
    try {
      const res = await fetch(
        `/api/live/showcase-products?sessionId=${sessionId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl font-bold mb-4">Session not found</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:opacity-90"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Live Stream View */}
      <div className="relative h-screen">
        {/* Thumbnail/Placeholder */}
        {session.thumbnail ? (
          <img
            src={session.thumbnail}
            alt="Live stream"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Eye size={40} className="text-white" />
              </div>
              <p className="text-2xl font-bold">
                {session.title || "Live Session"}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex items-center gap-3">
              {/* Live Badge */}
              <div className="flex items-center gap-2 bg-red-500 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                <span className="text-white text-xs font-bold">LIVE</span>
              </div>

              {/* Viewer Count */}
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Eye size={16} />
                <span className="text-sm font-semibold">{viewerCount}</span>
              </div>
            </div>
          </div>

          {/* Host Info */}
          <div className="flex items-center gap-3 mt-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              {session.profile_image ? (
                <img
                  src={session.profile_image}
                  alt={session.seller_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold">
                  {session.seller_name?.[0] || "S"}
                </span>
              )}
            </div>
            <div>
              <p className="font-bold">{session.seller_name || "Seller"}</p>
              <p className="text-sm text-white/80">
                {session.title || "Live now"}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <button className="flex-1 py-3 bg-white/10 backdrop-blur-sm rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors">
              <MessageCircle size={20} />
              Chat
            </button>
            <button className="flex-1 py-3 bg-purple-500 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <Heart size={20} />
              Like
            </button>
          </div>

          {/* Showcased Products */}
          {products.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white/80">
                Featured Products
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className="flex-shrink-0 w-32 bg-black/60 backdrop-blur-sm rounded-xl overflow-hidden"
                  >
                    {product.product_media?.[0] && (
                      <img
                        src={product.product_media[0]}
                        alt={product.product_title}
                        className="w-full h-24 object-cover"
                      />
                    )}
                    <div className="p-2">
                      <p className="text-xs font-semibold line-clamp-1">
                        {product.product_title}
                      </p>
                      <CurrencyPrice
                        price={parseFloat(product.product_price)}
                        originalCurrency={product.seller_currency || "GHS"}
                        showOriginal={false}
                        size="small"
                        textStyle={{
                          color: "#A855F7",
                          fontSize: "0.875rem",
                          fontWeight: "bold",
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-[#1A1A1A] rounded-t-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Product Details</h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              {selectedProduct.product_media?.[0] && (
                <img
                  src={selectedProduct.product_media[0]}
                  alt={selectedProduct.product_title}
                  className="w-full aspect-square object-cover rounded-xl mb-4"
                />
              )}

              <h4 className="text-lg font-bold mb-2">
                {selectedProduct.product_title}
              </h4>
              <div className="mb-4">
                <CurrencyPrice
                  price={parseFloat(selectedProduct.product_price)}
                  originalCurrency={selectedProduct.seller_currency || "GHS"}
                  showOriginal={true}
                  size="xlarge"
                  textStyle={{
                    color: "#A855F7",
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                  }}
                />
              </div>

              <a
                href={`/product/${selectedProduct.product_id}`}
                className="block w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-center hover:opacity-90 transition-opacity"
              >
                View Full Details
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
