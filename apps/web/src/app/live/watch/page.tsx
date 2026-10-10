// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";
import useUser from "@/utils/useUser";
import CurrencyPrice from "@/components/CurrencyPrice";
import {
  ArrowLeft,
  Eye,
  Heart,
  MessageCircle,
  ShoppingBag,
  X,
  Send,
  Pin,
} from "lucide-react";

export default function LiveWatchPage() {
  const { data: user } = useUser();
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const sessionIdRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("sessionId");
    if (!sessionId) {
      setLoading(false);
      return;
    }
    sessionIdRef.current = sessionId;
    loadSession(sessionId);

    // Join + heartbeat while watching
    const join = async () => {
      try {
        await fetch("/api/live/sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join", sessionId }),
        });
      } catch {}
    };
    join();

    const heartbeat = setInterval(async () => {
      try {
        const res = await fetch("/api/live/sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "heartbeat", sessionId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.viewer_count === "number") setViewerCount(data.viewer_count);
        }
      } catch {}
    }, 20000);

    const refresh = setInterval(() => loadSession(sessionId, true), 10000);

    return () => {
      clearInterval(heartbeat);
      clearInterval(refresh);
      fetch("/api/live/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", sessionId }),
      }).catch(() => {});
    };
  }, []);

  const loadSession = async (sessionId, soft = false) => {
    try {
      const res = await fetch(`/api/live/sessions?id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setProducts(data.products || []);
        setViewerCount(data.session?.viewer_count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
    } finally {
      if (!soft) setLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !sessionIdRef.current) return;
    const text = chatInput.trim();
    setChatInput("");
    setChatMessages((m) => [...m, { id: Date.now(), text, me: true }]);
    try {
      await fetch("/api/live/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          sessionId: sessionIdRef.current,
          message: text,
        }),
      });
    } catch {}
  };

  const featured = products.find((p) => p.is_featured) || products[0];
  const mediaUrl = (m) =>
    !m ? null : typeof m === "string" ? m : m?.url || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl font-bold mb-4">Live session not found</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (session.status === "ended") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl font-bold mb-2">This live has ended</p>
          <p className="text-white/60 mb-6">{session.title}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-3 bg-purple-500 rounded-xl font-semibold"
          >
            Browse more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative h-screen">
        {session.thumbnail ? (
          <img src={session.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/60 to-pink-900/50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Eye size={36} />
              </div>
              <p className="text-2xl font-bold">{session.title || "Live Shopping"}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-red-500 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs font-bold">LIVE</span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Eye size={14} />
                <span className="text-sm font-semibold">{viewerCount}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden flex items-center justify-center">
              {session.profile_image ? (
                <img src={session.profile_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold">{(session.seller_name || "S")[0]}</span>
              )}
            </div>
            <div>
              <p className="font-bold text-sm">{session.seller_name || session.display_name || "Host"}</p>
              <p className="text-xs text-white/70">{session.title}</p>
            </div>
          </div>
        </div>

        {/* Pinned product card (TikTok-style) */}
        {featured && (
          <button
            onClick={() => setSelectedProduct(featured)}
            className="absolute right-3 top-1/3 w-36 bg-black/70 backdrop-blur-md border border-yellow-400/50 rounded-2xl overflow-hidden shadow-xl"
          >
            <div className="flex items-center gap-1 px-2 pt-2 text-yellow-400">
              <Pin size={12} />
              <span className="text-[10px] font-bold uppercase">Pinned</span>
            </div>
            {mediaUrl(featured.product_media?.[0]) && (
              <img
                src={mediaUrl(featured.product_media[0])}
                alt=""
                className="w-full h-28 object-cover"
              />
            )}
            <div className="p-2 text-left">
              <p className="text-xs font-semibold line-clamp-2">{featured.product_title}</p>
              <CurrencyPrice
                price={parseFloat(featured.product_price)}
                originalCurrency={featured.seller_currency || "GHS"}
                showOriginal={false}
                size="small"
                textStyle={{ color: "#D4AF37", fontSize: "0.85rem", fontWeight: "bold" }}
              />
              <div className="mt-2 w-full py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-[11px] font-bold text-center">
                Buy now
              </div>
            </div>
          </button>
        )}

        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="flex-1 py-3 bg-white/10 backdrop-blur-sm rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} />
              Chat
            </button>
            <button className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Heart size={20} />
            </button>
            <button
              onClick={() => featured && setSelectedProduct(featured)}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <ShoppingBag size={18} />
              Shop
            </button>
          </div>

          {products.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`flex-shrink-0 w-28 rounded-xl overflow-hidden ${
                    product.is_featured ? "ring-2 ring-yellow-400" : "bg-black/50"
                  }`}
                >
                  {mediaUrl(product.product_media?.[0]) && (
                    <img
                      src={mediaUrl(product.product_media[0])}
                      alt=""
                      className="w-full h-20 object-cover"
                    />
                  )}
                  <div className="p-1.5 bg-black/60">
                    <p className="text-[10px] font-semibold line-clamp-1">{product.product_title}</p>
                    <CurrencyPrice
                      price={parseFloat(product.product_price)}
                      originalCurrency={product.seller_currency || "GHS"}
                      showOriginal={false}
                      size="small"
                      textStyle={{ color: "#A855F7", fontSize: "0.7rem" }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}

          {chatOpen && (
            <div className="mt-3 bg-black/70 backdrop-blur-md rounded-2xl p-3 max-h-40 overflow-y-auto">
              {chatMessages.length === 0 && (
                <p className="text-xs text-white/40 mb-2">Say hi to the host…</p>
              )}
              {chatMessages.map((m) => (
                <p key={m.id} className="text-xs mb-1">
                  <span className="text-purple-300 font-semibold">{m.me ? "You" : "Viewer"}: </span>
                  {m.text}
                </p>
              ))}
              <div className="flex gap-2 mt-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder={user ? "Message…" : "Sign in to chat"}
                  disabled={!user}
                  className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none"
                />
                <button
                  onClick={sendChat}
                  disabled={!user}
                  className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-[#1A1A1A] rounded-t-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Buy from live</h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>
              {mediaUrl(selectedProduct.product_media?.[0]) && (
                <img
                  src={mediaUrl(selectedProduct.product_media[0])}
                  alt=""
                  className="w-full aspect-square object-cover rounded-xl mb-4"
                />
              )}
              <h4 className="text-lg font-bold mb-2">{selectedProduct.product_title}</h4>
              <div className="mb-4">
                <CurrencyPrice
                  price={parseFloat(selectedProduct.product_price)}
                  originalCurrency={selectedProduct.seller_currency || "GHS"}
                  showOriginal
                  size="xlarge"
                  textStyle={{ color: "#D4AF37", fontSize: "1.4rem", fontWeight: "bold" }}
                />
              </div>
              <a
                href={`/product/${selectedProduct.product_id || selectedProduct.id}`}
                className="block w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-center"
              >
                View & checkout
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
