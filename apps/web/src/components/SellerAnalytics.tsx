// @ts-nocheck
'use client';

import { useEffect, useState, useCallback } from 'react';
import CurrencyPrice from '@/components/CurrencyPrice';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Users,
  ShoppingBag,
  Play,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const GOLD = '#D4AF37';
const RANGES = [
  { days: 7, label: '7 days' },
  { days: 28, label: '28 days' },
  { days: 90, label: '90 days' },
];

/**
 * TikTok-Shop-style seller analytics — real data only.
 * Overview cards with vs-previous-period change, revenue/orders trend,
 * content engagement, top products and top videos.
 */
export default function SellerAnalytics() {
  const [days, setDays] = useState(28);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnalytics = useCallback(async (range) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sellers/analytics?days=${range}`);
      if (!res.ok) {
        throw new Error(
          `When fetching /api/sellers/analytics, the response was [${res.status}] ${res.statusText}`
        );
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError('Could not load your analytics. Pull to refresh or try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(days);
  }, [days, loadAnalytics]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <div key={r.days} className="h-9 w-20 bg-white/5 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white/5 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <p className="text-white/60 mb-4">{error}</p>
        <button
          onClick={() => loadAnalytics(days)}
          className="px-6 py-2.5 bg-[#D4AF37] text-black rounded-xl font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { overview, trend, topProducts, topVideos } = data;

  return (
    <div className="space-y-6">
      {/* Range switcher */}
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setDays(r.days)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${
              days === r.days
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-white/5 text-white/70 border-white/15 hover:bg-white/10'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Sales overview — like TikTok Shop's "Business overview" */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Revenue (GMV)"
          value={<CurrencyPrice amount={overview.gmv} currency="GHS" />}
          change={overview.gmvChange}
        />
        <MetricCard label="Orders" value={overview.orders} change={overview.ordersChange} />
        <MetricCard
          label="Avg Order Value"
          value={<CurrencyPrice amount={overview.avgOrderValue} currency="GHS" />}
        />
        <MetricCard label="Customers" value={overview.customers} />
      </div>

      {/* Revenue trend */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Revenue trend</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="sellerRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.45} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} width={40} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                color: '#fff',
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue (GHS)"
              stroke={GOLD}
              strokeWidth={2}
              fill="url(#sellerRev)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Orders trend */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Orders</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} width={30} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                color: '#fff',
              }}
            />
            <Bar dataKey="orders" name="Orders" fill={GOLD} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Content engagement — like TikTok's video analytics row */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Content</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <MiniStat icon={Play} label="Videos" value={overview.videos} />
          <MiniStat icon={Eye} label="Views" value={formatCount(overview.views)} />
          <MiniStat icon={Heart} label="Likes" value={formatCount(overview.likes)} />
          <MiniStat icon={MessageCircle} label="Comments" value={formatCount(overview.comments)} />
          <MiniStat icon={Share2} label="Shares" value={formatCount(overview.shares)} />
          <MiniStat
            icon={Users}
            label="Followers"
            value={formatCount(overview.followers)}
            sub={overview.followersGained > 0 ? `+${overview.followersGained}` : null}
          />
        </div>
      </div>

      {/* Top products */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          Top products (last {data.days} days)
        </h3>
        {topProducts.length === 0 ? (
          <div className="py-8 text-center">
            <ShoppingBag size={28} className="mx-auto text-white/25 mb-2" />
            <p className="text-white/50 text-sm">
              No sales in this period yet. Tag products in your videos to boost sales.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.id || index} className="flex items-center gap-3">
                <span className="w-6 text-white/40 font-bold text-sm">{index + 1}</span>
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-11 h-11 rounded-lg object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                    <ShoppingBag size={16} className="text-white/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{product.title}</p>
                  <p className="text-white/45 text-xs">
                    {product.orders} order{product.orders === 1 ? '' : 's'} · {product.units} unit
                    {product.units === 1 ? '' : 's'}
                  </p>
                </div>
                <p className="text-[#D4AF37] font-bold text-sm">
                  <CurrencyPrice amount={product.revenue} currency="GHS" />
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top videos */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Top videos</h3>
        {topVideos.length === 0 ? (
          <div className="py-8 text-center">
            <Play size={28} className="mx-auto text-white/25 mb-2" />
            <p className="text-white/50 text-sm">Post videos to see performance here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topVideos.map((video, index) => (
              <div key={video.id} className="flex items-center gap-3">
                <span className="w-6 text-white/40 font-bold text-sm">{index + 1}</span>
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt="Video thumbnail"
                    className="w-11 h-14 rounded-lg object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-11 h-14 rounded-lg bg-white/10 flex items-center justify-center">
                    <Play size={16} className="text-white/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {video.caption || 'Untitled video'}
                  </p>
                  <div className="flex items-center gap-3 text-white/45 text-xs mt-0.5">
                    <span className="flex items-center gap-1">
                      <Eye size={11} /> {formatCount(video.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart size={11} /> {formatCount(video.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={11} /> {formatCount(video.comments)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 size={11} /> {formatCount(video.shares)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, change }) {
  const hasChange = typeof change === 'number' && change !== 0;
  const isUp = change > 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <p className="text-white/50 text-xs mb-1">{label}</p>
      <p className="text-white text-lg font-bold">{value}</p>
      {hasChange && (
        <p
          className={`text-xs font-semibold mt-1 flex items-center gap-1 ${
            isUp ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change)}% vs previous
        </p>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
      <Icon size={16} className="mx-auto text-[#D4AF37] mb-1" />
      <p className="text-white font-bold text-sm">{value}</p>
      <p className="text-white/45 text-[11px]">
        {label}
        {sub ? <span className="text-green-400 ml-1">{sub}</span> : null}
      </p>
    </div>
  );
}

function formatCount(n) {
  const num = parseInt(n) || 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}
