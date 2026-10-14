// @ts-nocheck
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import useUser from '@/utils/useUser';
import CurrencyPrice from '@/components/CurrencyPrice';
import {
  ArrowLeft,
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
} from 'lucide-react';

const STATUS_STYLES = {
  pending_payment: { label: 'Awaiting Payment', cls: 'bg-yellow-500/15 text-yellow-400' },
  paid: { label: 'Paid', cls: 'bg-[#D4AF37]/15 text-[#D4AF37]' },
  preparing: { label: 'Preparing', cls: 'bg-blue-500/15 text-blue-400' },
  ready_for_pickup: { label: 'Ready for Pickup', cls: 'bg-blue-500/15 text-blue-400' },
  in_transit: { label: 'In Transit', cls: 'bg-blue-500/15 text-blue-400' },
  delivered: { label: 'Delivered', cls: 'bg-[#D4AF37]/15 text-[#D4AF37]' },
  completed: { label: 'Completed', cls: 'bg-[#D4AF37]/15 text-[#D4AF37]' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-500/15 text-red-400' },
  refunded: { label: 'Refunded', cls: 'bg-red-500/15 text-red-400' },
};

function parseDeliveryAddress(raw) {
  if (!raw) return null;
  let addr = raw;
  if (typeof raw === 'string') {
    try {
      addr = JSON.parse(raw);
    } catch {
      return { address: raw };
    }
  }
  if (typeof addr !== 'object') return null;
  return addr;
}

export default function OrdersPage() {
  const { data: user, loading: userLoading } = useUser();
  const [role, setRole] = useState('buyer');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pinByOrder, setPinByOrder] = useState({});
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [confirmErrors, setConfirmErrors] = useState({});
  const [confirmSuccessId, setConfirmSuccessId] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [cancellingId, setCancellingId] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Only approved sellers / FoodHub vendors see "My sales"
  useEffect(() => {
    if (!user?.id) {
      setIsSeller(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/business-centers');
        if (!res.ok) return;
        const data = await res.json();
        const center = data.center || data.businessCenter;
        const type = center?.center_type || center?.type;
        const ok =
          !!data.has_center &&
          (type === 'seller' || type === 'foodhub') &&
          (center?.status === 'active' || center?.verification_status === 'approved' || !center?.status);
        if (!cancelled) {
          setIsSeller(!!ok);
          if (!ok && role === 'seller') setRole('buyer');
        }
      } catch {
        if (!cancelled) setIsSeller(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const fetchOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (!user?.id) return;
      try {
        if (!silent && !hasLoadedRef.current) setLoading(true);
        const res = await fetch(
          `/api/orders/list?role=${role}&status=${statusFilter}&limit=50`,
        );
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
        hasLoadedRef.current = true;
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, role, statusFilter],
  );

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin?callbackUrl=/orders';
      return;
    }
    if (user) fetchOrders();
  }, [user, userLoading, fetchOrders]);

  const handleConfirmDelivery = async (order, method) => {
    const pin = (pinByOrder[order.id] || '').trim();
    if (method === 'pin' && pin.length < 4) {
      setConfirmErrors((prev) => ({
        ...prev,
        [order.id]: 'Enter the 4-digit delivery PIN',
      }));
      return;
    }
    if (
      method === 'buyer_confirm' &&
      !window.confirm(
        'Before you confirm: only continue if you have checked the package and it matches what you ordered. Confirming releases payment to the seller.',
      )
    ) {
      return;
    }
    if (
      method === 'pin' &&
      !window.confirm(
        'Before you confirm: only continue if you have checked the package and it matches what you ordered. Confirming with the PIN releases payment to the seller.',
      )
    ) {
      return;
    }
    setConfirmErrors((prev) => ({ ...prev, [order.id]: '' }));
    setConfirmingOrderId(order.id);
    try {
      const res = await fetch('/api/orders/confirm-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, pin, method }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConfirmErrors((prev) => ({
          ...prev,
          [order.id]: data.error || 'Failed to confirm delivery',
        }));
        return;
      }
      setConfirmSuccessId(order.id);
      fetchOrders({ silent: true });
    } catch {
      setConfirmErrors((prev) => ({
        ...prev,
        [order.id]: 'Something went wrong. Please try again.',
      }));
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleCancelOrder = async (order) => {
    if (
      !window.confirm(
        'Cancel this order? You can only do this within 5 minutes of placing it.',
      )
    )
      return;
    setCancellingId(order.id);
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not cancel');
      await fetchOrders({ silent: true });
    } catch (e) {
      alert(e.message || 'Cancel failed');
    } finally {
      setCancellingId(null);
    }
  };

  if (userLoading || (loading && !hasLoadedRef.current)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="sticky top-0 z-20 glass-strong border-b border-white/10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/profile" className="p-1">
            <ArrowLeft size={22} />
          </a>
          <h1 className="text-lg font-semibold">Orders</h1>
        </div>
        <div className="max-w-xl mx-auto px-4 pb-2 flex gap-2">
          {(
            isSeller
              ? [
                  { id: 'buyer', label: 'My purchases' },
                  { id: 'seller', label: 'My sales' },
                ]
              : [{ id: 'buyer', label: 'My purchases' }]
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={
                'flex-1 py-2 rounded-full text-sm font-semibold ' +
                (role === r.id ? 'bg-[#D4AF37] text-black' : 'glass text-white/70')
              }
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="max-w-xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {['all', 'active', 'completed'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={
                'px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ' +
                (statusFilter === f ? 'bg-white text-black' : 'glass text-white/60')
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="text-white/25 mx-auto mb-3" />
            <p className="text-white/50 mb-4">No orders here</p>
            <a
              href="/shop"
              className="inline-block bg-[#D4AF37] text-black px-5 py-2.5 rounded-full font-bold text-sm"
            >
              Browse shop
            </a>
          </div>
        ) : (
          orders.map((order) => {
            const st = STATUS_STYLES[order.status] || {
              label: order.status,
              cls: 'bg-white/10 text-white/60',
            };
            const isConfirming = confirmingOrderId === order.id;
            const deliveryAddr = parseDeliveryAddress(order.delivery_address);
            const showFulfillment =
              role === 'seller' &&
              ['paid', 'preparing', 'ready_for_pickup', 'in_transit'].includes(order.status);
            const showConfirm =
              role === 'buyer' &&
              ['paid', 'preparing', 'ready_for_pickup', 'in_transit'].includes(order.status);
            const cancelLeft =
              order.created_at
                ? Math.max(0, 5 * 60 * 1000 - (now - new Date(order.created_at).getTime()))
                : 0;
            const canCancel =
              role === 'buyer' &&
              cancelLeft > 0 &&
              ![
                'cancelled',
                'refunded',
                'delivered',
                'completed',
                'in_transit',
                'ready_for_pickup',
              ].includes(order.status);

            return (
              <div key={order.id} className="glass border border-white/10 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <a
                      href={'/orders/' + order.id}
                      className="font-bold text-sm hover:text-[#D4AF37]"
                    >
                      {order.order_number || '#' + String(order.id).slice(0, 8)}
                    </a>
                    <p className="text-white/50 text-xs mt-0.5">
                      {order.item_title || 'Order'} · Qty {order.quantity || 1}
                    </p>
                  </div>
                  <span className={'text-xs px-2 py-1 rounded-full ' + st.cls}>{st.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <CurrencyPrice
                    price={parseFloat(order.total_amount) || 0}
                    originalCurrency={order.seller_currency || 'GHS'}
                    showOriginal={false}
                    size="small"
                    textStyle={{ color: '#D4AF37', fontWeight: 700 }}
                  />
                  <a
                    href={'/orders/' + order.id}
                    className="text-[#D4AF37] text-xs font-semibold"
                  >
                    Details →
                  </a>
                </div>

                {showConfirm && (
                  <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
                    <p className="text-xs text-white/60 leading-relaxed">
                      Only confirm after you have checked the package and verified it matches what
                      you ordered. Confirming releases payment to the seller.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={pinByOrder[order.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setPinByOrder((prev) => ({ ...prev, [order.id]: val }));
                        }}
                        placeholder="4-digit PIN"
                        className="flex-1 glass rounded-lg px-3 py-2 text-sm tracking-widest outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleConfirmDelivery(order, 'pin')}
                        disabled={isConfirming}
                        className="bg-[#D4AF37] text-black px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                      >
                        {isConfirming ? '…' : 'Confirm PIN'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleConfirmDelivery(order, 'buyer_confirm')}
                      disabled={isConfirming}
                      className="w-full flex items-center justify-center gap-2 glass py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} /> I verified and received my order
                    </button>
                    {confirmErrors[order.id] && (
                      <p className="text-red-400 text-xs">{confirmErrors[order.id]}</p>
                    )}
                    {confirmSuccessId === order.id && (
                      <p className="text-[#D4AF37] text-xs">
                        Delivery confirmed — payment released to the seller!
                      </p>
                    )}
                  </div>
                )}

                {canCancel && (
                  <div className="mt-3 glass rounded-lg p-3">
                    <p className="text-xs text-white/55 mb-2 flex items-center gap-1">
                      <Clock size={12} />
                      Cancel within{' '}
                      {Math.floor(cancelLeft / 60000)}:
                      {String(Math.ceil((cancelLeft % 60000) / 1000)).padStart(2, '0')} if this was
                      a mistake.
                    </p>
                    <button
                      type="button"
                      disabled={cancellingId === order.id}
                      onClick={() => handleCancelOrder(order)}
                      className="w-full border border-red-400/40 text-red-400 text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
                    >
                      {cancellingId === order.id ? 'Cancelling…' : 'Cancel order'}
                    </button>
                  </div>
                )}

                {showFulfillment && (
                  <div className="mt-3 glass rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck size={14} className="text-blue-400" />
                      <p className="text-xs font-semibold text-white/80">Delivery details</p>
                    </div>
                    <div className="space-y-1 text-xs text-white/70">
                      {order.buyer_name && <p>Buyer: {order.buyer_name}</p>}
                      {(deliveryAddr?.phone || order.buyer_phone) && (
                        <p>Phone: {deliveryAddr?.phone || order.buyer_phone}</p>
                      )}
                      {deliveryAddr?.address && <p>Address: {deliveryAddr.address}</p>}
                      {(deliveryAddr?.city || deliveryAddr?.region) && (
                        <p>
                          Area:{' '}
                          {[deliveryAddr?.city, deliveryAddr?.region].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <a
                      href={'/orders/' + order.id}
                      className="inline-block mt-2 text-[#D4AF37] text-xs font-semibold"
                    >
                      Open full order →
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
