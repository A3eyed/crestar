// @ts-nocheck
'use client';
import { useEffect, useMemo, useState } from 'react';
import CurrencyPrice from '@/components/CurrencyPrice';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('cart') || '[]');
      setCart(Array.isArray(stored) ? stored : []);
    } catch {
      setCart([]);
    }
    setLoaded(true);
  }, []);

  const persist = (next) => {
    setCart(next);
    localStorage.setItem('cart', JSON.stringify(next));
  };

  const updateQty = (index, delta) => {
    const next = cart.map((item, i) => {
      if (i !== index) return item;
      const maxStock = item.maxStock != null ? Number(item.maxStock) : 99;
      let q = (item.quantity || 1) + delta;
      if (q < 1) q = 1;
      if (q > maxStock) q = maxStock;
      return { ...item, quantity: q };
    });
    persist(next);
  };

  const removeItem = (index) => {
    persist(cart.filter((_, i) => i !== index));
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1), 0),
    [cart],
  );

  if (!loaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="sticky top-0 z-20 bg-black glass-strong border-b border-white/10 backdrop-blur-xl bg-opacity-95">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => window.history.back()} className="p-1">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-semibold">Cart</h1>
          <span className="text-white/40 text-sm">{cart.length} items</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4">
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={40} className="mx-auto text-white/25 mb-4" />
            <p className="text-white/60 mb-4">Your cart is empty</p>
            <a href="/shop" className="inline-block bg-[#D4AF37] text-black px-6 py-3 rounded-full font-semibold">
              Continue shopping
            </a>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {cart.map((item, index) => (
                <div key={item.cartKey || item.id || index} className="glass border border-white/10 rounded-xl p-3 flex gap-3">
                  {item.image ? (
                    <img src={item.image} alt="" className="w-20 h-20 rounded-lg object-cover bg-white/5" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-white/5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    {(item.selectedSize || item.selectedColor) && (
                      <p className="text-white/45 text-xs mt-0.5">
                        {[item.selectedSize, item.selectedColor].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {item.maxStock != null && (
                      <p className="text-white/35 text-[11px] mt-0.5">{item.maxStock} in stock</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <CurrencyPrice
                        price={parseFloat(item.price) || 0}
                        originalCurrency={item.seller_currency || 'GHS'}
                        showOriginal={false}
                        size="small"
                        textStyle={{ color: '#D4AF37', fontWeight: 700 }}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQty(index, -1)}
                          className="w-7 h-7 rounded-full glass flex items-center justify-center"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-5 text-center text-sm">{item.quantity || 1}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(index, 1)}
                          disabled={(item.quantity || 1) >= (item.maxStock != null ? Number(item.maxStock) : 99)}
                          className="w-7 h-7 rounded-full glass flex items-center justify-center disabled:opacity-30"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="ml-1 text-white/40"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass border border-white/10 rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm text-white/60 mb-1">
                <span>Subtotal</span>
                <CurrencyPrice
                  price={subtotal}
                  originalCurrency="GHS"
                  showOriginal={false}
                  size="small"
                  textStyle={{ color: '#fff', fontWeight: 600 }}
                />
              </div>
              <p className="text-white/40 text-xs">Delivery calculated at checkout</p>
            </div>

            <a
              href="/checkout"
              className="block w-full text-center bg-[#D4AF37] text-black font-bold py-3.5 rounded-full"
            >
              Checkout
            </a>
          </>
        )}
      </div>
    </div>
  );
}
