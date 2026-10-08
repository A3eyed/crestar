// @ts-nocheck
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Heart,
  MessageCircle,
  Share2,
  ShoppingBag,
  Plus,
  Check,
  Play,
  Search,
  Volume2,
  VolumeX,
  X,
  Send,
  RefreshCw,
} from 'lucide-react';
import useUser from '@/utils/useUser';
import BottomNav from '@/components/BottomNav';

const BRAND = '#D4AF37';

function formatCount(n) {
  const num = parseInt(n) || 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return `${num}`;
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
  if (Array.isArray(rawMedia)) {
    mediaArr = rawMedia;
  } else if (typeof rawMedia === 'string') {
    try {
      mediaArr = JSON.parse(rawMedia);
    } catch {
      mediaArr = [rawMedia];
    }
  }

  const stock = tag.productStock ?? tag.product_stock ?? null;

  return {
    id,
    isProduct: !!productId,
    name:
      tag.productTitle || tag.product_title || tag.serviceTitle || tag.service_title || 'Product',
    price: parseFloat(
      tag.productPrice ?? tag.product_price ?? tag.servicePrice ?? tag.service_price ?? 0
    ),
    currency: tag.seller_currency || tag.currency || 'GHS',
    image: mediaArr[0] || item.thumbnail || null,
    stock,
    soldOut: stock != null && stock <= 0,
  };
}

function withDateLabel(comment) {
  let dateLabel = '';
  const ts = comment?.createdAt ? Date.parse(comment.createdAt) : Number.NaN;
  if (!Number.isNaN(ts)) {
    dateLabel = new Intl.DateTimeFormat().format(ts);
  }
  return { ...comment, dateLabel };
}

function CommentsPanel({ videoId, commentCount, onClose, onPosted, user }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/videos/comment?videoId=${videoId}`);
        if (!res.ok) {
          throw new Error(
            `When fetching /api/videos/comment, the response was [${res.status}] ${res.statusText}`
          );
        }
        const data = await res.json();
        if (!cancelled) setComments((data.comments || []).map(withDateLabel));
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Could not load comments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchComments();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const handlePost = async () => {
    if (!newComment.trim() || posting) return;
    if (!user) {
      window.location.href = '/account/signin';
      return;
    }
    setPosting(true);
    try {
      const res = await fetch('/api/videos/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, commentText: newComment.trim() }),
      });
      if (!res.ok) {
        throw new Error(
          `When posting a comment, the response was [${res.status}] ${res.statusText}`
        );
      }
      const data = await res.json();
      setComments((prev) => [withDateLabel(data.comment), ...prev]);
      setNewComment('');
      if (onPosted) onPosted();
    } catch (err) {
      console.error(err);
      setError('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-xl bg-[#111111] border-t border-white/10 rounded-t-3xl max-h-[70dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white text-lg font-bold">Comments ({formatCount(commentCount)})</h3>
          <button onClick={onClose} className="text-white hover:opacity-70">
            <X size={24} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[200px]">
          {loading ? (
            <p className="text-white/50 text-center py-10">Loading...</p>
          ) : error ? (
            <p className="text-red-400 text-center py-10">{error}</p>
          ) : comments.length === 0 ? (
            <p className="text-white/50 text-center py-10">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 mb-4">
                <img
                  src={
                    comment.user?.profileImage || `https://i.pravatar.cc/40?u=${comment.user?.id}`
                  }
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold mb-0.5">
                    @{comment.user?.username}
                  </p>
                  <p className="text-white/90 text-sm leading-5">{comment.text}</p>
                  <p className="text-white/35 text-xs mt-1">{comment.dateLabel}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 p-4 border-t border-white/10">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePost();
            }}
            placeholder="Add a comment..."
            maxLength={500}
            className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-white text-sm placeholder-white/40 outline-none focus:bg-white/15"
          />
          <button
            onClick={handlePost}
            disabled={!newComment.trim() || posting}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{
              backgroundColor: newComment.trim() ? BRAND : 'rgba(255,255,255,0.15)',
            }}
          >
            <Send size={18} className={newComment.trim() ? 'text-white' : 'text-white/40'} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductSheet({ product, item, onClose }) {
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const existing = cart.find((c) => c.id === product.id);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          seller: item.businessName || item.displayName || `@${item.username}`,
          sellerId: item.sellerId || item.creatorUserId || item.creator_user_id,
          seller_currency: product.currency,
          quantity: 1,
          // Creator attribution — the creator earns a 5% affiliate commission
          originVideoId: item.id,
          originCreatorId: item.creator_user_id || item.creatorUserId || null,
        });
      }
      localStorage.setItem('cart', JSON.stringify(cart));
      setAdded(true);
      setTimeout(() => onClose(), 900);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-xl bg-[#111111] border-t border-white/10 rounded-t-3xl p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-bold">Shop Now</h3>
          <button onClick={onClose} className="text-white hover:opacity-70">
            <X size={24} />
          </button>
        </div>

        <div className="flex gap-4 mb-5">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-24 h-24 rounded-xl object-cover border border-white/10"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-white/10 flex items-center justify-center">
              <ShoppingBag size={28} className="text-white/40" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-white font-semibold text-base mb-1">{product.name}</p>
            <p className="text-sm text-white/60 mb-2">
              {item.businessName || item.displayName || `@${item.username}`}
            </p>
            <p className="font-extrabold text-lg" style={{ color: BRAND }}>
              {product.currency} {product.price.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {product.isProduct && (
            <a
              href={`/product/${product.id}`}
              className="flex-1 py-3.5 rounded-xl border border-white/20 text-white font-bold text-center hover:bg-white/10 transition-colors"
            >
              View Details
            </a>
          )}
          <button
            onClick={handleAddToCart}
            disabled={product.soldOut || added}
            className="flex-1 py-3.5 rounded-xl font-bold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: added ? '#34C759' : BRAND }}
          >
            {product.soldOut ? 'Sold Out' : added ? 'Added to Cart ✓' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedVideoItem({ item, muted, onToggleMute, user }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes_count || parseInt(item.likes) || 0);
  const [commentCount, setCommentCount] = useState(
    item.comments_count || parseInt(item.comments) || 0
  );
  const [isFollowing, setIsFollowing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showProduct, setShowProduct] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const product = resolveTaggedProduct(item);
  const isVerified = item.isVerified || item.is_verified;
  const videoUrl = item.videoUrl || item.video_url;
  const sellerId = item.sellerId || item.creatorUserId || item.creator_user_id;

  // Observe visibility — play only the video currently in view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsActive(entry.isIntersecting && entry.intersectionRatio >= 0.6);
        });
      },
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Play / pause based on visibility + user intent
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive && !paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
      if (!isActive) {
        video.currentTime = 0;
        setPaused(false);
      }
    }
  }, [isActive, paused]);

  // Check like status when signed in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/videos/like?videoId=${item.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !cancelled) setLiked(!!data.liked);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, item.id]);

  // Check follow status when signed in (persisted via /api/follows like mobile)
  useEffect(() => {
    if (!user || !sellerId) return;
    let cancelled = false;
    fetch(`/api/follows?targetId=${sellerId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !cancelled) setIsFollowing(!!data.following);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, sellerId]);

  const handleVideoTap = () => {
    setPaused((p) => !p);
  };

  const handleLike = async () => {
    if (!user) {
      window.location.href = '/account/signin';
      return;
    }
    try {
      const res = await fetch('/api/videos/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: item.id }),
      });
      if (!res.ok) {
        throw new Error(
          `When liking the video, the response was [${res.status}] ${res.statusText}`
        );
      }
      const data = await res.json();
      setLiked(data.liked);
      setLikeCount((prev) => (data.liked ? prev + 1 : Math.max(0, prev - 1)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async () => {
    const url = sellerId ? `${window.location.origin}/seller/${sellerId}` : window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${item.displayName || item.username} on Crestar`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 1500);
      }
    } catch {
      // user cancelled share — ignore
    }
  };

  const handleFollow = async () => {
    if (!user) {
      window.location.href = '/account/signin';
      return;
    }
    if (!sellerId) return;
    // Optimistic toggle, revert on failure
    setIsFollowing((f) => !f);
    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: sellerId }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(!!data.following);
      } else {
        setIsFollowing((f) => !f);
      }
    } catch (err) {
      setIsFollowing((f) => !f);
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative w-full h-[100dvh] snap-start snap-always bg-black overflow-hidden"
    >
      {/* Video — full screen on mobile, centered column on desktop (TikTok web style) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={item.thumbnail || item.thumbnail_url}
          loop
          muted={muted}
          playsInline
          className="h-full w-full md:max-w-[480px] object-cover"
          onClick={handleVideoTap}
        />
      </div>

      {/* Pause overlay icon */}
      {paused && (
        <button
          onClick={handleVideoTap}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <span className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
            <Play size={32} className="text-white fill-white" />
          </span>
        </button>
      )}

      {/* Mute toggle */}
      <button
        onClick={onToggleMute}
        className="absolute top-16 right-4 z-20 w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* Right action rail */}
      <div className="absolute right-3 md:right-[calc(50%-280px)] bottom-36 z-20 flex flex-col items-center gap-5">
        {/* Avatar + follow */}
        <div className="relative mb-1">
          <a href={sellerId ? `/seller/${sellerId}` : '#'}>
            <img
              src={item.avatar || item.profile_image || `https://i.pravatar.cc/150?u=${sellerId}`}
              alt={item.username || 'creator'}
              className="w-12 h-12 rounded-full border-2 border-white object-cover"
            />
          </a>
          <button
            onClick={handleFollow}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center"
            style={{ backgroundColor: isFollowing ? '#FFFFFF' : BRAND }}
          >
            {isFollowing ? (
              <Check size={12} className="text-black" strokeWidth={3} />
            ) : (
              <Plus size={14} className="text-white" strokeWidth={3} />
            )}
          </button>
        </div>

        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <span className="w-12 h-12 rounded-full bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm">
            <Heart
              size={24}
              color={liked ? BRAND : '#FFFFFF'}
              fill={liked ? BRAND : 'transparent'}
            />
          </span>
          <span className="text-white text-xs font-semibold">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <span className="w-12 h-12 rounded-full bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm">
            <MessageCircle size={24} className="text-white" />
          </span>
          <span className="text-white text-xs font-semibold">{formatCount(commentCount)}</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <span className="w-12 h-12 rounded-full bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm">
            <Share2 size={24} className="text-white" />
          </span>
          <span className="text-white text-xs font-semibold">
            {shareCopied ? 'Copied!' : 'Share'}
          </span>
        </button>
      </div>

      {/* Bottom info: creator + caption */}
      <div className="absolute bottom-0 left-0 right-20 md:left-[calc(50%-240px)] z-20 p-4 pb-40">
        <div className="flex items-center gap-2 mb-1.5">
          <a
            href={sellerId ? `/seller/${sellerId}` : '#'}
            className="text-white text-base font-bold hover:underline"
          >
            {item.displayName || item.businessName || `@${item.username}`}
          </a>
          {isVerified && (
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: BRAND }}
            >
              <Check size={10} className="text-white" strokeWidth={4} />
            </span>
          )}
          {!isFollowing && (
            <button
              onClick={handleFollow}
              className="bg-white text-black text-[13px] font-bold px-3.5 py-1 rounded-md hover:bg-white/90 transition-colors"
            >
              Follow
            </button>
          )}
        </div>
        <p className="text-white/90 text-sm leading-5 line-clamp-2">
          {item.description || item.caption || ''}
        </p>
      </div>

      {/* Product tag */}
      {product && (
        <button
          onClick={() => {
            if (!product.soldOut) setShowProduct(true);
          }}
          disabled={product.soldOut}
          className="absolute bottom-24 left-4 md:left-[calc(50%-240px)] z-30 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-black/80 border max-w-[62%] md:max-w-[300px] text-left hover:bg-black/95 transition-colors disabled:opacity-60"
          style={{
            borderColor: product.soldOut ? 'rgba(255,255,255,0.2)' : 'rgba(212,175,55,0.6)',
          }}
        >
          <ShoppingBag
            size={18}
            color={product.soldOut ? 'rgba(255,255,255,0.4)' : BRAND}
            className="shrink-0"
          />
          <span className="min-w-0">
            <span className="block text-white text-[13px] font-semibold truncate">
              {product.name}
            </span>
            {product.soldOut ? (
              <span className="block text-white/50 text-xs font-bold mt-0.5">Sold Out</span>
            ) : (
              <span className="block text-[15px] font-extrabold mt-0.5" style={{ color: BRAND }}>
                {product.currency} {product.price.toFixed(2)}
              </span>
            )}
          </span>
        </button>
      )}

      {/* Modals */}
      {showComments && (
        <CommentsPanel
          videoId={item.id}
          commentCount={commentCount}
          onClose={() => setShowComments(false)}
          onPosted={() => setCommentCount((c) => c + 1)}
          user={user}
        />
      )}
      {showProduct && product && (
        <ProductSheet product={product} item={item} onClose={() => setShowProduct(false)} />
      )}
    </section>
  );
}

export default function HomePage() {
  const { data: user } = useUser();
  const [muted, setMuted] = useState(true);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const res = await fetch(`/api/feed?limit=20&offset=0`);
      if (!res.ok) {
        throw new Error(
          `When fetching /api/feed, the response was [${res.status}] ${res.statusText}`
        );
      }
      return res.json();
    },
  });

  const feedItems = (data?.feedItems || []).filter((item) => item.videoUrl || item.video_url);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  return (
    <div className="bg-black min-h-[100dvh]">
      {/* Top bar — For You (TikTok style) */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-center relative h-14 px-4">
          <div className="flex items-center gap-5">
            <a
              href="/live/watch"
              className="text-white/60 text-[15px] font-semibold hover:text-white transition-colors"
            >
              LIVE
            </a>
            <span className="text-white text-[16px] font-bold border-b-2 border-white pb-0.5">
              For You
            </span>
            <a
              href="/shop"
              className="text-white/60 text-[15px] font-semibold hover:text-white transition-colors"
            >
              Shop
            </a>
          </div>
          <a
            href="/shop"
            className="absolute right-4 text-white hover:opacity-70 transition-opacity"
          >
            <Search size={22} />
          </a>
        </div>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="h-[100dvh] flex flex-col items-center justify-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-white/20 animate-spin"
            style={{ borderTopColor: BRAND }}
          />
          <p className="text-white/50 text-sm">Loading your feed...</p>
        </div>
      ) : error ? (
        <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-white/70 text-center">Could not load the feed. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white"
            style={{ backgroundColor: BRAND }}
          >
            <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
            Retry
          </button>
        </div>
      ) : feedItems.length === 0 ? (
        <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
            <Play size={36} className="text-white/40" />
          </div>
          <h2 className="text-white text-xl font-bold">No videos yet</h2>
          <p className="text-white/50 text-center text-sm max-w-xs">
            Be the first to post! Tap the + button below to create a video and start earning.
          </p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white mt-2"
            style={{ backgroundColor: BRAND }}
          >
            <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      ) : (
        <div className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory">
          {feedItems.map((item) => (
            <FeedVideoItem
              key={item.id}
              item={item}
              muted={muted}
              onToggleMute={toggleMute}
              user={user}
            />
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
