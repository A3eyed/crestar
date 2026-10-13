// @ts-nocheck
'use client';
import { useState, useEffect, useCallback } from 'react';
import useUser from '@/utils/useUser';
import CurrencyPrice from '@/components/CurrencyPrice';
import SellerAnalytics from '@/components/SellerAnalytics';
import {
  ArrowLeft,
  Package,
  ShoppingBag,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  X,
} from 'lucide-react';

const COMMISSION_OPTIONS = [5, 10, 15, 20, 25, 30];

export default function SellerDashboardPage() {
  const { data: user, loading: userLoading } = useUser();
  const [businessCenter, setBusinessCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedTab, setSelectedTab] = useState('products');
  const [affiliateProduct, setAffiliateProduct] = useState(null);
  const [affiliateEnabled, setAffiliateEnabled] = useState(false);
  const [affiliateRate, setAffiliateRate] = useState(5);
  const [savingAffiliate, setSavingAffiliate] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const centerRes = await fetch('/api/business-centers');
      if (centerRes.ok) {
        const centerData = await centerRes.json();
        if (
          centerData.has_center &&
          (centerData.center.center_type === 'seller' ||
            centerData.center.center_type === 'foodhub')
        ) {
          setBusinessCenter(centerData.center);
        } else {
          window.location.href = '/monetization-center';
          return;
        }
      }
      const productsRes = await fetch(
        '/api/listings/products?sellerId=' + encodeURIComponent(user.id),
      );
      if (productsRes.ok) {
        const data = await productsRes.json();
        setListings(data.products || []);
      }
      const ordersRes = await fetch('/api/orders/list?role=seller');
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin?callbackUrl=/seller/dashboard';
      return;
    }
    if (user) fetchDashboardData();
  }, [user, userLoading, fetchDashboardData]);

  const sellerCurrency = 'GHS';

  const openAffiliate = (product) => {
    setAffiliateProduct(product);
    setAffiliateEnabled(!!product.affiliate_enabled);
    setAffiliateRate(parseFloat(product.affiliate_commission_rate) || 5);
  };

  const saveAffiliate = async () => {
    if (!affiliateProduct) return;
    setSavingAffiliate(true);
    try {
      await fetch('/api/listings/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: affiliateProduct.id,
          affiliate_enabled: affiliateEnabled,
          affiliate_commission_rate: affiliateRate,
        }),
      });
      setAffiliateProduct(null);
      fetchDashboardData();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingAffiliate(false);
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await fetch('/api/listings/products?id=' + encodeURIComponent(product.id), {
        method: 'DELETE',
      });
      fetchDashboardData();
    } catch (e) {
      console.error(e);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="sticky top-0 z-20 glass-strong border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/profile"
              className="w-10 h-10 glass rounded-full flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </a>
            <h1 className="text-lg font-bold">Seller Center</h1>
          </div>
          <a
            href="/create-listing"
            className="flex items-center gap-1.5 bg-[#D4AF37] text-black px-3 py-2 rounded-full text-sm font-bold"
          >
            <Plus size={16} /> New
          </a>
        </div>
        <div className="max-w-3xl mx-auto flex border-t border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
                className={
                  'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold border-b-2 ' +
                  (isActive
                    ? 'border-[#D4AF37] text-white'
                    : 'border-transparent text-white/45')
                }
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {selectedTab === 'products' && (
          <div>
            <h2 className="text-lg font-bold mb-4">Your listings</h2>
            {listings.length === 0 ? (
              <div className="text-center py-16">
                <Package size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/50 mb-4">No products yet</p>
                <a
                  href="/create-listing"
                  className="inline-block bg-[#D4AF37] text-black px-5 py-2.5 rounded-full font-bold text-sm"
                >
                  Create listing
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {listings.map((product) => {
                  let media = product.media;
                  if (typeof media === 'string') {
                    try {
                      media = JSON.parse(media);
                    } catch {
                      media = [];
                    }
                  }
                  const img =
                    Array.isArray(media) && media[0]
                      ? typeof media[0] === 'string'
                        ? media[0]
                        : media[0]?.url
                      : null;
                  const affiliateOn = !!product.affiliate_enabled;
                  return (
                    <div key={product.id} className="glass rounded-xl overflow-hidden relative">
                      <div className="aspect-square bg-white/5">
                        {img ? (
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => (window.location.href = '/edit-product/' + product.id)}
                        className="absolute top-2 right-2 w-8 h-8 glass rounded-full flex items-center justify-center"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(product)}
                        className="absolute top-12 right-2 w-8 h-8 bg-black/70 border border-red-500/40 rounded-full flex items-center justify-center"
                      >
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                      <div className="p-3">
                        <p className="text-sm font-semibold truncate">{product.title}</p>
                        <CurrencyPrice
                          price={parseFloat(product.price)}
                          originalCurrency={sellerCurrency}
                          showOriginal={false}
                          size="small"
                          textStyle={{ color: '#D4AF37', fontWeight: 'bold' }}
                        />
                        <button
                          type="button"
                          onClick={() => openAffiliate(product)}
                          className={
                            'mt-2 flex items-center gap-1.5 text-xs font-bold px-2 py-1.5 rounded-lg border ' +
                            (affiliateOn
                              ? 'text-[#D4AF37] border-[#D4AF37]/40 bg-[#D4AF37]/10'
                              : 'text-white/40 border-white/15')
                          }
                        >
                          <Megaphone size={12} />
                          {affiliateOn
                            ? 'Affiliate ' +
                              (parseFloat(product.affiliate_commission_rate) || 5) +
                              '%'
                            : 'Affiliate off'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'orders' && (
          <div>
            <h2 className="text-lg font-bold mb-4">Orders</h2>
            {orders.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/50">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 50).map((order) => (
                  <a
                    key={order.id}
                    href={'/orders/' + order.id}
                    className="block glass border border-white/10 rounded-xl p-4 active:opacity-90"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">
                        {order.order_number || String(order.id).slice(0, 8)}
                      </span>
                      <CurrencyPrice
                        price={parseFloat(order.total_amount)}
                        originalCurrency={order.seller_currency || sellerCurrency}
                        showOriginal={false}
                        size="small"
                        textStyle={{ color: '#D4AF37', fontWeight: 'bold' }}
                      />
                    </div>
                    <p className="text-white/50 text-sm">
                      {order.item_title} | Qty: {order.quantity} |{' '}
                      <span className="capitalize">
                        {(order.status || '').replace(/_/g, ' ')}
                      </span>
                    </p>
                    <p className="text-[#D4AF37] text-xs font-semibold mt-2">
                      View order details →
                    </p>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'analytics' && <SellerAnalytics />}
      </div>

      {affiliateProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70">
          <div className="glass-strong w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold">Affiliate Marketing</h3>
              <button
                type="button"
                onClick={() => setAffiliateProduct(null)}
                className="w-9 h-9 rounded-full glass flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-white/50 text-sm mb-4 truncate">{affiliateProduct.title}</p>
            <label className="flex items-center justify-between glass rounded-xl p-4 mb-4 cursor-pointer">
              <div className="mr-4">
                <p className="font-semibold text-sm">Open to creators</p>
                <p className="text-white/50 text-xs mt-0.5">
                  Creators can tag this product and earn commission
                </p>
              </div>
              <input
                type="checkbox"
                checked={affiliateEnabled}
                onChange={(e) => setAffiliateEnabled(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            {affiliateEnabled && (
              <div className="mb-4">
                <p className="text-sm text-white/60 mb-2">Commission rate</p>
                <div className="flex flex-wrap gap-2">
                  {COMMISSION_OPTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAffiliateRate(r)}
                      className={
                        'px-3 py-1.5 rounded-full text-sm font-semibold ' +
                        (affiliateRate === r
                          ? 'bg-[#D4AF37] text-black'
                          : 'glass text-white/70')
                      }
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              disabled={savingAffiliate}
              onClick={saveAffiliate}
              className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-full disabled:opacity-50"
            >
              {savingAffiliate ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
