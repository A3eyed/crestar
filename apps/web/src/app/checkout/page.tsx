// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import useUser from '@/utils/useUser';
import CurrencyPrice from '@/components/CurrencyPrice';
import {
  ArrowLeft,
  MapPin,
  Phone,
  User as UserIcon,
  ShoppingBag,
  AlertCircle,
  Lock,
} from 'lucide-react';

export default function CheckoutPage() {
  const { data: user, loading: userLoading } = useUser();
  const [cart, setCart] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [isBuyNow, setIsBuyNow] = useState(false);

  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [landmark, setLandmark] = useState('');

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const buyNowMode = params.get('mode') === 'buynow';
      setIsBuyNow(buyNowMode);

      if (buyNowMode) {
        // TikTok-style express lane: single item, separate from the cart
        const expressRaw = sessionStorage.getItem('buy_now_item');
        const expressItem = expressRaw ? JSON.parse(expressRaw) : null;
        setCart(expressItem ? [expressItem] : []);
      } else {
        const stored = JSON.parse(localStorage.getItem('cart') || '[]');
        setCart(Array.isArray(stored) ? stored : []);
      }
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

  const subtotal = cart.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1),
    0
  );

  const handlePlaceOrder = async () => {
    setError('');
    if (cart.length === 0) {
      setError('Your cart is empty');
      return;
    }
    if (!recipientName.trim() || !phoneNumber.trim() || !address.trim() || !city.trim()) {
      setError('Please fill in your name, phone number, address, and city');
      return;
    }

    setPlacing(true);
    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          deliveryAddress: {
            address: address.trim(),
            city: city.trim(),
            region: region.trim() || null,
            country: 'GH',
          },
          phoneNumber: phoneNumber.trim(),
          recipientName: recipientName.trim(),
          landmark: landmark.trim() || null,
          city: city.trim(),
          region: region.trim() || null,
          callbackUrl: `${window.location.origin}/orders?verify=1`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Self-healing cart: if the server says some items no longer exist,
        // remove ONLY those items and ask the user to retry.
        if (
          data?.unavailableItems &&
          Array.isArray(data.unavailableItems) &&
          data.unavailableItems.length > 0
        ) {
          if (isBuyNow) {
            // Express item is gone — clear it and send the user back
            sessionStorage.removeItem('buy_now_item');
            setCart([]);
            setError(data.error || 'This item is no longer available.');
            setPlacing(false);
            return;
          }
          const badIds = new Set(
            data.unavailableItems.flatMap((b) => [b.id, b.cartKey].filter(Boolean))
          );
          const cleaned = cart.filter((it) => !badIds.has(it.id) && !badIds.has(it.cartKey));
          setCart(cleaned);
          localStorage.setItem('cart', JSON.stringify(cleaned));
          setError(
            data.error ||
              'Some items in your cart are no longer available and were removed. Please try again.'
          );
          setPlacing(false);
          return;
        }
        throw new Error(data.error || 'Checkout failed. Please try again.');
      }

      // TikTok-style: cart stays saved until payment actually completes.
      // Store the payment reference so the orders page can verify and
      // clear the cart once Paystack confirms.
      if (data.reference) {
        localStorage.setItem('pending_payment_reference', data.reference);
        // Let the verification step know this was an express purchase so it
        // clears the buy-now item instead of the shared cart.
        localStorage.setItem('pending_payment_buynow', isBuyNow ? '1' : '0');
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        // Payment init failed — order exists as pending, pay from Orders
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

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      {/* Header */}
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

        {/* Delivery details */}
        <div>
          <h2 className="font-bold text-lg mb-3">Delivery Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Recipient Name</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3">
                <UserIcon size={16} className="text-white/40" />
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Who is receiving this order?"
                  className="flex-1 bg-transparent py-3 text-white placeholder-white/30 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Phone Number</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3">
                <Phone size={16} className="text-white/40" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="024 XXX XXXX"
                  className="flex-1 bg-transparent py-3 text-white placeholder-white/30 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Delivery Address
              </label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3">
                <MapPin size={16} className="text-white/40" />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address / house number"
                  className="flex-1 bg-transparent py-3 text-white placeholder-white/30 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Accra"
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Region (optional)
                </label>
                <input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. Greater Accra"
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Landmark (optional)
              </label>
              <input
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Nearby landmark to help the deliverer"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Buyer protection note */}
        <div className="flex items-start gap-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4">
          <Lock size={18} className="text-[#D4AF37] mt-0.5 shrink-0" />
          <p className="text-white/70 text-sm">
            Your payment is held securely and only released to the seller after you confirm
            delivery. If payment isn't completed, your items stay in your cart.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>

      {/* Bottom bar */}
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
