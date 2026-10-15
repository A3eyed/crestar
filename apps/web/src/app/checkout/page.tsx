// @ts-nocheck
'use client';
import { useState, useEffect, useMemo } from 'react';
import useUser from '@/utils/useUser';
import CurrencyPrice from '@/components/CurrencyPrice';
import {
  AFRICA_COUNTRIES,
  getRegionsForCountry,
  getCountryMeta,
} from '@/utils/africaMarkets';
import {
  ArrowLeft,
  MapPin,
  Phone,
  User as UserIcon,
  ShoppingBag,
  AlertCircle,
  Lock,
  Search,
} from 'lucide-react';

export default function CheckoutPage() {
  const { data: user, loading: userLoading } = useUser();
  const [cart, setCart] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [isBuyNow, setIsBuyNow] = useState(false);

  // Delivery — only buyer-entered values; never fabricated
  const [recipientName, setRecipientName] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [landmark, setLandmark] = useState('');

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const regions = useMemo(() => {
    if (!country) return [];
    const list = getRegionsForCountry(country);
    return Array.isArray(list) ? list : [];
  }, [country]);
  const countryMeta = country ? getCountryMeta(country) : null;

  // Filter regions as a city-search helper when the list is region-as-city style
  const filteredRegions = useMemo(() => {
    if (!citySearch.trim()) return regions;
    const q = citySearch.trim().toLowerCase();
    return regions.filter((r) => r.toLowerCase().includes(q));
  }, [regions, citySearch]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const buyNowMode = params.get('mode') === 'buynow';
      setIsBuyNow(buyNowMode);

      if (buyNowMode) {
        const expressRaw = sessionStorage.getItem('buy_now_item');
        const expressItem = expressRaw ? JSON.parse(expressRaw) : null;
        setCart(expressItem ? [expressItem] : []);
      } else {
        const stored = JSON.parse(localStorage.getItem('cart') || '[]');
        setCart(Array.isArray(stored) ? stored : []);
      }

      // Prefill name from account only — never invent address fields
      // (phone/address stay empty until the buyer types them)
    } catch (e) {
      setCart([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin?callbackUrl=/checkout';
    }
  }, [user, userLoading]);

  // When country changes, clear region/city so we never keep a mismatched place
  useEffect(() => {
    setRegion('');
    setCity('');
    setCitySearch('');
  }, [country]);

  useEffect(() => {
    if (user?.name && !recipientName) {
      setRecipientName(user.name);
    }
  }, [user?.name]);

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1),
        0,
      ),
    [cart],
  );

  const deliveryReady =
    recipientName.trim() &&
    country &&
    (regions.length === 0 || region.trim()) &&
    city.trim() &&
    streetAddress.trim() &&
    phoneNumber.trim();

  const canPlace = cart.length > 0 && deliveryReady && !placing;

  const placeOrder = async () => {
    if (!canPlace) return;
    setPlacing(true);
    setError('');

    const delivery_address = {
      buyerName: recipientName.trim(),
      country: countryMeta?.name || country,
      countryCode: country,
      region: region.trim() || null,
      city: city.trim(),
      address: streetAddress.trim(),
      phone: phoneNumber.trim(),
      landmark: landmark.trim() || null,
    };

    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((it) => ({
            productId: it.id || it.productId,
            quantity: it.quantity || 1,
            selectedColor: it.selectedColor || null,
            selectedSize: it.selectedSize || null,
            cartKey: it.cartKey || null,
          })),
          delivery_address,
          mode: isBuyNow ? 'buynow' : 'cart',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.unavailableItems?.length) {
          const badIds = new Set(
            data.unavailableItems.flatMap((b) => [b.id, b.cartKey].filter(Boolean)),
          );
          const cleaned = cart.filter((it) => !badIds.has(it.id) && !badIds.has(it.cartKey));
          setCart(cleaned);
          localStorage.setItem('cart', JSON.stringify(cleaned));
          setError(
            data.error ||
              'Some items are no longer available. Cart updated — review and try again.',
          );
          setPlacing(false);
          return;
        }
        throw new Error(data.error || 'Checkout failed. Please try again.');
      }

      if (data.reference) {
        localStorage.setItem('pending_payment_reference', data.reference);
        localStorage.setItem('pending_payment_buynow', isBuyNow ? '1' : '0');
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      // Fallback: go to orders
      if (isBuyNow) {
        try {
          sessionStorage.removeItem('buy_now_item');
        } catch {}
      } else {
        localStorage.setItem('cart', '[]');
      }
      window.location.href = data.orderId ? `/orders?highlight=${data.orderId}` : '/orders';
    } catch (e) {
      setError(e?.message || 'Something went wrong. Please try again.');
      setPlacing(false);
    }
  };

  if (!loaded || userLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => window.history.back()} className="p-1" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-semibold">Checkout</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-5">
        {/* Cart summary */}
        <section className="glass border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag size={18} className="text-[#D4AF37]" />
            <h2 className="font-semibold">Order</h2>
            <span className="text-white/40 text-sm">{cart.length} item{cart.length === 1 ? '' : 's'}</span>
          </div>
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/50 mb-3">Your cart is empty</p>
              <a href="/shop" className="text-[#D4AF37] font-medium">
                Continue shopping
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div key={item.cartKey || item.id + '-' + index} className="flex gap-3">
                  <div className="w-14 h-14 rounded-lg bg-white/10 overflow-hidden shrink-0">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{item.name}</p>
                    {(item.selectedColor || item.selectedSize) && (
                      <p className="text-white/40 text-xs">
                        {[item.selectedColor, item.selectedSize].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <div className="flex justify-between mt-0.5">
                      <span className="text-white/45 text-xs">Qty {item.quantity || 1}</span>
                      <CurrencyPrice
                        price={(parseFloat(item.price) || 0) * (item.quantity || 1)}
                        originalCurrency={item.seller_currency || 'GHS'}
                        showOriginal={false}
                        size="small"
                        textStyle={{ color: '#D4AF37', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-white/60">Subtotal</span>
                <CurrencyPrice
                  price={subtotal}
                  originalCurrency="GHS"
                  showOriginal={false}
                  size="small"
                  textStyle={{ color: '#fff', fontWeight: 700 }}
                />
              </div>
              <p className="text-white/35 text-xs">Delivery fee calculated after address</p>
            </div>
          )}
        </section>

        {/* Delivery — buyer-only */}
        <section className="glass border border-white/10 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-[#D4AF37]" />
            <h2 className="font-semibold">Delivery details</h2>
          </div>
          <p className="text-white/40 text-xs -mt-2">
            Enter your real delivery location. Nothing is auto-filled or generated.
          </p>

          <label className="block">
            <span className="text-xs text-white/50 flex items-center gap-1 mb-1">
              <UserIcon size={12} /> Full name
            </span>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Who receives the order"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
              autoComplete="name"
            />
          </label>

          <label className="block">
            <span className="text-xs text-white/50 mb-1 block">Country</span>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50 appearance-none"
            >
              <option value="">Select country</option>
              {AFRICA_COUNTRIES.filter((c) => c.code !== 'GH_OTHER').map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
              <option value="GH_OTHER">Other African country</option>
            </select>
          </label>

          {country && regions.length > 0 && (
            <label className="block">
              <span className="text-xs text-white/50 mb-1 block">Region / State</span>
              <select
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  if (!city) setCity(e.target.value);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50 appearance-none"
              >
                <option value="">Select region</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          )}

          {country && regions.length === 0 && (
            <label className="block">
              <span className="text-xs text-white/50 mb-1 block">Region / State</span>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Type your region or state"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
              />
            </label>
          )}

          <label className="block">
            <span className="text-xs text-white/50 flex items-center gap-1 mb-1">
              <Search size={12} /> City / Town
            </span>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setCitySearch(e.target.value);
              }}
              placeholder="e.g. Accra, Lagos, Nairobi"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
              autoComplete="address-level2"
            />
            {region && citySearch.trim() && filteredRegions.length > 0 && citySearch !== region && (
              <div className="mt-1 rounded-xl border border-white/10 bg-black/80 max-h-36 overflow-y-auto">
                {filteredRegions.slice(0, 8).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white/10"
                    onClick={() => {
                      setCity(r);
                      setCitySearch(r);
                      if (!region) setRegion(r);
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </label>

          <label className="block">
            <span className="text-xs text-white/50 mb-1 block">Street address</span>
            <input
              type="text"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="House number, street, area"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
              autoComplete="street-address"
            />
          </label>

          <label className="block">
            <span className="text-xs text-white/50 flex items-center gap-1 mb-1">
              <Phone size={12} /> Phone number
            </span>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Number for delivery contact"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
              autoComplete="tel"
            />
          </label>

          <label className="block">
            <span className="text-xs text-white/50 mb-1 block">Landmark (optional)</span>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Near Accra Mall, opposite GT Bank"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
            />
          </label>
        </section>

        {error && (
          <div className="flex gap-2 items-start rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-300">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-white/35 text-xs px-1">
          <Lock size={12} />
          Payment is processed securely. You only pay after confirming delivery details.
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-white/10 bg-black/95 backdrop-blur-xl">
        <div className="max-w-xl mx-auto px-4 py-3">
          <button
            type="button"
            disabled={!canPlace}
            onClick={placeOrder}
            className="w-full bg-[#D4AF37] text-black font-bold py-3.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {placing ? 'Processing…' : 'Place order'}
          </button>
        </div>
      </div>
    </div>
  );
}
