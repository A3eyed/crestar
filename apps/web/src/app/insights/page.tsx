// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import useUser from '@/utils/useUser';
import BottomNav from '@/components/BottomNav';
import {
  ArrowLeft,
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ShoppingBag,
  Package,
  Video,
} from 'lucide-react';

const BRAND = '#D4AF37';

function fmt(n) {
  const x = Number(n) || 0;
  if (x >= 1_000_000) return (x / 1_000_000).toFixed(1) + 'M';
  if (x >= 1_000) return (x / 1_000).toFixed(1) + 'K';
  return String(x);
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-white/50 text-xs mb-2">
        <Icon size={14} style={{ color: BRAND }} />
        {label}
      </div>
      <p className="text-2xl font-bold text-white">{fmt(value)}</p>
    </div>
  );
}

export default function InsightsPage() {
  const { data: user, loading: userLoading } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      window.location.href = '/account/signin?callbackUrl=/insights';
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/insights', { credentials: 'include' });
        if (!res.ok) throw new Error('Could not load insights');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/20 rounded-full animate-spin" style={{ borderTopColor: BRAND }} />
      </div>
    );
  }

  const t = data?.totals || {};

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/profile" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowLeft size={20} />
          </a>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <BarChart3 size={18} style={{ color: BRAND }} />
              Studio Insights
            </h1>
            <p className="text-white/45 text-xs">Videos, tags & sales — one place for every account</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Video} label="Active videos" value={t.videos} />
          <Stat icon={Eye} label="Total views" value={t.views} />
          <Stat icon={Heart} label="Likes" value={t.likes} />
          <Stat icon={MessageCircle} label="Comments" value={t.comments} />
          <Stat icon={Share2} label="Shares" value={t.shares} />
          <Stat icon={ShoppingBag} label="Videos with products" value={t.taggedVideos} />
          <Stat icon={Package} label="Unique listings tagged" value={t.uniqueListings} />
          <Stat icon={Package} label="Orders (as seller)" value={t.orders} />
        </div>

        {Number(t.gmv) > 0 && (
          <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-4">
            <p className="text-white/60 text-xs mb-1">Sales volume (completed / open orders)</p>
            <p className="text-2xl font-bold" style={{ color: BRAND }}>
              GH₵ {Number(t.gmv).toFixed(2)}
            </p>
          </div>
        )}

        <div>
          <h2 className="font-semibold mb-3">Top videos</h2>
          {!data?.topVideos?.length ? (
            <div className="text-center py-12 text-white/45 text-sm">
              <p className="mb-3">No videos yet.</p>
              <a href="/create" className="inline-block px-5 py-2.5 rounded-full font-bold text-black" style={{ backgroundColor: BRAND }}>
                Post a shoppable video
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {data.topVideos.map((v) => (
                <a
                  key={v.id}
                  href={`/video/${v.id}`}
                  className="flex gap-3 p-3 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.08]"
                >
                  <div className="w-16 h-20 rounded-lg overflow-hidden bg-white/10 shrink-0">
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">Video</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-2">{v.caption || 'Untitled'}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-white/50">
                      <span className="inline-flex items-center gap-1"><Eye size={12} /> {fmt(v.views)}</span>
                      <span className="inline-flex items-center gap-1"><Heart size={12} /> {fmt(v.likes)}</span>
                      <span className="inline-flex items-center gap-1"><MessageCircle size={12} /> {fmt(v.comments)}</span>
                    </div>
                    <div className="mt-2 flex gap-3 text-xs">
                      <span className="text-[#D4AF37]">Edit → /edit-video/{v.id}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <p className="text-white/35 text-xs leading-relaxed">
          Studio Insights is for every Crestar account — sellers, hosts, and anyone posting shoppable video.
          Metrics update as people watch, engage, and buy from your tags.
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
