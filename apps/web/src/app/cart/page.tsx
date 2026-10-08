// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import useUser from "@/utils/useUser";
import CurrencyPrice from "@/components/CurrencyPrice";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const { data: user } = useUser();
  const [cart, setCart] = useState([]);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    try {
      if (typeof window !== "undefined") {
        const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
        setCart(savedCart);
      }
    } catch {
      setCart([]);
    }
  };

  const updateQuantity = (itemId, change) => {
    const updated = cart.map((item) => {
      if (item.id === itemId) {
        const newQty = Math.max(1, (item.quantity || 1) + change);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setCart(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(updated));
    }
  };

  const removeItem = (itemId) => {
    const updated = cart.filter((item) => item.id !== itemId);
    setCart(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(updated));
    }
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0,
  );
  const deliveryFee = cart.length > 0 ? 5 : 0;
  const total = subtotal + deliveryFee;

  // Assume all items use GHS (or read from item.currency if available)
  const cartCurrency = cart[0]?.currency || cart[0]?.seller_currency || "GHS";

  const handleCheckout = () => {
    if (!user) {
      window.location.href = "/account/signin";
      return;
    }
    window.location.href = "/checkout";
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black border-b border-white/10 backdrop-blur-xl bg-opacity-95">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <a
            href="/shop"
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </a>
          <h1 className="text-xl font-bold">Shopping Cart</h1>
          <span className="ml-auto text-white/60 text-sm">
            {cart.length} {cart.length === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={64} className="text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-white/50 mb-6">
              Add some products to get started
            </p>
            <a
              href="/shop"
              className="inline-block bg-white text-black px-8 py-3 rounded-lg font-bold hover:bg-white/90 transition-colors"
            >
              Start Shopping
            </a>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-4 mb-6">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4"
                >
                  <img
                    src={item.image || "/placeholder-product.png"}
                    alt={item.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />

                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">
                      {item.name}
                    </h3>
                    <p className="text-white/60 text-sm mb-2">{item.seller}</p>
                    <CurrencyPrice
                      price={item.price}
                      originalCurrency={
                        item.seller_currency || item.currency || "GHS"
                      }
                      showOriginal={true}
                      size="medium"
                      textStyle={{
                        color: "#FFFFFF",
                        fontSize: "1.125rem",
                        fontWeight: "bold",
                      }}
                    />
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>

                    <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
                      >
                        <Minus size={14} className="text-white" />
                      </button>
                      <span className="text-white font-semibold w-8 text-center">
                        {item.quantity || 1}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
                      >
                        <Plus size={14} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <h3 className="text-white font-bold text-lg mb-4">
                Order Summary
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Subtotal</span>
                  <CurrencyPrice
                    price={subtotal}
                    originalCurrency={cartCurrency}
                    showOriginal={false}
                    size="medium"
                    textStyle={{ color: "#FFFFFF", fontWeight: "600" }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/70">Delivery Fee</span>
                  <CurrencyPrice
                    price={deliveryFee}
                    originalCurrency={cartCurrency}
                    showOriginal={false}
                    size="medium"
                    textStyle={{ color: "#FFFFFF", fontWeight: "600" }}
                  />
                </div>

                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                  <span className="text-white font-bold text-lg">Total</span>
                  <CurrencyPrice
                    price={total}
                    originalCurrency={cartCurrency}
                    showOriginal={true}
                    size="large"
                    textStyle={{
                      color: "#FFFFFF",
                      fontSize: "1.25rem",
                      fontWeight: "bold",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              className="w-full bg-[#D4AF37] text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
            >
              Proceed to Checkout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
