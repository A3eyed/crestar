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

  const regions = useMemo(() => (country ? getRegionsForCountry(country) : []), [country]);
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
  const onCountryChange = (code) => {
    setCountry(code);
    setRegion('');
    setCity('');
    setCitySearch('');
  };

  const onRegionChange = (value) => {
    setRegion(value);
    // If city was auto-copied from a previous region pick, clear it
    if (city && city === region) setCity('');
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1),
    0,
  );

  const handlePlaceOrder = async () => {
    setError('');
    if (cart.length === 0) {
      setError('Your cart is empty');
      return;
    }

    const name = recipientName.trim();
    const phone = phoneNumber.trim();
    const street = streetAddress.trim();
    const cityVal = city.trim();
    const regionVal = region.trim();
    const countryVal = country.trim();
    const landmarkVal = landmark.trim();

    if (!name) {
      setError('Please enter the recipient name');
      return;
    }
    if (!countryVal) {
      setError('Please select your country');
      return;
    }
    if (!regionVal) {
      setError('Please select your region or state');
      return;
    }
    if (!cityVal) {
      setError('Please enter or select your city');
      return;
    }
    if (!street) {
      setError('Please enter your street address or house number');
      return;
    }
    if (!phone) {
      setError('Please enter a phone number for delivery');
      return;
    }
    if (!landmarkVal) {
      setError('Please enter a landmark closest to your location');
      return;
    }

    // Payload uses ONLY buyer-entered fields — no defaults, no invented places
    const deliveryAddress = {
      address: street,
      street: street,
      city: cityVal,
      region: regionVal,
      country: countryVal,
      countryName: countryMeta?.name || countryVal,
      landmark: landmarkVal,
      phone: phone,
      recipientName: name,
    };

    setPlacing(true);
    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          deliveryAddress,
          phoneNumber: phone,
          recipientName: name,
          landmark: landmarkVal,
          city: cityVal,
          region: regionVal,
          country: countryVal,
          callbackUrl: `${window.location.origin}/orders?verify=1`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (
          data?.unavailableItems &&
          Array.isArray(data.unavailableItems) &&
          data.unavailableItems.length > 0
        ) {
          if (isBuyNow) {
            sessionStorage.removeItem('buy_now_item');
            setCart([]);
            setError(data.error || 'This item is no longer available.');
            setPlacing(false);
            return;
          }
          const badIds = new Set(
            data.unavailableItems.flatMap((b) => [b.id, b.cartKey].filter(Boolean)),
          );
          const cleaned = cart.filter((it) => !badIds.has(it.id) && !badIds.has(it.cartKey));
          setCart(cleaned);
          localStorage.setItem('cart', JSON.stringify(cleaned));
          setError(
            data.error ||
              'Some items in your cart are no longer available and were removed. Please try again.',
          );
          setPlacing(false);
          return;
        }
        throw new Error(data.error || 'Checkout failed. Please try again.');
      }

      if (data.reference) {
        local        localStorage.setItem('pending_payment_reference', data.reference);
        localStorage.setItem('pending_payment_buynow', isBuyNow ? '1' : '0');
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        window.location.href = '/orders';
      }
    } catch (err) {
      setError(err.message || 'Checkout failed. Please try again.');
      setPlacing(false);
    }
  };

  if (userLoading || !loaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full"
          style={{ animation: 'checkout-spin 1s linear infinite' }}
        />
        <style jsx global>{`
          @keyframes checkout-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return null;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-6">
        <ShoppingBag size={56} className="text-white/20" />
        <p className="text-white/60 text-lg">
          {isBuyNow ? 'This item is no longer available' : 'Your cart is empty'}
        </p>
        <a
          href="/shop"
          className="bg-[#D4AF37] text-black px-6 py-3 rounded-xl font-bold hover:opacity-90"
        >
          Browse the Shop
        </a>
      </div>
    );
  }

  const inputClass =
    'w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none [&>option]:bg-black';

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="sticky top-0 z-20 bg-black border-b border-white/10">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-4">
          <a
            href={isBuyNow ? '/shop' : '/cart'}
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <ArrowLeft size={20} />
          </a>
          <h1 className="text-xl font-bold">Checkout</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Order summary */}
        <div>
          <h2 className="font-bold text-lg mb-3">Your Items</h2>
          <div className="space-y-2">
            {cart.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3"
              >
                {item.image ? (
                  <img src={item.image} alt="" className="w-14 h-14 rounded-lg object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center">
                    <ShoppingBag size={20} className="text-white/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-white/50 text-xs">
                    Qty: {item.quantity || 1}
                    {item.selectedColor ? ` · ${item.selectedColor}` : ''}
                    {item.selectedSize ? ` · ${item.selectedSize}` : ''}
                  </p>
                </div>
                <CurrencyPrice
                  price={(parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)}
                  originalCurrency={item.seller_currency || 'GHS'}
                  showOriginal={false}
                  size="small"
                  textStyle={{ color: '#D4AF37', fontWeight: 'bold' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Delivery details — buyer entered only */}
        <div>
          <h2 className="font-bold text-lg mb-1">Delivery Details</h2>
          <p className="text-white/45 text-xs mb-4">
            Enter the exact location where the order should be delivered. We only use what you type
            here.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Recipient Name <span className="text-[#D4AF37]">*</span>
              </label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3">
                <UserIcon size={16} className="text-white/40" />
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Who is receiving this order?"
                  autoComplete="name"
                  className="flex-1 bg-transparent py-3 text-white placeholder-white/30 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Country <span className="text-[#D4AF37]">*</span>
              </label>
              <select
                value={country}
                onChange={(e) => onCountryChange(e.target.value)}
                className={inputClass}
              >
                <option value="">Select country...</option>
                {AFRICA_COUNTRIES.filter((c) => c.code !== 'GH_OTHER').map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Region / State <span className="text-[#D4AF37]">*</span>
              </label>
              <select
                value={region}
                onChange={(e) => onRegionChange(e.target.value)}
                disabled={!country}
                className={inputClass + ' disabled:opacity-40'}
              >
                <option value="">{country ? 'Select region or state...' : 'Select country first'}</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                City <span className="text-[#D4AF37]">*</span>
              </label>
              <div className="relative">
                <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3">
                  <Search size={16} className="text-white/40" />
                  <input
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setCitySearch(e.target.value);
                    }}
                    onFocus={() => setCitySearch(city)}
                    placeholder={region ? 'Type or search your city' : 'Select region first'}
                    disabled={!region}
                    autoComplete="address-level2"
                    className="flex-1 bg-transparent py-3 text-white placeholder-white/30 focus:outline-none disabled:opacity-40"
                  />
                </div>
                {region && citySearch.trim() && filteredRegions.length > 0 && citySearch !== region && (
                  <div className="absolute z-10 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-[#1a1a1a] border border-white/15 rounded-lg shadow-xl">
                    {filteredRegions.slice(0, 8).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setCity(r);
                          setCitySearch('');
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white/90 hover:bg-white/10"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-white/35 text-[11px] mt-1">
                Type your city name, or pick a suggestion from the list.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Street address / house number <span className="text-[#D4AF37]">*</span>
              </label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3">
                <MapPin size={16} className="text-white/40" />
                <input
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Street, house number, or building"
                  autoComplete="street-address"
                  className="flex-1 bg-transparent py-3 text-white placeholder-white/30 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Phone Number <span className="text-[#D4AF37]">*</span>
              </label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3">
                <Phone size={16} className="text-white/40" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Number the deliverer can call"
                  autoComplete="tel"
                  className="flex-1 bg-transparent py-3 text-white placeholder-white/30 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Landmark (closest to you) <span className="text-[#D4AF37]">*</span>
              </label>
              <input
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. near Total station, opposite the big church"
                className={inputClass}
              />
              <p className="text-white/35 text-[11px] mt-1">
                A nearby landmark helps the deliverer find you faster.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4">
          <Lock size={18} className="text-[#D4AF37] mt-0.5 shrink-0" />
          <p className="text-white/70 text-sm">
            Your payment is held securely and only released to the seller after you confirm
            delivery. Delivery uses only the details you entered above.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-white/50 text-xs uppercase">Total</p>
            <CurrencyPrice
              price={subtotal}
              originalCurrency={cart[0]?.seller_currency || 'GHS'}
              showOriginal={false}
              size="large"
              textStyle={{
                color: '#D4AF37',
                fontSize: '1.5rem',
                fontWeight: 'bold',
              }}
            />
            <p className="text-white/40 text-xs">+ delivery fee if applicable</p>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="bg-[#D4AF37] text-black px-8 py-3.5 rounded-xl font-bold hover:opacity-90 disabled:opacity-40"
          >
            {placing ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
