// @ts-nocheck
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import useUser from '@/utils/useUser';
import CurrencyPrice from '@/components/CurrencyPrice';
import {
  X,
  Heart,
  MessageCircle,
  Share2,
  ShoppingBag,
  Play,
  Send,
  BadgeCheck,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

function closeViewer(video) {
  // Prefer popping history so: Profile → Video → Close returns to Profile
  // (never push /seller/… which stacks a second profile and traps Back).
  try {
    const ref = typeof document !== 'undefined' ? document.referrer : '';
    let sameOrigin = false;
    if (ref) {
      const u = new URL(ref);
      sameOrigin = u.origin === window.location.origin;
    }
    if (sameOrigin && window.history.length > 1) {
      window.history.back();
      return;
    }
  } catch {
    /* fall through */
  }

  // Deep-link / no history: land on creator profile (handle preferred)
  if (video?.username) {
    window.location.assign(`/${encodeURIComponent(video.username)}`);
    return;
  }
  if (video?.creator_user_id) {
    window.location.assign(`/seller/${encodeURIComponent(video.creator_user_id)}`);
    return;
  }
  window.location.assign('/');
}

export default function VideoViewerPage() {
  const { data: user } = useUser();
  const videoRef = useRef(null);

  const [video, setVideo] = useState(null);
  const [creatorVideos, setCreatorVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const fetchVideo = useCallback(async (videoId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/videos/${videoId}`);
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setVideo(data.video);
      setLikeCount(data.video.likes_count || 0);
      setCommentCount(data.video.comments_count || 0);

      const creatorId = data.video.creator_user_id;
      if (creatorId) {
        const vidsRes = await fetch(`/api/videos/user/${creatorId}`);
        if (vidsRes.ok) {
          const vidsData = await vidsRes.json();
          const vids = vidsData.videos || [];
          setCreatorVideos(vids);
          const idx = vids.findIndex((v) => v.id === videoId);
          if (idx >= 0) setCurrentIndex(idx);
        }
      }
    } catch (err) {
      console.error('Failed to fetch video:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    if (id) fetchVideo(id);
  }, [fetchVideo]);

  // Swipe between creator videos without growing the history stack
  const goToVideo = (direction) => {
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= creatorVideos.length) return;
    const nextVideo = creatorVideos[nextIndex];
    setCurrentIndex(nextIndex);
    window.history.replaceState(null, '', `/video/${nextVideo.id}`);
    fetchVideo(nextVideo.id);
    setShowComments(false);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      window.location.href = `/account/signin?callbackUrl=/video/${video?.id}`;
      return;
    }
    try {
      const res = await fetch('/api/videos/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount((prev) => (data.liked ? prev + 1 : Math.max(0, prev - 1)));
      }
    } catch (e) {}
  };

  const openComments = async () => {
    setShowComments(true);
    try {
      const res = await fetch(`/api/videos/comment?videoId=${video.id}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (e) {}
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || postingComment) return;
    if (!user) {
      window.location.href = `/account/signin?callbackUrl=/video/${video?.id}`;
      return;
    }
    try {
      setPostingComment(true);
      const res = await fetch('/api/videos/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, commentText: newComment.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [data.comment, ...prev]);
        setCommentCount((prev) => prev + 1);
        setNewComment('');
      }
    } catch (e) {
    } finally {
      setPostingComment(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/video/${video.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Watch on Crestar', url });
      } catch (e) {}
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied!');
    }
    fetch('/api/videos/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: video.id }),
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full"
          style={{ animation: 'video-spin 1s linear infinite' }}
        />
        <style jsx global>{`
          @keyframes video-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (notFound || !video) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <Play size={56} className="text-white/20" />
        <p className="text-white/60 text-lg">This video is no longer available</p>
        <a
          href="/"
          className="bg-[#D4AF37] text-black px-6 py-3 rounded-xl font-bold hover:opacity-90"
        >
          Back to Feed
        </a>
      </div>
    );
  }

  const displayName = video.business_name || video.display_name || `@${video.username}`;
  const firstTag = video.tagged_items?.find((t) => t.product_title || t.service_title);
  const tagPrice = firstTag ? parseFloat(firstTag.product_price ?? firstTag.service_price ?? 0) : 0;
  let tagImage = null;
  if (firstTag) {
    let m = firstTag.product_media ?? firstTag.service_media;
    if (typeof m === 'string') {
      try {
        m = JSON.parse(m);
      } catch (e) {
        m = [];
      }
    }
    tagImage = Array.isArray(m) ? m[0] : null;
  }
  const tagId = firstTag ? firstTag.product_id || firstTag.service_id : null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < creatorVideos.length - 1;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="relative h-full aspect-[9/16] max-w-full bg-black">
        <video
          ref={videoRef}
          src={video.video_url}
          poster={video.thumbnail_url || undefined}
          autoPlay
          loop
          playsInline
          className="w-full h-full object-contain"
          onClick={togglePlay}
        />

        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center">
              <Play size={32} className="text-white" fill="white" />
            </span>
          </button>
        )}

        {/* Close — history.back so we leave the viewer, not push another profile */}
        <button
          type="button"
          onClick={() => closeViewer(video)}
          aria-label="Close video"
          className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80"
        >
          <X size={20} className="text-white" />
        </button>

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => goToVideo(-1)}
            disabled={!hasPrev}
            className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
          >
            <ChevronUp size={20} className="text-white" />
          </button>
          <button
            type="button"
            onClick={() => goToVideo(1)}
            disabled={!hasNext}
            className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
          >
            <ChevronDown size={20} className="text-white" />
          </button>
        </div>

        <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
          <button type="button" onClick={handleLike} className="flex flex-col items-center gap-1">
            <span className="w-12 h-12 bg-white/15 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/25">
              <Heart
                size={22}
                className={liked ? 'text-[#D4AF37]' : 'text-white'}
                fill={liked ? '#D4AF37' : 'transparent'}
              />
            </span>
            <span className="text-white text-xs font-semibold">{likeCount}</span>
          </button>
          <button type="button" onClick={openComments} className="flex flex-col items-center gap-1">
            <span className="w-12 h-12 bg-white/15 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/25">
              <MessageCircle size={22} className="text-white" />
            </span>
            <span className="text-white text-xs font-semibold">{commentCount}</span>
          </button>
          <button type="button" onClick={handleShare} className="flex flex-col items-center gap-1">
            <span className="w-12 h-12 bg-white/15 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/25">
              <Share2 size={22} className="text-white" />
            </span>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-16 p-4 pb-6 bg-gradient-to-t from-black/70 to-transparent">
          <a
            href={video.username ? `/${video.username}` : `/seller/${video.creator_user_id}`}
            className="flex items-center gap-2 mb-2"
          >
            <span className="text-white font-bold">{displayName}</span>
            {video.is_verified && <BadgeCheck size={16} className="text-[#D4AF37]" />}
          </a>
          {video.caption ? (
            <p className="text-white/90 text-sm mb-3 line-clamp-2">{video.caption}</p>
          ) : null}

          {firstTag && tagId && (
            <a
              href={`/product/${tagId}`}
              className="inline-flex items-center gap-2.5 bg-black/80 border border-[#D4AF37]/60 rounded-xl px-3.5 py-2.5 hover:bg-black"
            >
              {tagImage ? (
                <img src={tagImage} alt="" className="w-9 h-9 rounded-lg object-cover" />
              ) : (
                <ShoppingBag size={18} className="text-[#D4AF37]" />
              )}
              <span>
                <span className="block text-white text-xs font-semibold max-w-[180px] truncate">
                  {firstTag.product_title || firstTag.service_title}
                </span>
                <CurrencyPrice
                  price={tagPrice}
                  originalCurrency={firstTag.seller_currency || 'GHS'}
                  showOriginal={false}
                  size="small"
                  textStyle={{
                    color: '#D4AF37',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                  }}
                />
              </span>
            </a>
          )}
        </div>
      </div>

      {showComments && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
          <div className="bg-[#141414] border border-white/10 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-bold">Comments ({commentCount})</h3>
              <button
                type="button"
                onClick={() => setShowComments(false)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <X size={18} className="text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <p className="text-white/40 text-center py-8">No comments yet. Be the first!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
                      {comment.user?.profileImage ? (
                        <img
                          src={comment.user.profileImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-white/50">
                          {(comment.user?.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">@{comment.user?.username}</p>
                      <p className="text-white/80 text-sm">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 p-4 border-t border-white/10">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePostComment();
                }}
                placeholder="Add a comment..."
                className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={handlePostComment}
                disabled={!newComment.trim() || postingComment}
                className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center disabled:opacity-40"
              >
                <Send size={16} className="text-black" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
