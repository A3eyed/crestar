// @ts-nocheck
'use client';
import { useEffect, useMemo, useState } from 'react';
import useUser from '@/utils/useUser';
import CurrencyPrice from '@/components/CurrencyPrice';
import {
  ArrowLeft,
  Package,
  MapPin,
  Phone,
  User,
  Truck,
  Clock,
  Shield,
  AlertCircle,
} from 'lucide-react';

const CANCEL_MS = 5 * 60 * 1000;

function parseAddr(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return { address: String(raw) };
  }
}

export default function OrderDetailsPage() {
  const { data: user, loading: userLoading } = useUser();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [now, setNow] = useState(Date.now());

  const orderId =
    typeof window !== 'undefined'
      ? window.location.pathname.split('/').filter(Boolean).pop()
      : null;

  const load = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders/list?orderId=' + encodeURIComponent(orderId));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Order not found');
        setOrder(null);
      } else {
        setOrder(data.order);
        setError('');
      }
    } catch {
      setError('Could not load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href =
        '/account/signin?callbackUrl=' + encodeURIComponent(window.location.pathname);
      return;
    }
    if (user) load();
  }, [user, userLoading]); // eslint-disable-line

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const isSeller = useMemo(() => {
    if (!order || !user) return false;
    return String(order.seller_id) === String(user.id || user.userId);
  }, [order, user]);

  const isBuyer = useMemo(() => {
    if (!order || !user) return false;
    return String(order.buyer_id) === String(user.id || user.userId);
  }, [order, user]);

  const addr = parseAddr(order?.delivery_address);
  const createdMs = order?.created_at ? new Date(order.created_at).getTime() : 0;
  const cancelLeft = Math.max(0, CANCEL_MS - (now - createdMs));
  const canCancel =
    isBuyer &&
    cancelLeft > 0 &&
    order &&
    !['cancelled', 'refunded', 'delivered', 'completed', 'in_transit', 'ready_for_pickup'].includes(
      order.status,
    );

  const handleCancel = async () => {
    if (!canCancel || busy) return;
    if (!window.confirm('Cancel this order? You have a short window after placing it.')) return;
    setBusy(true);
    setNote('');
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Cancel failed');
      setNote(data.message || 'Order cancelled');
      await load();
    } catch (e) {
      setNote(e.message || 'Cancel failed');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmPin = async () => {
    if (!pin.trim() || busy) return;
    const ok = window.confirm(
      'Before you confirm: only continue if you have checked the package and it matches what you ordered. Confirming with the PIN releases payment to the seller and cannot be undone easily.',
    );
    if (!ok) return;
    setBusy(true);
    setNote('');
    try {
      const res = await fetch('/api/orders/confirm-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, pin: pin.trim(), method: 'pin' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not confirm');
      setNote('Delivery confirmed — payment released to the seller.');
      await load();
    } catch (e) {
      setNote(e.message || 'Confirm failed');
    } finally {
      setBusy(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-black p-4 space-y-3">
        <div className="h-10 w-32 bg-white/10 rounded-lg animate-pulse" />
        <div className="h-40 glass rounded-2xl animate-pulse" />
        <div className="h-24 glass rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6">
        <Package size={40} className="text-white/30" />
        <p className="text-white text-lg font-semibold">{error || 'Order not found'}</p>
        <button
          type="button"
          onClick={() => (window.location.href = '/orders')}
          className="glass-chip text-white px-5 py-2.5 rounded-full text-sm"
        >
          Back to orders
        </button>
      </div>
    );
  }

  const fmtLeft = () => {
    const s = Math.ceil(cancelLeft / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
  };

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="sticky top-0 z-40 glass-strong">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => window.history.back()} className="p-1">
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold truncate">
              {order.order_number || 'Order'}
            </h1>
            <p className="text-white/45 text-xs capitalize">
              {(order.status || '').replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
        <div className="glass rounded-2xl p-4">
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="font-semibold">{order.item_title || 'Order items'}</p>
              <p className="text-white/50 text-sm mt-1">Qty {order.quantity || 1}</p>
            </div>
            <CurrencyPrice
              price={parseFloat(order.total_amount) || 0}
              originalCurrency={order.seller_currency || 'GHS'}
              showOriginal={false}
              size="medium"
              textStyle={{ color: '#D4AF37', fontWeight: 700 }}
            />
          </div>
          {order.seller_payout != null && isSeller && (
            <p className="text-white/45 text-xs mt-3">
              Your payout (after platform fee):{' '}
              <span className="text-[#D4AF37] font-semibold">
                GHS {parseFloat(order.seller_payout).toFixed(2)}
              </span>
              {' · held until delivery is confirmed'}
            </p>
          )}
        </div>

        {isSeller && (
          <div className="glass rounded-2xl p-4 space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <User size={16} className="text-[#D4AF37]" /> Buyer
            </p>
            <p className="text-white/80">{order.buyer_name || 'Buyer'}</p>
            {(addr?.phone || order.buyer_phone) && (
              <p className="text-white/60 text-sm flex items-center gap-2">
                <Phone size={14} /> {addr?.phone || order.buyer_phone}
              </p>
            )}
          </div>
        )}

        {(addr?.address || addr?.city) && (
          <div className="glass rounded-2xl p-4 space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <MapPin size={16} className="text-[#D4AF37]" /> Delivery
            </p>
            {addr?.recipientName || addr?.name ? (
              <p className="text-white/80">{addr.recipientName || addr.name}</p>
            ) : null}
            {addr?.address && <p className="text-white/70 text-sm">{addr.address}</p>}
            <p className="text-white/50 text-sm">
              {[addr?.city, addr?.region].filter(Boolean).join(', ')}
            </p>
            {addr?.landmark && (
              <p className="text-white/50 text-sm">Landmark: {addr.landmark}</p>
            )}
          </div>
        )}

        {isBuyer &&
          ['paid', 'preparing', 'ready_for_pickup', 'in_transit'].includes(order.status) && (
            <div className="glass rounded-2xl p-4 space-y-3 border border-[#D4AF37]/25">
              <p className="font-semibold flex items-center gap-2">
                <Shield size={16} className="text-[#D4AF37]" /> Confirm delivery
              </p>
              <p className="text-white/65 text-sm leading-relaxed">
                Before you enter the delivery PIN, check the package carefully and make sure it is
                what you ordered. Confirming means you have verified the product and releases
                payment to the seller.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Delivery PIN"
                className="w-full glass rounded-xl px-4 py-3 text-white outline-none"
              />
              <button
                type="button"
                disabled={busy || pin.length < 4}
                onClick={handleConfirmPin}
                className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-full disabled:opacity-40"
              >
                Confirm I received the correct order
              </button>
            </div>
          )}

        {canCancel && (
          <div className="glass rounded-2xl p-4 space-y-3">
            <p className="font-semibold flex items-center gap-2">
              <Clock size={16} className="text-white/60" /> Cancel window
            </p>
            <p className="text-white/55 text-sm">
              You can cancel for {fmtLeft()} if this was a mistake.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={handleCancel}
              className="w-full border border-red-400/40 text-red-400 font-semibold py-3 rounded-full disabled:opacity-40"
            >
              Cancel order
            </button>
          </div>
        )}

        {isSeller && order.status === 'paid' && (
          <div className="glass rounded-2xl p-4 flex gap-3">
            <Truck size={18} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-white/65 text-sm">
              Prepare and deliver this order. Payment stays in escrow until the buyer confirms with
              the delivery PIN.
            </p>
          </div>
        )}

        {note && (
          <div className="glass rounded-2xl p-3 flex gap-2 text-sm text-white/80">
            <AlertCircle size={16} className="text-[#D4AF37] shrink-0 mt-0.5" />
            {note}
          </div>
        )}
      </div>
    </div>
  );
}
