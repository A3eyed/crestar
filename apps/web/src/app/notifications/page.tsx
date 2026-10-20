// @ts-nocheck
'use client';
import { useState, useEffect, useCallback } from 'react';
import useUser from '@/utils/useUser';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, Bell, ShoppingBag, MessageCircle, Heart, UserPlus } from 'lucide-react';

function iconFor(type) {
  if (type === 'new_order' || type === 'order' || type === 'sale') return ShoppingBag;
  if (type === 'message') return MessageCircle;
  if (type === 'like') return Heart;
  if (type === 'follow') return UserPlus;
  return Bell;
}

function hrefFor(n) {
  const data = typeof n.data === 'string' ? JSON.parse(n.data || '{}') : n.data || {};
  if (n.type === 'new_order' || n.type === 'order' || n.type === 'sale') {
    return data.order_id ? `/orders/${data.order_id}` : '/seller/dashboard';
  }
  if (n.type === 'message' && data.from_user_id) {
    return `/inbox?userId=${encodeURIComponent(data.from_user_id)}`;
  }
  if (data.from_user_id) return `/seller/${data.from_user_id}`;
  return '/notifications';
}

export default function NotificationsPage() {
  const { data: user, loading: userLoading } = useUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ unreadMessages: 0, unreadActivity: 0 });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications || []);
        setCounts(data.counts || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin?callbackUrl=/notifications';
      return;
    }
    if (user?.id) load();
  }, [user?.id, userLoading, load]);

  const markAll = async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
    load();
  };

  if (userLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/profile"
              className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </a>
            <h1 className="text-xl font-bold">Notifications</h1>
          </div>
          <button
            type="button"
            onClick={markAll}
            className="text-sm text-[#D4AF37] font-semibold"
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
        {/* Quick links with badges — TikTok style */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <a
            href="/inbox"
            className="relative glass border border-white/10 rounded-xl p-4 flex items-center gap-3"
          >
            <MessageCircle size={22} className="text-[#D4AF37]" />
            <div>
              <p className="font-semibold text-sm">Inbox</p>
              <p className="text-white/45 text-xs">Messages</p>
            </div>
            {counts.unreadMessages > 0 && (
              <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FE2C55] text-white text-[10px] font-bold flex items-center justify-center">
                {counts.unreadMessages > 99 ? '99+' : counts.unreadMessages}
              </span>
            )}
          </a>
          <a
            href="/seller/dashboard"
            className="relative glass border border-white/10 rounded-xl p-4 flex items-center gap-3"
          >
            <ShoppingBag size={22} className="text-[#D4AF37]" />
            <div>
              <p className="font-semibold text-sm">Sales</p>
              <p className="text-white/45 text-xs">Seller Center</p>
            </div>
            {(counts.unreadSales > 0 || counts.pendingOrders > 0) && (
              <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FE2C55] text-white text-[10px] font-bold flex items-center justify-center">
                {(counts.unreadSales || 0) + (counts.pendingOrders || 0) > 99
                  ? '99+'
                  : (counts.unreadSales || 0) + (counts.pendingOrders || 0)}
              </span>
            )}
          </a>
        </div>

        {loading ? (
          <p className="text-white/40 text-center py-12">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/50">No notifications yet</p>
          </div>
        ) : (
          items.map((n) => {
            const Icon = iconFor(n.type);
            const unread = !n.is_read;
            let data = n.data;
            if (typeof data === 'string') {
              try {
                data = JSON.parse(data);
              } catch {
                data = {};
              }
            }
            return (
              <a
                key={n.id}
                href={hrefFor(n)}
                onClick={() => {
                  if (unread) {
                    fetch('/api/notifications', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ action: 'mark_read', id: n.id }),
                    }).catch(() => {});
                  }
                }}
                className={`flex gap-3 px-3 py-3.5 rounded-xl border transition ${
                  unread
                    ? 'bg-white/[0.06] border-[#D4AF37]/25'
                    : 'bg-transparent border-transparent hover:bg-white/5'
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-[#D4AF37]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${unread ? 'font-bold' : 'font-semibold'}`}>
                    {n.title || 'Notification'}
                  </p>
                  <p className="text-white/55 text-sm mt-0.5 line-clamp-3">{n.body}</p>
                  <p className="text-white/30 text-xs mt-1">
                    {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                  </p>
                </div>
                {unread && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FE2C55] shrink-0 mt-2" />
                )}
              </a>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
