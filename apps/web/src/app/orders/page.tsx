// @ts-nocheck
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import useUser from '@/utils/useUser';
import CurrencyPrice from '@/components/CurrencyPrice';
import BottomNav from '@/components/BottomNav';
import {
  ArrowLeft,
  Package,
  ShoppingBag,
  Clock,
  CreditCard,
  CheckCircle2,
  Truck,
  ShieldCheck,
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

// Parse the delivery_address jsonb into a printable object
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
  const [payingOrderId, setPayingOrderId] = useState(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  // Delivery confirmation state
  const [pinByOrder, setPinByOrder] = useState({});
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [confirmErrors, setConfirmErrors] = useState({});
  const [confirmSuccessId, setConfirmSuccessId] = useState(null);
  const hasLoadedRef = useRef(false);

  const fetchOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (!user?.id) return;
      try {
        // Only show the full-screen spinner on the very first load.
        // Background refreshes keep the list mounted — this was the cause of
        // the "blinking" — the whole list was swapped for a spinner on every
        // refetch (filter change, payment verify, etc.).
        if (!silent && !hasLoadedRef.current) setLoading(true);
        const res = await fetch(`/api/orders/list?role=${role}&status=${statusFilter}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          const list = (data.orders || []).map((o) => ({
            ...o,
            dateLabel: typeof o.created_at === 'string' ? o.created_at.split('T')[0] : '',
          }));
          setOrders(list);
          hasLoadedRef.current = true;
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, role, statusFilter]
  );

  // Redirect signed-out users. Depend on the stable user id — the user OBJECT
  // gets a new identity on every render, which caused endless refetch loops
  // and the screen flicker/blinking on this page.
  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin?callbackUrl=/orders';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userLoading]);

  useEffect(() => {
    if (user?.id) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role, statusFilter]);

  // ── Verify payment when returning from Paystack ──
  // The checkout saved a pending reference; once Paystack confirms it,
  // the cart is finally cleared (items stay in the cart until paid).
  useEffect(() => {
    const verifyPending = async () => {
      let reference = null;
      try {
        reference = localStorage.getItem('pending_payment_reference');
      } catch (e) {
        return;
      }
      if (!reference || !user?.id) return;

      try {
        setVerifyingPayment(true);
        const res = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });
        const data = await res.json();
        if (res.ok && (data.success || data.status === 'success')) {
          // Payment confirmed — NOW clear the cart and the pending reference
          const wasBuyNow = localStorage.getItem('pending_payment_buynow') === '1';
          if (wasBuyNow) {
            // Express Buy Now purchase — the shared cart stays untouched
            try {
              sessionStorage.removeItem('buy_now_item');
            } catch (e) {}
          } else {
            localStorage.removeItem('cart'); // keep the existing cart-clear behavior
          }
          localStorage.removeItem('pending_payment_reference'); // keep existing cleanup
          localStorage.removeItem('pending_payment_buynow');
          fetchOrders({ silent: true });
        }
      } catch (e) {
        // Payment not confirmed — keep cart and reference so the user can retry
      } finally {
        setVerifyingPayment(false);
      }
    };
    verifyPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Resume payment for an unpaid order (TikTok-style: pay before active)
  const handleCompletePayment = async (order) => {
    try {
      setPayingOrderId(order.id);
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      const payUrl = data.paymentUrl || data.authorization_url || data.data?.authorization_url;
      if (res.ok && payUrl) {
        window.location.href = payUrl;
      } else {
        alert(data.error || 'Could not start payment. Please try again.');
      }
    } catch (err) {
      alert('Could not start payment. Please try again.');
    } finally {
      setPayingOrderId(null);
    }
  };

  // ── Buyer delivery confirmation (releases escrow to the seller) ──
  const handleConfirmDelivery = async (order, method) => {
    const pin = (pinByOrder[order.id] || '').trim();
    if (method === 'pin' && pin.length !== 4) {
      setConfirmErrors((prev) => ({ ...prev, [order.id]: 'Enter the 4-digit delivery PIN' }));
      return;
    }
    if (
      method === 'buyer_confirm' &&
      !window.confirm(
        'Are you sure you have received your order? This will release payment to the seller.'
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
        body: JSON.stringify({
          orderId: order.id,
          method,
          ...(method === 'pin' ? { deliveryPin: pin } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConfirmErrors((prev) => ({
          ...prev,
          [order.id]: data.error || 'Failed to confirm delivery',
        }));
        return;
      }
      setConfirmSuccessId(order.id);
      fetchOrders({ silent: true });
    } catch (err) {
      setConfirmErrors((prev) => ({
        ...prev,
        [order.id]: 'Something went wrong. Please try again.',
      }));
    } finally {
      setConfirmingOrderId(null);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full"
          style={{ animation: 'orders-spin 1s linear infinite' }}
        />
        <style jsx global>{`
          @keyframes orders-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <a
            href="/profile"
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <ArrowLeft size={20} />
          </a>
          <h1 className="text-xl font-bold">Orders</h1>
        </div>

        {/* Role toggle */}
        <div className="max-w-2xl mx-auto flex border-t border-white/10">
          {[
            { id: 'buyer', label: 'My Purchases', icon: ShoppingBag },
            { id: 'seller', label: 'My Sales', icon: Package },
          ].map((r) => {
            const RIcon = r.icon;
            const active = role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 ${
                  active ? 'border-white text-white' : 'border-transparent text-white/40'
                }`}
              >
                <RIcon size={16} />
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {verifyingPayment && (
          <div className="flex items-center gap-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4 mb-4">
            <div
              className="w-5 h-5 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full shrink-0"
              style={{ animation: 'orders-spin 1s linear infinite' }}
            />
            <p className="text-white/70 text-sm">Confirming your payment...</p>
          </div>
        )}

        {/* Status filter */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Completed' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border ${
                statusFilter === f.id
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 text-white/60 border-white/15'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && orders.length === 0 ? (
          <div className="flex justify-center py-16">
            <div
              className="w-8 h-8 border-3 border-white/20 border-t-[#D4AF37] rounded-full"
              style={{ animation: 'orders-spin 1s linear infinite' }}
            />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/50 mb-4">No orders yet</p>
            <a
              href="/shop"
              className="inline-block bg-[#D4AF37] text-black px-6 py-2.5 rounded-lg font-semibold hover:opacity-90"
            >
              Browse the Shop
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const status = STATUS_STYLES[order.status] || {
                label: (order.status || '').replace(/_/g, ' '),
                cls: 'bg-white/10 text-white/60',
              };
              const isUnpaid = role === 'buyer' && order.status === 'pending_payment';
              const canConfirm =
                role === 'buyer' &&
                ['paid', 'preparing', 'ready_for_pickup', 'in_transit', 'delivered'].includes(
                  order.status
                );
              const isConfirming = confirmingOrderId === order.id;
              // ── Seller self-fulfillment: buyer + delivery details ──
              const deliveryAddr =
                role === 'seller' ? parseDeliveryAddress(order.delivery_address) : null;
              const showFulfillmentDetails =
                role === 'seller' &&
                ['paid', 'preparing', 'ready_for_pickup', 'in_transit'].includes(order.status);
              return (
                <div key={order.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm">
                      {order.order_number || `#${String(order.id).slice(0, 8)}`}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.cls}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <p className="text-white/80 text-sm mb-1">
                    {order.item_title || 'Order'}
                    {order.quantity ? ` × ${order.quantity}` : ''}
                  </p>

                  <div className="flex items-center justify-between">
                    <p className="text-white/40 text-xs">{order.dateLabel}</p>
                    <CurrencyPrice
                      price={parseFloat(order.total_amount || 0)}
                      originalCurrency={order.currency || 'GHS'}
                      showOriginal={false}
                      size="small"
                      textStyle={{ color: '#D4AF37', fontWeight: 'bold' }}
                    />
                  </div>

                  {isUnpaid && (
                    <button
                      onClick={() => handleCompletePayment(order)}
                      disabled={payingOrderId === order.id}
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-[#D4AF37] text-black py-2.5 rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50"
                    >
                      <CreditCard size={16} />
                      {payingOrderId === order.id ? 'Starting payment...' : 'Complete Payment'}
                    </button>
                  )}

                  {order.status === 'in_transit' && (
                    <div className="mt-3 flex items-center gap-2 text-blue-400 text-xs">
                      <Truck size={14} />
                      Your order is on its way
                    </div>
                  )}

                  {/* ── Confirm delivery: PIN entry or "I have received my order" ── */}
                  {canConfirm && (
                    <div className="mt-3 bg-black/40 border border-[#D4AF37]/25 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck size={14} className="text-[#D4AF37]" />
                        <p className="text-xs font-semibold text-white/80">
                          Received your order? Confirm to release payment to the seller.
                        </p>
                      </div>
                      <div className="flex gap-2 mb-2">
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
                          className="flex-1 min-w-0 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 tracking-widest focus:border-[#D4AF37] focus:outline-none"
                        />
                        <button
                          onClick={() => handleConfirmDelivery(order, 'pin')}
                          disabled={isConfirming}
                          className="bg-[#D4AF37] text-black px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                        >
                          {isConfirming ? 'Confirming...' : 'Confirm PIN'}
                        </button>
                      </div>
                      <button
                        onClick={() => handleConfirmDelivery(order, 'buyer_confirm')}
                        disabled={isConfirming}
                        className="w-full flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white py-2 rounded-lg text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
                      >
                        <CheckCircle2 size={15} />
                        I have received my order
                      </button>
                      {confirmErrors[order.id] ? (
                        <p className="text-red-400 text-xs mt-2">{confirmErrors[order.id]}</p>
                      ) : null}
                      {confirmSuccessId === order.id ? (
                        <p className="text-[#D4AF37] text-xs mt-2">
                          Delivery confirmed — payment released to the seller!
                        </p>
                      ) : null}
                    </div>
                  )}

                  {/* ── Buyer delivery details for sellers (self-fulfillment) ── */}
                  {showFulfillmentDetails && (
                    <div className="mt-3 bg-black/40 border border-blue-400/25 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck size={14} className="text-blue-400" />
                        <p className="text-xs font-semibold text-white/80">Delivery Details</p>
                      </div>
                      <div className="space-y-1 text-xs text-white/70">
                        {order.buyer_name ? (
                          <p>
                            <span className="text-white/40">Buyer:</span> {order.buyer_name}
                          </p>
                        ) : null}
                        {deliveryAddr?.phone || order.buyer_phone ? (
                          <p>
                            <span className="text-white/40">Phone:</span>{' '}
                            {deliveryAddr?.phone || order.buyer_phone}
                          </p>
                        ) : null}
                        {deliveryAddr?.address ? (
                          <p>
                            <span className="text-white/40">Address:</span> {deliveryAddr.address}
                          </p>
                        ) : null}
                        {deliveryAddr?.city || deliveryAddr?.region ? (
                          <p>
                            <span className="text-white/40">Area:</span>{' '}
                            {[deliveryAddr?.city, deliveryAddr?.region].filter(Boolean).join(', ')}
                          </p>
                        ) : null}
                        {deliveryAddr?.landmark ? (
                          <p>
                            <span className="text-white/40">Landmark:</span> {deliveryAddr.landmark}
                          </p>
                        ) : null}
                        {deliveryAddr?.notes ? (
                          <p>
                            <span className="text-white/40">Notes:</span> {deliveryAddr.notes}
                          </p>
                        ) : null}
                        {order.delivery_method ? (
                          <p>
                            <span className="text-white/40">Method:</span>{' '}
                            {String(order.delivery_method).replace(/_/g, ' ')}
                          </p>
                        ) : null}
                        {!deliveryAddr && !order.buyer_phone ? (
                          <p className="text-white/40">No delivery address on this order.</p>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {order.status === 'completed' && (
                    <div className="mt-3 flex items-center gap-2 text-[#D4AF37] text-xs">
                      <CheckCircle2 size={14} />
                      Order fulfilled
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
