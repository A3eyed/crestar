// @ts-nocheck
'use client';
import { useState, useEffect, useCallback } from 'react';
import useUser from '@/utils/useUser';
import CurrencyPrice from '@/components/CurrencyPrice';
import {
  ArrowLeft,
  MessageCircle,
  Share2,
  BadgeCheck,
  Grid3X3,
  ShoppingBag,
  Play,
  Package,
  User as UserIcon,
  Trash2,
  Loader2,
} from 'lucide-react';

/**
 * Public profile page — works for BOTH regular users and sellers,
 * exactly like TikTok: videos grid first, shop tab if they sell,
 * follow/message actions, and playable videos via /video/:id.
 */
export default function PublicProfilePage() {
  const { data: user } = useUser();
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedTab, setSelectedTab] = useState('videos');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [profileId, setProfileId] = useState(null);
  const [deletingVideoId, setDeletingVideoId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const fetchAll = useCallback(async (id) => {
    try {
      setLoading(true);
      // Profile (works for sellers AND regular users)
      const res = await fetch(`/api/sellers/${id}`);
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      if (!data.profile) {
        setNotFound(true);
        return;
      }
      setProfile(data.profile);
      setProducts(data.products || []);
      setServices(data.services || []);
      setFollowerCount(data.profile?.stats?.followers || 0);

      // Videos (TikTok-style grid)
      try {
        const vidsRes = await fetch(`/api/videos/user/${id}`);
        if (vidsRes.ok) {
          const vidsData = await vidsRes.json();
          setVideos(vidsData.videos || []);
        }
      } catch (e) {}
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    if (id) {
      setProfileId(id);
      fetchAll(id);
    }
  }, [fetchAll]);

  // Check follow status (persisted, like mobile)
  useEffect(() => {
    if (!user || !profileId) return;
    fetch(`/api/follows?targetId=${profileId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setIsFollowing(!!data.following);
      })
      .catch(() => {});
  }, [user, profileId]);

  const handleFollow = async () => {
    if (!user) {
      const handle = profile?.username || profileId;
      window.location.href = `/account/signin?callbackUrl=/${handle}`;
      return;
    }
    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: profileId }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(!!data.following);
        setFollowerCount((prev) => (data.following ? prev + 1 : Math.max(0, prev - 1)));
      }
    } catch (e) {}
  };

  const handleDeleteVideo = async (videoId) => {
    const confirmed = window.confirm(
      'Delete video?\n\nThis video will be moved to Recently deleted. You can restore it within 30 days from your profile menu.'
    );
    if (!confirmed) return;

    try {
      setDeleteError(null);
      setDeletingVideoId(videoId);
      const res = await fetch(`/api/videos/delete?videoId=${videoId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(
          `When calling /api/videos/delete, the response was [${res.status}] ${res.statusText}`
        );
      }
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch (err) {
      console.error('Delete video error:', err);
      setDeleteError('Could not delete that video. Please try again.');
    } finally {
      setDeletingVideoId(null);
    }
  };

  const handleShare = async () => {
    // Clean, shareable handle URL: crestarhq.com/username
    const handle = profile?.username || profileId;
    const url = `${window.location.origin}/${handle}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Crestar profile`, url });
      } catch (e) {}
    } else {
      await navigator.clipboard.writeText(url);
      alert('Profile link copied!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full"
          style={{ animation: 'pp-spin 1s linear infinite' }}
        />
        <style jsx global>{`
          @keyframes pp-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <UserIcon size={56} className="text-white/20" />
        <p className="text-white/60 text-lg">This account doesn't exist</p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-[#D4AF37] text-black rounded-xl font-bold hover:opacity-90"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isSellerProfile = !!profile.is_seller;
  // Always prefer the officially registered business name (TikTok Shop style)
  const displayName =
    profile.display_business_name ||
    profile.business_name ||
    profile.display_name ||
    `@${profile.username}`;
  const allShopItems = [...products, ...services];
  const isOwnProfile = user && String(user.id) === String(profile.user_id || profileId);

  const tabs = [
    { id: 'videos', icon: Grid3X3, label: 'Videos' },
    ...(allShopItems.length > 0 || isSellerProfile
      ? [{ id: 'shop', icon: ShoppingBag, label: 'Shop' }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="font-semibold text-sm">@{profile.username}</span>
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Profile info — TikTok layout */}
        <div className="flex flex-col items-center pt-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border border-white/15 flex items-center justify-center mb-3">
            {profile.profile_image ? (
              <img
                src={profile.profile_image}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-white/70">
                {(displayName || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-lg font-bold">{displayName}</h1>
            {profile.is_verified && <BadgeCheck size={17} className="text-[#D4AF37]" />}
          </div>
          <p className="text-white/50 text-sm mb-4">@{profile.username}</p>

          {/* Stats */}
          <div className="flex items-center gap-10 mb-4">
            <div className="text-center">
              <p className="font-bold text-lg">{followerCount}</p>
              <p className="text-white/50 text-xs">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{videos.length}</p>
              <p className="text-white/50 text-xs">Videos</p>
            </div>
            {isSellerProfile && (
              <div className="text-center">
                <p className="font-bold text-lg">{allShopItems.length}</p>
                <p className="text-white/50 text-xs">Products</p>
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-white/80 text-sm text-center max-w-sm mb-5">{profile.bio}</p>
          )}

          {/* Actions */}
          {!isOwnProfile && (
            <div className="flex items-center gap-2 w-full max-w-sm mb-6">
              <button
                onClick={handleFollow}
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-colors ${
                  isFollowing
                    ? 'bg-white/10 border border-white/15 hover:bg-white/20'
                    : 'bg-[#D4AF37] text-black hover:opacity-90'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <a
                href="/inbox"
                className="flex-1 bg-white/10 border border-white/15 py-2.5 rounded-lg font-semibold text-sm text-center hover:bg-white/20 flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                Message
              </a>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-1">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className="flex-1 py-3 flex items-center justify-center relative"
              >
                <TabIcon size={20} className={isActive ? 'text-white' : 'text-white/40'} />
                {isActive && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Videos tab — grid, tap to play (TikTok style) */}
        {selectedTab === 'videos' && (
          <div>
            {deleteError && <p className="text-red-400 text-sm text-center py-3">{deleteError}</p>}
            {videos.length === 0 ? (
              <div className="text-center py-16">
                <Play size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/50">No videos yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="relative aspect-[3/4] bg-white/5 overflow-hidden group"
                  >
                    <a href={`/video/${video.id}`} className="block w-full h-full">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <video
                          src={video.video_url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      )}
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                        <Play size={12} className="text-white" fill="white" />
                        <span className="text-white text-xs font-semibold">
                          {video.views_count ?? 0}
                        </span>
                      </div>
                      {video.tagged_items?.length > 0 && (
                        <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-[#D4AF37] rounded-full flex items-center justify-center">
                          <ShoppingBag size={11} className="text-black" />
                        </div>
                      )}
                    </a>

                    {isOwnProfile && (
                      <button
                        type="button"
                        onClick={() => handleDeleteVideo(video.id)}
                        disabled={deletingVideoId === video.id}
                        aria-label="Delete video"
                        title="Delete video"
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center transition-colors disabled:opacity-60"
                      >
                        {deletingVideoId === video.id ? (
                          <Loader2
                            size={13}
                            className="text-white"
                            style={{ animation: 'pp-spin 1s linear infinite' }}
                          />
                        ) : (
                          <Trash2 size={13} className="text-white" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shop tab */}
        {selectedTab === 'shop' && (
          <div>
            {allShopItems.length === 0 ? (
              <div className="text-center py-16">
                <Package size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/50">No products yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {allShopItems.map((item) => {
                  let media = item.media;
                  if (typeof media === 'string') {
                    try {
                      media = JSON.parse(media);
                    } catch (e) {
                      media = [];
                    }
                  }
                  const image = Array.isArray(media) ? media[0] : null;
                  const price = parseFloat(item.price ?? item.basic_price ?? 0);
                  return (
                    <a
                      key={item.id}
                      href={`/product/${item.id}`}
                      className="relative aspect-[3/4] bg-white/5 overflow-hidden group"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag size={24} className="text-white/20" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-1">
                        <CurrencyPrice
                          price={price}
                          originalCurrency={item.seller_currency || 'GHS'}
                          showOriginal={false}
                          size="small"
                          textStyle={{
                            color: '#D4AF37',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                          }}
                        />
                        <p className="text-white text-xs truncate">{item.title}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes pp-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
