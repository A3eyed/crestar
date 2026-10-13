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

function Change({ value }) {
  if (value == null || Number.isNaN(value)) return null;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={'inline-flex items-center gap-0.5 text-xs font-semibold ' + (up ? 'text-emerald-400' : 'text-red-400')}>
      <Icon size={12} />
      {Math.abs(value).toFixed(0)}%
    </span>
  );
}

export default function SellerAnalytics() {
  const [days, setDays] = useState(28);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnalytics = useCallback(async (range) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sellers/analytics?days=' + range);
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch (err) {
      console.error(err);
      setError('Could not load your analytics. Try again.');
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
            <div key={i} className="h-24 glass rounded-2xl" />
          ))}
        </div>
        <div className="h-64 glass rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass border border-white/10 rounded-2xl p-8 text-center">
        <p className="text-white/60 mb-4">{error}</p>
        <button
          type="button"
          onClick={() => loadAnalytics(days)}
          className="px-6 py-2.5 bg-[#D4AF37] text-black rounded-xl font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  const overview = data?.overview || {};
  const trend = data?.trend || data?.revenueTrend || [];
  const topProducts = data?.topProducts || [];
  const topVideos = data?.topVideos || [];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {RANGES.map((r) => (
          <button
            key={r.days}
            type="button"
            onClick={() => setDays(r.days)}
            className={
              'px-4 py-2 rounded-full text-sm font-semibold border ' +
              (days === r.days
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'glass text-white/70 border-white/15')
            }
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Revenue',
            value: overview.revenue,
            isMoney: true,
            change: overview.revenueChange,
            icon: ShoppingBag,
          },
          {
            label: 'Orders',
            value: overview.orders,
            change: overview.ordersChange,
            icon: PackageIcon,
          },
          {
            label: 'Views',
            value: overview.views,
            change: overview.viewsChange,
            icon: Eye,
          },
          {
            label: 'Followers',
            value: overview.followers,
            change: overview.followersChange,
            icon: Users,
          },
        ].map((card) => (
          <div key={card.label} className="glass border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/50 text-xs">{card.label}</span>
              <card.icon size={14} className="text-white/35" />
            </div>
            {card.isMoney ? (
              <CurrencyPrice
                price={parseFloat(card.value) || 0}
                originalCurrency="GHS"
                showOriginal={false}
                size="medium"
                textStyle={{ color: '#fff', fontWeight: 700, fontSize: '1.15rem' }}
              />
            ) : (
              <p className="text-xl font-bold">{Number(card.value || 0).toLocaleString()}</p>
            )}
            <div className="mt-1">
              <Change value={card.change} />
            </div>
          </div>
        ))}
      </div>

      {trend.length > 0 && (
        <div className="glass border border-white/10 rounded-2xl p-5">
          <p className="font-semibold mb-3">Revenue trend</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: '#111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={GOLD}
                  fill="url(#rev)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass border border-white/10 rounded-2xl p-4">
          <p className="font-semibold mb-3">Top products</p>
          {topProducts.length === 0 ? (
            <p className="text-white/45 text-sm">No sales in this period</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p) => (
                <div key={p.id} className="flex justify-between text-sm gap-2">
                  <span className="truncate text-white/80">{p.title}</span>
                  <span className="text-[#D4AF37] font-semibold shrink-0">
                    GHS {parseFloat(p.revenue || 0).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="glass border border-white/10 rounded-2xl p-4">
          <p className="font-semibold mb-3">Top videos</p>
          {topVideos.length === 0 ? (
            <p className="text-white/45 text-sm">No videos yet</p>
          ) : (
            <div className="space-y-2">
              {topVideos.map((v) => (
                <div key={v.id} className="flex justify-between text-sm gap-2">
                  <span className="truncate text-white/80 flex items-center gap-1">
                    <Play size={12} /> {v.caption || 'Video'}
                  </span>
                  <span className="text-white/50 shrink-0">
                    {(v.views_count || 0).toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Heart, label: 'Likes', value: overview.likes },
          { icon: MessageCircle, label: 'Comments', value: overview.comments },
          { icon: Share2, label: 'Shares', value: overview.shares },
        ].map((s) => (
          <div key={s.label} className="glass border border-white/10 rounded-2xl p-3 text-center">
            <s.icon size={16} className="mx-auto text-white/40 mb-1" />
            <p className="font-bold">{Number(s.value || 0).toLocaleString()}</p>
            <p className="text-white/40 text-xs">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackageIcon(props) {
  return <ShoppingBag {...props} />;
}
