// @ts-nocheck
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Heart, MessageCircle, Share2, ShoppingBag, Search, Volume2, VolumeX,
  RefreshCw, X, Send, UserPlus, Check, Play, MoreHorizontal, Flag, UserX, Link2,
} from 'lucide-react';
import useUser from '@/utils/useUser';
import useLocalization from '@/utils/useLocalization';
import BottomNav from '@/components/BottomNav';
import { filterFeedItems, hideVideo, muteCreator } from '@/utils/feedPreferences';

const BRAND = '#D4AF37';

function formatCount(n) {
  const num = parseInt(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

function resolveTaggedProduct(item) {
  const taggedItems = item.taggedItems || item.tagged_items || [];
  const tag = taggedItems.length > 0 ? taggedItems[0] : null;
  if (!tag) return null;
  const productId = tag.productId || tag.product_id;
  const serviceId = tag.serviceId || tag.service_id;
  const id = productId || serviceId;
  if (!id) return null;
  let mediaArr = [];
  const rawMedia = tag.productMedia || tag.product_media;
  if (Array.isArray(rawMedia)) mediaArr = rawMedia;
  else if (typeof rawMedia === 'string') {
    try { mediaArr = JSON.parse(rawMedia); } catch { mediaArr = [rawMedia]; }
  }
  const stock = tag.productStock ?? tag.product_stock ?? null;
  return {
    id, isProduct: !!productId,
    name: tag.productTitle || tag.product_title || tag.serviceTitle || tag.service_title || 'Product',
    price: parseFloat(tag.productPrice ?? tag.product_price ?? tag.servicePrice ?? tag.service_price ?? 0),
    currency: tag.seller_currency || tag.currency || 'GHS',
    image: mediaArr[0] || item.thumbnail || null,
    stock, soldOut: stock != null && stock <= 0,
  };
}

function CommentSheet({ videoId, open, onClose, onCountChange }) {
  const { data: user } = useUser();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => {
    if (!open || !videoId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/videos/comment?videoId=' + encodeURIComponent(videoId));
        if (res.ok) { const data = await res.json(); if (!cancelled) setComments(data.comments || []); }
      } catch {} finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [open, videoId]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 200); }, [open]);
  const postComment = async () => {
    if (!text.trim()) return;
    if (!user) { window.location.href = '/account/signin?callbackUrl=/'; return; }
    setPosting(true);
    try {
      const res = await fetch('/api/videos/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId, commentText: text.trim() }) });
      if (res.ok) { const data = await res.json(); if (data.comment) { setComments((prev) => [data.comment, ...prev]); onCountChange?.(1); } setText(''); }
    } catch {} finally { setPosting(false); }
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[#121212] rounded-t-2xl max-h-[70dvh] flex flex-col border-t border-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="font-semibold text-sm text-white">{comments.length} comments</span>
          <button type="button" onClick={onClose} className="p-1 text-white/70"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-[200px]">
          {loading ? <p className="text-white/40 text-sm text-center py-8">Loading...</p> : comments.length === 0 ? <p className="text-white/40 text-sm text-center py-8">Be the first to comment</p> : comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <a href={'/' + (c.user?.username || '')} className="w-9 h-9 rounded-full bg-white/10 overflow-hidden shrink-0">
                {c.user?.profileImage ? <img src={c.user.profileImage} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-xs font-bold text-white/50">{(c.user?.username || 'U').charAt(0).toUpperCase()}</span>}
              </a>
              <div className="min-w-0 flex-1"><a href={'/' + (c.user?.username || '')} className="text-white/50 text-xs font-semibold">@{c.user?.username || 'user'}</a><p className="text-white text-sm mt-0.5 break-words">{c.text}</p></div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 px-3 py-2 flex items-center gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && postComment()} placeholder={user ? 'Add comment...' : 'Sign in to comment'} className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none" />
          <button type="button" onClick={postComment} disabled={posting || !text.trim()} className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40" style={{ backgroundColor: BRAND }}><Send size={18} className="text-black" /></button>
        </div>
      </div>
    </div>
  );
}

function FeedItem({ item, index, activeIndex, muted, toggleMute, t, user, onOpenComments, onHide }) {
  const videoRef = useRef(null);
  const videoUrl = item.videoUrl || item.video_url;
  const caption = item.caption || '';
  const username = item.username || item.creator_username || 'creator';
  const creatorId = item.creator_user_id || item.creatorUserId || item.user_id || item.userId;
  const videoId = item.id;
  const [liked, setLiked] = useState(!!item.isLiked || !!item.is_liked);
  const [likesCount, setLikesCount] = useState(item.likesCount ?? item.likes_count ?? 0);
  const [commentsCount, setCommentsCount] = useState(item.commentsCount ?? item.comments_count ?? 0);
  const [following, setFollowing] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const tagged = resolveTaggedProduct(item);

  useEffect(() => { if (index !== activeIndex) setPausedByUser(false); }, [index, activeIndex]);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (index === activeIndex && !pausedByUser) { const p = el.play?.(); if (p && typeof p.catch === 'function') p.catch(() => {}); }
    else { el.pause?.(); if (index !== activeIndex) { try { el.currentTime = 0; } catch {} } }
  }, [index, activeIndex, pausedByUser, videoUrl]);

  const togglePlay = (e) => {
    e?.stopPropagation?.();
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { setPausedByUser(false); const p = el.play(); if (p && typeof p.catch === 'function') p.catch(() => {}); }
    else { el.pause(); setPausedByUser(true); }
  };

  useEffect(() => {
    if (!user || !videoId) return;
    fetch('/api/videos/like?videoId=' + encodeURIComponent(videoId)).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && typeof d.liked === 'boolean') setLiked(d.liked); }).catch(() => {});
  }, [user, videoId]);
  useEffect(() => {
    if (!user || !creatorId) return;
    fetch('/api/follows?targetId=' + encodeURIComponent(creatorId)).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setFollowing(!!d.following); }).catch(() => {});
  }, [user, creatorId]);

  const toggleLike = async () => {
    if (!user) { window.location.href = '/account/signin?callbackUrl=/'; return; }
    if (likeBusy || !videoId) return;
    setLikeBusy(true);
    const prevLiked = liked, prevCount = likesCount;
    setLiked(!prevLiked); setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      const res = await fetch('/api/videos/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId }) });
      if (res.ok) { const data = await res.json(); setLiked(!!data.liked); } else { setLiked(prevLiked); setLikesCount(prevCount); }
    } catch { setLiked(prevLiked); setLikesCount(prevCount); } finally { setLikeBusy(false); }
  };

  const toggleFollow = async () => {
    if (!user || !creatorId || followBusy) return;
    setFollowBusy(true);
    try {
      const res = await fetch('/api/follows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: creatorId }) });
      if (res.ok) { const data = await res.json(); setFollowing(!!data.following); }
    } catch {} finally { setFollowBusy(false); }
  };

  const share = async () => {
    const url = window.location.origin + '/video/' + videoId;
    if (navigator.share) { try { await navigator.share({ title: 'Crestar', text: caption || 'Watch on Crestar', url }); } catch {} }
    else { try { await navigator.clipboard.writeText(url); alert('Link copied'); } catch {} }
  };

  const isOwn = user && creatorId && String(user.id) === String(creatorId);

  return (
    <div className="relative h-[100dvh] w-full snap-start snap-always bg-black">
      <video ref={videoRef} src={videoUrl} poster={item.thumbnail || item.thumbnail_url || undefined} className="absolute inset-0 w-full h-full object-cover" playsInline loop muted={muted} autoPlay={index === activeIndex} onClick={togglePlay} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
      <button type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} className="absolute inset-0 z-[1]" />
      {!isPlaying && index === activeIndex && (<div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none"><span className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center"><Play size={32} className="text-white ml-1" fill="white" /></span></div>)}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none z-[3]" />
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <a href={'/' + username} className="relative mb-1">
          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-white/10">{item.profileImage || item.profile_image ? <img src={item.profileImage || item.profile_image} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-sm font-bold text-white/70">{username.charAt(0).toUpperCase()}</span>}</div>
          {!isOwn && (<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFollow(); }} className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: following ? '#555' : BRAND }}>{following ? <Check size={12} className="text-white" /> : <UserPlus size={11} className="text-black" />}</button>)}
        </a>
        <button type="button" onClick={toggleLike} className="flex flex-col items-center gap-1 text-white"><Heart size={28} fill={liked ? '#fe2c55' : 'none'} color={liked ? '#fe2c55' : 'white'} /><span className="text-xs">{formatCount(likesCount)}</span></button>
        <button type="button" onClick={() => onOpenComments(videoId)} className="flex flex-col items-center gap-1 text-white"><MessageCircle size={28} /><span className="text-xs">{formatCount(commentsCount)}</span></button>
        <button type="button" onClick={share} className="flex flex-col items-center gap-1 text-white"><Share2 size={28} /><span className="text-xs">{t('share')}</span></button>
        {tagged && <a href={'/product/' + tagged.id} className="flex flex-col items-center gap-1 text-white"><ShoppingBag size={28} color={BRAND} /><span className="text-xs">{t('shop')}</span></a>}
      </div>
      <div className="absolute left-3 right-16 bottom-24 z-10">
        <a href={'/' + username} className="font-bold text-white text-[15px]">@{username}</a>
        {caption ? <p className="text-white/90 text-sm mt-1 line-clamp-3">{caption}</p> : null}
        {tagged && (<a href={'/product/' + tagged.id} className="mt-3 flex items-center gap-2 bg-black/50 border border-white/20 rounded-xl p-2 max-w-xs">{tagged.image ? <img src={tagged.image} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-white/10" />}<div className="min-w-0 flex-1"><p className="text-white text-sm font-medium truncate">{tagged.name}</p><p className="text-sm font-bold" style={{ color: BRAND }}>{tagged.soldOut ? t('soldOut') : 'GHS ' + tagged.price.toFixed(2)}</p></div></a>)}
      </div>
      <div className="absolute top-14 right-4 z-10 flex items-center gap-2">
        <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }} className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"><MoreHorizontal size={18} /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white">{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <button type="button" className="absolute inset-0 bg-black/55" onClick={() => setMenuOpen(false)} />
          <div className="relative bg-[#161616] rounded-t-2xl border-t border-white/10 p-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <p className="text-white/40 text-xs px-3 py-2">Tune your feed</p>
            <button type="button" className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-white/5 text-left text-white" onClick={() => { hideVideo(videoId); setMenuOpen(false); onHide?.(videoId); }}><Flag size={18} className="text-white/70" /><span><span className="block font-semibold text-sm">Not for me</span><span className="block text-xs text-white/45">Hide this video from your feed</span></span></button>
            {!isOwn && creatorId && (<button type="button" className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-white/5 text-left text-white" onClick={() => { muteCreator(creatorId); setMenuOpen(false); onHide?.(videoId); }}><UserX size={18} className="text-white/70" /><span><span className="block font-semibold text-sm">See less from @{username}</span><span className="block text-xs text-white/45">Skip their videos in this browser</span></span></button>)}
            <button type="button" className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-white/5 text-left text-white" onClick={async () => { try { await navigator.clipboard.writeText(window.location.origin + '/video/' + videoId); } catch {} setMenuOpen(false); }}><Link2 size={18} className="text-white/70" /><span className="font-semibold text-sm">Copy link</span></button>
            <button type="button" className="w-full py-3 text-center text-white/60 text-sm" onClick={() => setMenuOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  const { data: user } = useUser();
  const { t } = useLocalization();
  const [muted, setMuted] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentVideoId, setCommentVideoId] = useState(null);
  const [hiddenTick, setHiddenTick] = useState(0);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['feed'],
    queryFn: async () => { const res = await fetch('/api/feed'); if (!res.ok) throw new Error('Failed to load feed'); return res.json(); },
    staleTime: 30_000, retry: 1,
  });
  const rawItems = (data?.feedItems || []).filter((item) => item.videoUrl || item.video_url);
  const feedItems = filterFeedItems(rawItems);
  void hiddenTick;
  const toggleMute = useCallback(() => setMuted((m) => !m), []);
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !feedItems.length) return;
    const observers = [];
    itemRefs.current.forEach((el, index) => {
      if (!el) return;
      const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && entry.intersectionRatio >= 0.6) setActiveIndex(index); }, { root, threshold: [0.6] });
      obs.observe(el); observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [feedItems.length, hiddenTick]);
  useEffect(() => {
    if (!commentVideoId) return;
    const onKey = (e) => { if (e.key === 'Escape') setCommentVideoId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commentVideoId]);

  return (
    <div className="bg-black min-h-[100dvh]">
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="flex items-center justify-end h-12 px-4 pointer-events-auto">
          <a href="/search" className="w-10 h-10 rounded-full bg-black/35 flex items-center justify-center text-white" aria-label={t('search')}><Search size={20} /></a>
        </div>
      </div>
      {isLoading ? (
        <div className="h-[100dvh] flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 animate-spin" style={{ borderTopColor: BRAND }} />
          <p className="text-white/50 text-sm">{t('loadingFeed')}</p>
        </div>
      ) : error ? (
        <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-white/70 text-center">{t('feedError')}</p>
          <button onClick={() => refetch()} className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white" style={{ backgroundColor: BRAND }}><RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />{t('retry')}</button>
        </div>
      ) : feedItems.length === 0 ? (
        <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-white/70 text-center">{t('noVideos')}</p>
          <a href="/search" className="px-6 py-3 rounded-full font-bold text-black" style={{ backgroundColor: BRAND }}>{t('findPeople')}</a>
        </div>
      ) : (
        <div ref={containerRef} className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory" style={{ scrollSnapType: 'y mandatory' }}>
          {feedItems.map((item, index) => (
            <div key={item.id || index} ref={(el) => { itemRefs.current[index] = el; }}>
              <FeedItem item={item} index={index} activeIndex={activeIndex} muted={muted} toggleMute={toggleMute} t={t} user={user} onOpenComments={(id) => setCommentVideoId(id)} onHide={() => setHiddenTick((n) => n + 1)} />
            </div>
          ))}
        </div>
      )}
      <CommentSheet videoId={commentVideoId} open={!!commentVideoId} onClose={() => setCommentVideoId(null)} onCountChange={() => {}} />
      <BottomNav />
    </div>
  );
}
