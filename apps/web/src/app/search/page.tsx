// @ts-nocheck
'use client';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Search as SearchIcon, User, Package, Play } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const TABS = [
  { id: 'all', label: 'Top' },
  { id: 'users', label: 'Users' },
  { id: 'videos', label: 'Videos' },
  { id: 'products', label: 'Shop' },
];

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    products: [],
    services: [],
    users: [],
    videos: [],
  });

  const runSearch = useCallback(async (query, type) => {
    if (!query.trim()) {
      setResults({ products: [], services: [], users: [], videos: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}&type=${type === 'all' ? 'all' : type}`,
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResults({
          products: data.products || [],
          services: data.services || [],
          users: data.users || [],
          videos: data.videos || [],
        });
      }
    } catch {
      // keep previous results
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get('q') || '';
    if (initial) {
      setQ(initial);
      runSearch(initial, 'all');
    }
  }, [runSearch]);

  useEffect(() => {
    const t = setTimeout(() => runSearch(q, tab), 280);
    return () => clearTimeout(t);
  }, [q, tab, runSearch]);

  const users = results.users || [];
  const videos = results.videos || [];
  const products = [...(results.products || []), ...(results.services || [])];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-30 bg-black border-b border-white/10">
        <div className="max-w-xl mx-auto px-3 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => (window.location.href = '/')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/80"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-3 py-2">
            <SearchIcon size={16} className="text-white/50" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Crestar"
              className="flex-1 bg-transparent text-white text-[15px] placeholder-white/40 outline-none"
            />
          </div>
        </div>
        <div className="max-w-xl mx-auto flex gap-1 px-3 pb-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                'px-4 py-1.5 rounded-full text-sm whitespace-nowrap ' +
                (tab === t.id
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/10 text-white/70')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-3 py-4 space-y-6">
        {!q.trim() && (
          <p className="text-white/40 text-sm text-center pt-16">
            Search people, videos, and products
          </p>
        )}

        {loading && q.trim() && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {q.trim() && !loading && (tab === 'all' || tab === 'users') && users.length > 0 && (
          <section>
            <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
              <User size={12} /> Users
            </h2>
            <div className="space-y-1">
              {users.map((u) => (
                <a
                  key={u.id}
                  href={u.username ? `/@${u.username}` : `/profile`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-white/40">
                    {u.profile_image ? (
                      <img src={u.profile_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (u.display_name || u.username || '?')[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {u.display_name || u.name || u.username}
                    </p>
                    <p className="text-white/50 text-sm truncate">
                      @{u.username || 'user'}
                      {u.business_name ? ` · ${u.business_name}` : ''}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {q.trim() && !loading && (tab === 'all' || tab === 'videos') && videos.length > 0 && (
          <section>
            <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
              <Play size={12} /> Videos
            </h2>
            <div className="grid grid-cols-3 gap-1">
              {videos.map((v) => (
                <a
                  key={v.id}
                  href={`/?video=${v.id}`}
                  className="aspect-[9/16] bg-white/5 rounded-lg overflow-hidden relative"
                >
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <Play size={20} />
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 text-[10px] text-white/80">
                    {v.views_count || 0} views
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {q.trim() && !loading && (tab === 'all' || tab === 'products') && products.length > 0 && (
          <section>
            <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
              <Package size={12} /> Shop
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {products.map((p) => {
                let img = null;
                try {
                  const m = typeof p.media === 'string' ? JSON.parse(p.media) : p.media;
                  img = Array.isArray(m) ? m[0] : m;
                } catch {
                  img = null;
                }
                return (
                  <a
                    key={p.id}
                    href={`/product/${p.id}`}
                    className="rounded-xl overflow-hidden bg-white/5 border border-white/10"
                  >
                    <div className="aspect-square bg-white/5">
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-medium line-clamp-2">{p.title}</p>
                      <p className="text-[#D4AF37] text-sm font-bold mt-1">
                        GHS {parseFloat(p.price || 0).toFixed(2)}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {q.trim() &&
          !loading &&
          users.length === 0 &&
          videos.length === 0 &&
          products.length === 0 && (
            <p className="text-white/40 text-sm text-center pt-12">
              No results for &quot;{q.trim()}&quot;
            </p>
          )}
      </div>

      <BottomNav />
    </div>
  );
}
