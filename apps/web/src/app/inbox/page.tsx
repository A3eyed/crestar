// @ts-nocheck
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import useUser from '@/utils/useUser';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, Inbox as InboxIcon, Send, BadgeCheck } from 'lucide-react';

export default function InboxPage() {
  const { data: user, loading: userLoading } = useUser();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active chat
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/messages');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin?callbackUrl=/inbox';
      return;
    }
    // Depend on the stable user id — the user OBJECT can get a new identity
    // on every render, which caused endless refetch loops and screen flicker
    if (user?.id) fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userLoading, fetchConversations]);

  const openConversation = async (conv) => {
    setActivePartner({
      id: conv.partner_id,
      username: conv.partner_username,
      displayName: conv.partner_display_name,
      avatar: conv.partner_avatar,
      verified: conv.partner_verified,
    });
    await loadMessages(conv.partner_id);
  };

  const loadMessages = async (partnerId) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/messages?partnerId=${partnerId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || sending || !activePartner) return;
    try {
      setSending(true);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: activePartner.id,
          message: messageText.trim(),
        }),
      });
      if (res.ok) {
        setMessageText('');
        await loadMessages(activePartner.id);
      }
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setSending(false);
    }
  };

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

  // ── Chat view ──
  if (activePartner) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="sticky top-0 z-20 bg-black border-b border-white/10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3 w-full">
            <button
              onClick={() => {
                setActivePartner(null);
                setMessages([]);
                fetchConversations();
              }}
              className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
              {activePartner.avatar ? (
                <img src={activePartner.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-white/60">
                  {(activePartner.displayName || activePartner.username || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">
                {activePartner.displayName || `@${activePartner.username}`}
              </span>
              {activePartner.verified && <BadgeCheck size={15} className="text-[#D4AF37]" />}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
            {loadingMessages ? (
              <p className="text-white/40 text-center py-10">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-white/40 text-center py-10">No messages yet. Say hello!</p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_user_id === String(user.id);
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        isMine
                          ? 'bg-[#D4AF37] text-black rounded-br-md'
                          : 'bg-white/10 text-white rounded-bl-md'
                      }`}
                    >
                      {msg.message_text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

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

  // ── Conversation list ──
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
          <h1 className="text-xl font-bold">Inbox</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div
              className="w-8 h-8 border-3 border-white/20 border-t-[#D4AF37] rounded-full"
              style={{ animation: 'inbox-spin 1s linear infinite' }}
            />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16">
            <InboxIcon size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/50">No messages yet</p>
            <p className="text-white/30 text-sm mt-1">
              Chats with buyers and sellers will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.conversation_id}
                onClick={() => openConversation(conv)}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                  {conv.partner_avatar ? (
                    <img src={conv.partner_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-bold text-white/60">
                      {(conv.partner_display_name || conv.partner_username || 'U')
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate">
                      {conv.partner_display_name || `@${conv.partner_username}`}
                    </span>
                    {conv.partner_verified && <BadgeCheck size={14} className="text-[#D4AF37]" />}
                  </div>
                  <p className="text-white/50 text-sm truncate">{conv.last_message}</p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#D4AF37] text-black text-xs font-bold flex items-center justify-center">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
