// @ts-nocheck
"use client";
import { useState, useEffect, useCallback } from "react";
import useUser from "@/utils/useUser";
import CurrencyPrice from "@/components/CurrencyPrice";
import WhipPublisher from "@/components/live/WhipPublisher";
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
  Pin,
} from "lucide-react";

export default function LiveHostPage() {
  const { data: user } = useUser();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [liveSession, setLiveSession] = useState(null);
  const [sessionProducts, setSessionProducts] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [broadcastStatus, setBroadcastStatus] = useState("");

  const fetchShowcase = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/live/showcase-products?hostId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch showcase products:", err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      window.location.href = "/account/signin";
      return;
    }
    fetchShowcase();
  }, [user, fetchShowcase]);

  useEffect(() => {
    if (!isLive || !liveSession?.id) return;
    const tick = async () => {
      try {
        const res = await fetch(`/api/live/sessions?id=${liveSession.id}`);
        if (res.ok) {
          const data = await res.json();
          setViewerCount(data.session?.viewer_count || 0);
          setSessionProducts(data.products || []);
          if (data.session?.webrtc_publish_url && !liveSession.webrtc_publish_url) {
            setLiveSession((s) => ({ ...s, ...data.session }));
          }
        }
      } catch {}
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => clearInterval(id);
  }, [isLive, liveSession?.id]);

  const handleStartLive = async () => {
    if (!title.trim()) {
      setError("Enter a title for your live session");
      return;
    }
    setStarting(true);
    setError("");
    try {
      const productIds = selectedProducts
        .filter((p) => p.item_type !== "service")
        .map((p) => p.id);
      const serviceIds = selectedProducts
        .filter((p) => p.item_type === "service")
        .map((p) => p.id);

      const res = await fetch("/api/live/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          productIds,
          serviceIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start live session");
        return;
      }
      setLiveSession(data.session);
      setSessionProducts(data.products || []);
      setIsLive(true);
      if (!data.streamReady) {
        setError(
          "Session started, but Cloudflare Stream is not configured. Add CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (Stream Write) to secrets for camera broadcast.",
        );
      }
    } catch (err) {
      console.error("Failed to start live:", err);
      setError("Failed to start live session");
    } finally {
      setStarting(false);
    }
  };

  const handleEndLive = async () => {
    if (liveSession?.id) {
      try {
        await fetch("/api/live/sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "end", sessionId: liveSession.id }),
        });
      } catch {}
    }
    setIsLive(false);
    window.location.href = "/";
  };

  const pinProduct = async (item) => {
    if (!liveSession?.id) return;
    try {
      await fetch("/api/live/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pin_product",
          sessionId: liveSession.id,
          productId: item.item_type === "service" ? null : item.product_id || item.id,
          serviceId: item.item_type === "service" ? item.service_id || item.id : null,
        }),
      });
      const res = await fetch(`/api/live/sessions?id=${liveSession.id}`);
      if (res.ok) {
        const data = await res.json();
        setSessionProducts(data.products || []);
      }
    } catch (err) {
      console.error("Pin failed:", err);
    }
  };

  const toggleProductSelection = (product) => {
    const isSelected = selectedProducts.find((p) => p.id === product.id);
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter((p) => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  if (!user) return null;

  if (isLive) {
    const watchUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/live/watch?sessionId=${liveSession?.id}`
        : "";
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="relative h-screen flex flex-col">
          {liveSession?.webrtc_publish_url ? (
            <WhipPublisher
              whipUrl={liveSession.webrtc_publish_url}
              micEnabled={micEnabled}
              videoEnabled={videoEnabled}
              onStatus={setBroadcastStatus}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
              <div className="text-center px-6">
                <div className="w-24 h-24 bg-red-500/90 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Video size={44} />
                </div>
                <p className="text-sm text-white/70">
                  Shopping session is live. Configure Cloudflare Stream to enable camera broadcast.
                </p>
                {liveSession?.rtmps_url && (
                  <p className="mt-3 text-xs text-white/50">
                    OBS: {liveSession.rtmps_url} · key in session (host only)
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none">
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2 bg-red-500 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-xs font-bold">LIVE</span>
              </div>
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Users size={16} />
                <span className="text-sm font-semibold">{viewerCount}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-white/70 truncate">{title}</p>
            {watchUrl && (
              <p className="mt-1 text-xs text-white/50 truncate">Share: {watchUrl}</p>
            )}
            {broadcastStatus === "live" && (
              <p className="mt-1 text-[10px] text-green-400">Camera connected · Cloudflare Stream</p>
            )}
          </div>

          <div className="absolute bottom-28 left-0 right-0 px-4 z-10">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sessionProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pinProduct(p)}
                  className={`flex-shrink-0 w-28 rounded-xl overflow-hidden border ${
                    p.is_featured
                      ? "border-yellow-400 bg-black/70"
                      : "border-white/10 bg-black/50"
                  }`}
                >
                  {p.product_media?.[0] && (
                    <img
                      src={
                        typeof p.product_media[0] === "string"
                          ? p.product_media[0]
                          : p.product_media[0]?.url
                      }
                      alt=""
                      className="w-full h-20 object-cover"
                    />
                  )}
                  <div className="p-2">
                    <p className="text-[11px] font-semibold line-clamp-1">{p.product_title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <CurrencyPrice
                        price={parseFloat(p.product_price)}
                        originalCurrency={p.seller_currency || "GHS"}
                        showOriginal={false}
                        size="small"
                        textStyle={{ color: "#D4AF37", fontSize: "0.7rem" }}
                      />
                      {p.is_featured && <Pin size={12} className="text-yellow-400" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 to-transparent z-10">
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setMicEnabled(!micEnabled)}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  micEnabled ? "bg-white/20" : "bg-red-500"
                }`}
              >
                {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
              </button>
              <button
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  videoEnabled ? "bg-white/20" : "bg-red-500"
                }`}
              >
                {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
              </button>
            </div>
            <button
              onClick={handleEndLive}
              className="w-full py-3.5 bg-red-500 rounded-xl font-bold hover:bg-red-600"
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
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">Go Live · Shopping</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <p className="text-sm text-white/60">
          Sellers and creators host live shopping. Viewers watch on Cloudflare Stream, chat, and buy pinned products.
        </p>

        <div>
          <label className="block text-sm font-semibold mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Tonight’s drops & flash deals"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you selling live?"
            className="w-full h-24 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            maxLength={300}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Products to showcase</label>
          <button
            onClick={() => setShowProductPicker(true)}
            className="w-full py-4 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20"
          >
            <Plus size={20} />
            Add products ({selectedProducts.length})
          </button>

          {selectedProducts.length > 0 && (
            <div className="mt-4 space-y-2">
              {selectedProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
                  {product.media?.[0] && (
                    <img
                      src={
                        typeof product.media[0] === "string"
                          ? product.media[0]
                          : product.media[0]?.url
                      }
                      alt=""
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{product.title}</p>
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
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          onClick={handleStartLive}
          disabled={starting}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
        >
          {starting ? "Starting…" : "Start Live Shopping"}
        </button>
      </div>

      {showProductPicker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-[#1A1A1A] rounded-t-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Select products</h3>
                <button
                  onClick={() => setShowProductPicker(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>
              {products.length === 0 ? (
                <p className="text-white/50 text-sm py-8 text-center">
                  No active products yet. Create a listing first, then come back to go live.
                </p>
              ) : (
                <div className="space-y-2">
                  {products.map((product) => {
                    const isSelected = selectedProducts.find((p) => p.id === product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => toggleProductSelection(product)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg ${
                          isSelected
                            ? "bg-purple-500/20 border-2 border-purple-500"
                            : "bg-white/5 border-2 border-transparent"
                        }`}
                      >
                        {product.media?.[0] && (
                          <img
                            src={
                              typeof product.media[0] === "string"
                                ? product.media[0]
                                : product.media[0]?.url
                            }
                            alt=""
                            className="w-14 h-14 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-semibold truncate">{product.title}</p>
                          <CurrencyPrice
                            price={parseFloat(product.price)}
                            originalCurrency={product.seller_currency || "GHS"}
                            showOriginal={false}
                            size="small"
                            textStyle={{ color: "#A855F7", fontSize: "0.85rem" }}
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
