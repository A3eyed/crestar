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
  Clock,
  AlertCircle,
} from 'lucide-react';

const COMMISSION_OPTIONS = [5, 10, 15, 20, 25, 30];

export default function SellerDashboardPage() {
  const { data: user, loading: userLoading } = useUser();
  const [businessCenter, setBusinessCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedTab, setSelectedTab] = useState('products');

  // Affiliate settings modal
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

      const listingsRes = await fetch(`/api/listings/products?sellerId=${user.id}`);
      if (listingsRes.ok) {
        const data = await listingsRes.json();
        setListings(data.products || []);
      }

      const ordersRes = await fetch('/api/orders/list?role=seller');
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin?callbackUrl=/seller/dashboard';
      return;
    }
    if (user?.id) fetchDashboardData();
  }, [user, userLoading, fetchDashboardData]);

  const handleDelete = async (product) => {
    if (!confirm(`Remove "${product.title}" from your shop? Buyers will no longer see it.`)) return;
    try {
      const res = await fetch('/api/listings/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id }),
      });
      if (res.ok) {
        setListings((prev) => prev.filter((p) => p.id !== product.id));
      } else {
        alert('Could not delete product. Please try again.');
      }
    } catch (e) {
      alert('Could not delete product. Please try again.');
    }
  };

  const openAffiliate = (product) => {
    setAffiliateProduct(product);
    setAffiliateEnabled(product.creator_promotion_enabled === true);
    setAffiliateRate(parseFloat(product.affiliate_commission_rate) || 5);
  };

  const saveAffiliate = async () => {
    if (!affiliateProduct || savingAffiliate) return;
    setSavingAffiliate(true);
    try {
      const res = await fetch('/api/listings/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: affiliateProduct.id,
          creatorPromotionEnabled: affiliateEnabled,
          affiliateCommissionRate: affiliateRate,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setListings((prev) =>
        prev.map((p) =>
          p.id === affiliateProduct.id
            ? {
                ...p,
                creator_promotion_enabled: data.product.creator_promotion_enabled,
                affiliate_commission_rate: data.product.affiliate_commission_rate,
              }
            : p
        )
      );
      setAffiliateProduct(null);
    } catch (err) {
      alert('Could not save affiliate settings. Please try again.');
    } finally {
      setSavingAffiliate(false);
    }
  };

  const isApproved = businessCenter?.verification_status === 'approved';
  const sellerCurrency = businessCenter?.default_currency || 'GHS';

  const tabs = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full"
          style={{ animation: 'sd-spin 1s linear infinite' }}
        />
        <style jsx global>{`
          @keyframes sd-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/profile"
              className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20"
            >
              <ArrowLeft size={20} />
            </a>
            <h1 className="text-xl font-bold">
              {businessCenter?.center_type === 'foodhub' ? 'FoodHub Dashboard' : 'Seller Center'}
            </h1>
          </div>
          {isApproved && (
            <a
              href="/create-listing"
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-semibold text-sm hover:opacity-90"
            >
              <Plus size={16} />
              New
            </a>
          )}
        </div>

        {/* Tabs */}
        {isApproved && (
          <div className="max-w-3xl mx-auto flex border-t border-white/10">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold border-b-2 ${
                    isActive ? 'border-white text-white' : 'border-transparent text-white/40'
                  }`}
                >
                  <TabIcon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Pending / declined banner */}
        {!isApproved && businessCenter && (
          <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
            {businessCenter.verification_status === 'pending' ? (
              <Clock size={22} className="text-yellow-400" />
            ) : (
              <AlertCircle size={22} className="text-red-400" />
            )}
            <div>
              <p className="font-bold">
                {businessCenter.verification_status === 'pending'
                  ? 'Under Review'
                  : 'Application Declined'}
              </p>
              <p className="text-white/60 text-sm">
                {businessCenter.verification_status === 'pending'
                  ? "We're reviewing your application (24 to 48 hours)"
                  : 'Contact support for more details'}
              </p>
            </div>
          </div>
        )}

        {/* Products tab */}
        {isApproved && selectedTab === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Product Management</h2>
              <span className="text-white/50 text-sm">{listings.length} total</span>
            </div>

            {listings.length === 0 ? (
              <div className="text-center py-16">
                <Package size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/50 mb-4">No products yet</p>
                <a
                  href="/create-listing"
                  className="inline-block bg-white text-black px-6 py-2.5 rounded-lg font-semibold hover:opacity-90"
                >
                  Create First Product
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {listings.map((product) => {
                  let media = product.media;
                  if (typeof media === 'string') {
                    try {
                      media = JSON.parse(media);
                    } catch (e) {
                      media = [];
                    }
                  }
                  const image = Array.isArray(media) ? media[0] : null;
                  const affiliateOn = product.creator_promotion_enabled === true;
                  return (
                    <div
                      key={product.id}
                      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                    >
                      <div className="relative aspect-square bg-white/5">
                        {image ? (
                          <img
                            src={image}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={28} className="text-white/20" />
                          </div>
                        )}
                        <button
                          onClick={() => (window.location.href = `/edit-product/${product.id}`)}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/70 border border-white/20 rounded-full flex items-center justify-center hover:bg-black"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="absolute top-12 right-2 w-8 h-8 bg-black/70 border border-red-500/40 rounded-full flex items-center justify-center hover:bg-black"
                          title="Delete"
                        >
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold truncate">{product.title}</p>
                        <CurrencyPrice
                          price={parseFloat(product.price)}
                          originalCurrency={sellerCurrency}
                          showOriginal={false}
                          size="small"
                          textStyle={{
                            color: '#D4AF37',
                            fontWeight: 'bold',
                          }}
                        />
                        {product.stock_quantity !== null && (
                          <p className="text-white/40 text-xs mt-0.5">
                            Stock: {product.stock_quantity}
                          </p>
                        )}
                        <button
                          onClick={() => openAffiliate(product)}
                          className={`mt-2 flex items-center gap-1.5 text-xs font-bold px-2 py-1.5 rounded-lg border ${
                            affiliateOn
                              ? 'text-[#D4AF37] border-[#D4AF37]/40 bg-[#D4AF37]/10'
                              : 'text-white/40 border-white/15 bg-white/5'
                          }`}
                        >
                          <Megaphone size={12} />
                          {affiliateOn
                            ? `Affiliate ${parseFloat(product.affiliate_commission_rate) || 5}%`
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

        {/* Orders tab */}
        {isApproved && selectedTab === 'orders' && (
          <div>
            <h2 className="text-lg font-bold mb-4">Recent Orders</h2>
            {orders.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/50">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 20).map((order) => (
                  <div key={order.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{order.order_number}</span>
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
                      <span className="capitalize">{(order.status || '').replace(/_/g, ' ')}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics tab */}
        {selectedTab === 'analytics' && <SellerAnalytics />}
      </div>

      {/* Affiliate modal */}
      {affiliateProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70">
          <div className="bg-[#141414] border border-white/10 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold">Affiliate Marketing</h3>
              <button
                onClick={() => setAffiliateProduct(null)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-white/50 text-sm mb-4 truncate">{affiliateProduct.title}</p>

            <label className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 mb-4 cursor-pointer">
              <div className="mr-4">
                <p className="font-semibold text-sm">Open to creators</p>
                <p className="text-white/50 text-xs mt-0.5">
                  Creators can tag this product in their videos and earn a commission on sales they
                  drive
                </p>
              </div>
              <input
                type="checkbox"
                checked={affiliateEnabled}
                onChange={(e) => setAffiliateEnabled(e.target.checked)}
                className="w-5 h-5 accent-[#D4AF37]"
              />
            </label>

            {affiliateEnabled && (
              <div className="mb-4">
                <p className="font-semibold text-sm mb-2">Commission per sale</p>
                <div className="flex flex-wrap gap-2">
                  {COMMISSION_OPTIONS.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setAffiliateRate(rate)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold border ${
                        affiliateRate === rate
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'bg-white/5 text-white border-white/15'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={saveAffiliate}
              disabled={savingAffiliate}
              className="w-full bg-[#D4AF37] text-black py-3.5 rounded-xl font-bold hover:opacity-90 disabled:opacity-40"
            >
              {savingAffiliate ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
