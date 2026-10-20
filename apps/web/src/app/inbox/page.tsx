// @ts-nocheck
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import useUser from '@/utils/useUser';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, Inbox as InboxIcon, Send, BadgeCheck, Bell, ShoppingBag, Heart, UserPlus, MessageCircle } from 'lucide-react';

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function activityHref(n) {
  let data = n.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  data = data || {};
  if (n.type === 'new_order' || n.type === 'order' || n.type === 'sale') {
    return data.order_id ? `/orders/${data.order_id}` : '/seller/dashboard';
  }
  if (n.type === 'message' && data.from_user_id) {
    return `/inbox?userId=${encodeURIComponent(data.from_user_id)}`;
  }
  if (data.video_id) return `/video/${data.video_id}`;
  if (data.from_user_id) return `/seller/${data.from_user_id}`;
  return '/inbox';
}

function activityIcon(type) {
  if (type === 'new_order' || type === 'order' || type === 'sale') return ShoppingBag;
  if (type === 'like') return Heart;
  if (type === 'follow') return UserPlus;
  if (type === 'message') return MessageCircle;
  return Bell;
}

export default function InboxPage() {
  const { data: user, loading: userLoading } = useUser();
  const [conversations, setConversations] = useState([]);
  const [activityItems, setActivityItems] = useState([]);
  const [activityUnread, setActivityUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef(null);
  const deepLinkHandled = useRef(false);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const [msgRes, actRes] = await Promise.all([
        fetch('/api/messages', { credentials: 'include' }),
        fetch('/api/notifications', { credentials: 'include' }),
      ]);
      if (msgRes.ok) {
        const data = await msgRes.json();
        setConversations(data.conversations || []);
      }
      if (actRes.ok) {
        const data = await actRes.json();
        const items = (data.notifications || []).filter((n) => n.type !== 'message');
        setActivityItems(items);
        setActivityUnread(Number(data.counts?.unreadActivity) || 0);
      }
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && !user) {
      const qs = typeof window !== 'undefined' ? window.location.search : '';
      window.location.href =
        '/account/signin?callbackUrl=' + encodeURIComponent('/inbox' + qs);
      return;
    }
    if (user?.id) fetchConversations();
  }, [user?.id, userLoading, fetchConversations]);

  const loadMessages = useCallback(async ({ partnerId, conversationId } = {}) => {
    if (!partnerId && !conversationId) return;
    try {
      setLoadingMessages(true);
      setSendError('');
      const qs = conversationId
        ? `conversationId=${encodeURIComponent(conversationId)}`
        : `partnerId=${encodeURIComponent(partnerId)}`;
      const res = await fetch(`/api/messages?${qs}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.partner) {
          setActivePartner({
            id: String(data.partner.id),
            username: data.partner.username,
            displayName:
              data.partner.is_system_account
                ? data.partner.display_name || 'Crestar'
                : data.partner.display_name || data.partner.username,
            avatar: data.partner.profile_image,
            verified: data.partner.is_verified,
            system: !!data.partner.is_system_account,
            conversationId: data.conversationId || conversationId || null,
          });
        }
        setConversations((prev) =>
          prev.map((c) => {
            const match =
              (conversationId && c.conversation_id === conversationId) ||
              (partnerId && String(c.partner_id) === String(partnerId));
            return match ? { ...c, unread_count: 0 } : c;
          }),
        );
        setTimeout(
          () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
          80,
        );
      } else {
        const data = await res.json().catch(() => ({}));
        setSendError(data.error || 'Could not open conversation');
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setSendError('Could not open conversation');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const openConversation = async (conv) => {
    const isSupport =
      String(conv.conversation_id || '').startsWith('support_') ||
      !!conv.partner_system;
    const partner = {
      id: String(conv.partner_id || ''),
      username: conv.partner_username || (isSupport ? 'crestar' : ''),
      displayName:
        isSupport
          ? 'Crestar'
          : conv.partner_display_name || conv.partner_username || 'User',
      avatar: conv.partner_avatar,
      verified: conv.partner_verified || isSupport,
      system: isSupport,
      conversationId: conv.conversation_id,
    };
    setActivePartner(partner);
    await loadMessages({
      partnerId: partner.id || undefined,
      conversationId: isSupport ? conv.conversation_id : undefined,
    });
  };

  const openActivity = (n) => {
    if (!n.is_read) {
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'mark_read', id: n.id }),
      }).catch(() => {});
      setActivityItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
      );
      setActivityUnread((c) => Math.max(0, c - 1));
    }
    window.location.href = activityHref(n);
  };

  useEffect(() => {
    if (!user?.id || deepLinkHandled.current) return;
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const target =
      params.get('userId') || params.get('partnerId') || params.get('to');
    const conversationId = params.get('conversationId');
    if (!target && !conversationId) return;

    deepLinkHandled.current = true;

    (async () => {
      if (target) {
        setActivePartner({ id: String(target) });
      } else {
        setActivePartner({ id: 'support', system: true, displayName: 'Crestar' });
      }
      await loadMessages({
        partnerId: target || undefined,
        conversationId: conversationId || undefined,
      });
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('userId');
        url.searchParams.delete('partnerId');
        url.searchParams.delete('to');
        url.searchParams.delete('conversationId');
        window.history.replaceState({}, '', url.pathname + (url.search || ''));
      } catch {}
    })();
  }, [user?.id, loadMessages]);

  const handleSend = async () => {
    if (!messageText.trim() || sending || !activePartner?.id) return;
    const text = messageText.trim();
    setSending(true);
    setSendError('');

    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId,
      sender_user_id: String(user.id),
      message_text: text,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setMessageText('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          receiverId: activePartner.id,
          message: text,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setMessageText(text);
        setSendError(data.error || 'Failed to send');
        return;
      }
      await loadMessages({
        partnerId: activePartner.id,
        conversationId: activePartner.conversationId || undefined,
      });
      fetchConversations();
    } catch (err) {
      console.error('Send failed:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessageText(text);
      setSendError('Failed to send. Check your connection.');
    } finally {
      setSending(false);
    }
  };

  const messageUnread = conversations.reduce(
    (sum, c) => sum + (Number(c.unread_count) || 0),
    0,
  );
  const totalUnread = messageUnread + activityUnread;

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full"
          style={{ animation: 'inbox-spin 1s linear infinite' }}
        />
        <style jsx global>{`
          @keyframes inbox-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return null;

  if (activePartner) {
    const title =
      activePartner.system
        ? 'Crestar'
        : activePartner.displayName ||
          (activePartner.username ? `@${activePartner.username}` : 'Chat');
    const profileHref = activePartner.system
      ? '/support'
      : activePartner.username
        ? `/${activePartner.username}`
        : `/seller/${activePartner.id}`;

    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="sticky top-0 z-20 bg-black border-b border-white/10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setActivePartner(null);
                setMessages([]);
                setSendError('');
                fetchConversations();
              }}
              className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20"
            >
              <ArrowLeft size={20} />
            </button>
            <a href={profileHref} className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                {activePartner.avatar ? (
                  <img src={activePartner.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white/60">
                    {(title || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold truncate">{title}</span>
                  {(activePartner.verified || activePartner.system) && (
                    <BadgeCheck size={15} className="text-[#D4AF37] shrink-0" />
                  )}
                </div>
                {activePartner.system ? (
                  <p className="text-white/40 text-xs">Official support</p>
                ) : activePartner.username ? (
                  <p className="text-white/40 text-xs truncate">@{activePartner.username}</p>
                ) : null}
              </div>
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
            {loadingMessages && messages.length === 0 ? (
              <p className="text-white/40 text-center py-10">Loading messages...</p>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/50 mb-1">No messages yet</p>
                <p className="text-white/30 text-sm">Say hello — start the conversation</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = String(msg.sender_user_id) === String(user.id);
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                          isMine
                            ? 'bg-[#D4AF37] text-black rounded-br-md'
                            : 'bg-white/10 text-white rounded-bl-md'
                        } ${msg._optimistic ? 'opacity-70' : ''}`}
                      >
                        {msg.message_text}
                      </div>
                      <span className="text-[10px] text-white/30 mt-0.5 px-1">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {sendError && (
          <p className="text-center text-red-400 text-xs px-4 pb-1">{sendError}</p>
        )}

        <div className="border-t border-white/10 bg-black">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-end gap-3">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message..."
              rows={1}
              className="flex-1 bg-white/10 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/40 resize-none focus:border-[#D4AF37] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!messageText.trim() || sending}
              className="w-11 h-11 rounded-full bg-[#D4AF37] flex items-center justify-center hover:opacity-90 disabled:opacity-40"
            >
              <Send size={18} className="text-black" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <a
            href="/profile"
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <ArrowLeft size={20} />
          </a>
          <h1 className="text-xl font-bold flex items-center gap-2">
            Inbox
            {totalUnread > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#FE2C55] text-white text-[11px] font-bold flex items-center justify-center">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <div
              className="w-8 h-8 border-3 border-white/20 border-t-[#D4AF37] rounded-full"
              style={{ animation: 'inbox-spin 1s linear infinite' }}
            />
          </div>
        ) : conversations.length === 0 && activityItems.length === 0 ? (
          <div className="text-center py-16">
            <InboxIcon size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/50">Inbox is empty</p>
            <p className="text-white/30 text-sm mt-1">
              Messages and activity (orders, likes, follows) show up here
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {activityItems.length > 0 && (
              <>
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wide px-3 pt-2 pb-1">
                  Activity
                </p>
                {activityItems.map((n) => {
                  const Icon = activityIcon(n.type);
                  const unread = !n.is_read;
                  return (
                    <button
                      key={`act-${n.id}`}
                      type="button"
                      onClick={() => openActivity(n)}
                      className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl transition-colors text-left ${
                        unread ? 'bg-white/[0.05]' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                        <Icon size={22} className="text-[#D4AF37]" />
                        {unread && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#FE2C55] border-2 border-black" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm truncate ${
                            unread ? 'font-bold text-white' : 'font-semibold text-white/90'
                          }`}
                        >
                          {n.title || 'Notification'}
                        </p>
                        <p className="text-white/50 text-sm truncate mt-0.5">{n.body || ''}</p>
                      </div>
                      <span className="text-white/30 text-[11px] shrink-0">
                        {n.created_at ? formatTime(n.created_at) : ''}
                      </span>
                    </button>
                  );
                })}
                {conversations.length > 0 && (
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wide px-3 pt-3 pb-1">
                    Messages
                  </p>
                )}
              </>
            )}
            {conversations.map((conv) => {
              const isSupport =
                String(conv.conversation_id || '').startsWith('support_') ||
                !!conv.partner_system;
              const name = isSupport
                ? 'Crestar'
                : conv.partner_display_name ||
                  (conv.partner_username ? `@${conv.partner_username}` : 'User');
              const unread = Number(conv.unread_count) || 0;
              return (
                <button
                  key={conv.conversation_id}
                  type="button"
                  onClick={() => openConversation(conv)}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                    {conv.partner_avatar ? (
                      <img
                        src={conv.partner_avatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-bold text-white/60">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#FE2C55] border-2 border-black" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-sm truncate ${unread > 0 ? 'font-bold' : 'font-semibold'}`}>
                          {name}
                        </span>
                        {(conv.partner_verified || isSupport) && (
                          <BadgeCheck size={14} className="text-[#D4AF37] shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] text-white/35 shrink-0">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <p
                      className={`text-sm truncate mt-0.5 ${
                        unread > 0 ? 'text-white font-medium' : 'text-white/50'
                      }`}
                    >
                      {conv.last_message}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#FE2C55] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
      <style jsx global>{`
        @keyframes inbox-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
