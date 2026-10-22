// @ts-nocheck
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import useUser from '@/utils/useUser';
import CurrencyPrice from '@/components/CurrencyPrice';
import { fetchWithRetry } from '@/utils/fetchWithRetry';
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

function goBackFromProfile() {
  try {
    const ref = document.referrer;
    if (ref) {
      const u = new URL(ref);
      if (u.origin === window.location.origin && u.pathname.startsWith('/video/')) {
        window.location.assign('/');
        return;
      }
    }
  } catch {}
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.assign('/');
  }
}

function VideoThumb({ thumbnailUrl, videoUrl, className }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (thumbnailUrl) return;
    const v = videoRef.current;
    if (!v) return;
    const seekFrame = () => {
      try {
        if (v.readyState >= 1 && (v.currentTime < 0.05 || Number.isNaN(v.currentTime))) {
          const t = Math.min(0.25, (v.duration && Number.isFinite(v.duration) ? v.duration * 0.05 : 0.25));
          v.currentTime = t > 0 ? t : 0.1;
        }
      } catch {}
    };
    v.addEventListener('loadedmetadata', seekFrame);
    v.addEventListener('loadeddata', seekFrame);
    try { v.load(); } catch {}
    return () => {
      v.removeEventListener('loadedmetadata', seekFrame);
      v.removeEventListener('loadeddata', seekFrame);
    };
  }, [thumbnailUrl, videoUrl]);

  if (thumbnailUrl) {
    return <img src={thumbnailUrl} alt="" className={className} loading="lazy" />;
  }
  if (!videoUrl) return <div className={`${className} bg-white/5`} />;
  const src = videoUrl.includes('#') || videoUrl.includes('?') ? videoUrl : `${videoUrl}#t=0.1`;
  return (
    <video ref={videoRef} src={src} className={className} muted playsInline preload="auto" />
  );
}

export default function PublicProfilePage() {
  const { data: user } = useUser();
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('videos');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [resolvedUserId, setResolvedUserId] = useState(null);
  const [deletingVideoId, setDeletingVideoId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [pathKey, setPathKey] = useState(null);
  const hasProfileRef = useRef(false);

  const fetchAll = useCallback(async (key) => {
    if (!key) return;
    try {
      setNotFound(false);
      setLoadError(null);
      if (!hasProfileRef.current) setLoading(true);

      const res = await fetchWithRetry(`/api/sellers/${encodeURIComponent(key)}`, { attempts: 3 });

      if (res.status === 404) {
        setNotFound(true);
        setProfile(null);
        hasProfileRef.current = false;
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setLoadError('Could not load this profile. Please try again.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!data.profile) {
        setNotFound(true);
        setProfile(null);
        hasProfileRef.current = false;
        setLoading(false);
        return;
      }

      const uid = String(data.profile.user_id || '');
      setProfile(data.profile);
      hasProfileRef.current = true;
      setProducts(data.products || []);
      setServices(data.services || []);
      setResolvedUserId(uid);
      setFollowerCount(data.profile?.stats?.followers ?? data.profile?.followers_count ?? 0);
      setFollowingCount(data.profile?.stats?.following ?? data.profile?.following_count ?? 0);
      setLoading(false);

      if (uid) {
        setVideosLoading(true);
        try {
          const vidsRes = await fetchWithRetry(`/api/videos/user/${encodeURIComponent(uid)}`, { attempts: 2 });
          if (vidsRes.ok) {
            const vidsData = await vidsRes.json();
            setVideos(vidsData.videos || []);
          }
        } catch (e) {
          /* secondary */
        } finally {
          setVideosLoading(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setLoadError('Could not load this profile. Please try again.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const key = pathParts[0] === 'seller' ? pathParts[1] : pathParts[pathParts.length - 1];
    setPathKey(key || null);
    if (key) fetchAll(key);
  }, [fetchAll]);

  useEffect(() => {
    if (!user || !resolvedUserId) return;
    if (String(user.id) === String(resolvedUserId)) return;
    fetch(`/api/follows?targetId=${encodeURIComponent(resolvedUserId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setIsFollowing(!!data.following);
          if (typeof data.followersCount === 'number') setFollowerCount(data.followersCount);
        }
      })
      .catch(() => {});
  }, [user, resolvedUserId]);

  const handleFollow = async () => {
    if (!resolvedUserId) return;
    if (!user) {
      const handle = profile?.username || resolvedUserId;
      window.location.href = `/account/signin?callbackUrl=/${handle}`;
      return;
    }
    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetId: resolvedUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(!!data.following);
        if (typeof data.followersCount === 'number') setFollowerCount(data.followersCount);
        else setFollowerCount((prev) => (data.following ? prev + 1 : Math.max(0, prev - 1)));
      }
    } catch (e) {}
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Delete video?\n\nThis video will be moved to Recently deleted. You can restore it within 30 days from your profile menu.')) return;
    try {
      setDeleteError(null);
      setDeletingVideoId(videoId);
      const res = await fetch(`/api/videos/delete?videoId=${videoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed [${res.status}]`);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch (err) {
      console.error('Delete video error:', err);
      setDeleteError('Could not delete that video. Please try again.');
    } finally {
      setDeletingVideoId(null);
    }
  };

  const handleShare = async () => {
    const handle = profile?.username || resolvedUserId;
    const url = `${window.location.origin}/${handle}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Crestar profile', url }); } catch (e) {}
    } else {
      await navigator.clipboard.writeText(url);
      alert('Profile link copied!');
    }
  };

  const openMessage = () => {
    if (!resolvedUserId) return;
    // Prefer clean handle path so back lands on the same public profile URL
    const profilePath = profile?.username
      ? `/${profile.username}`
      : `/seller/${resolvedUserId}`;
    const qs = new URLSearchParams({
      userId: String(resolvedUserId),
      returnTo: profilePath,
    });
    const inboxUrl = `/inbox?${qs.toString()}`;
    if (!user) {
      window.location.href =
        `/account/signin?callbackUrl=${encodeURIComponent(inboxUrl)}`;
      return;
    }
    window.location.href = inboxUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full" style={{ animation: 'pp-spin 1s linear infinite' }} />
        <style jsx global>{`@keyframes pp-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <UserIcon size={56} className="text-white/20" />
        <p className="text-white/60 text-lg">This account doesn't exist</p>
        <button type="button" onClick={goBackFromProfile} className="px-6 py-3 bg-[#D4AF37] text-black rounded-xl font-bold hover:opacity-90">Go Back</button>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-6">
        <UserIcon size={56} className="text-white/20" />
        <p className="text-white/60 text-lg text-center">{loadError || 'Could not load this profile.'}</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => pathKey && fetchAll(pathKey)} className="px-6 py-3 bg-[#D4AF37] text-black rounded-xl font-bold hover:opacity-90">Try again</button>
          <button type="button" onClick={goBackFromProfile} className="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20">Go Back</button>
        </div>
      </div>
    );
  }

  const isSellerProfile = !!profile.is_seller;
  const displayName = profile.display_business_name || profile.business_name || profile.display_name || `@${profile.username}`;
  const allShopItems = [...products, ...services];
  const isOwnProfile = user && resolvedUserId && String(user.id) === String(resolvedUserId);
  const tabs = [
    { id: 'videos', icon: Grid3X3, label: 'Videos' },
    ...(allShopItems.length > 0 || isSellerProfile ? [{ id: 'shop', icon: ShoppingBag, label: 'Shop' }] : []),
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button type="button" onClick={goBackFromProfile} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><ArrowLeft size={20} /></button>
          <span className="font-semibold text-sm">@{profile.username}</span>
          <button type="button" onClick={handleShare} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><Share2 size={18} /></button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        <div className="flex flex-col items-center pt-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border border-white/15 flex items-center justify-center mb-3">
            {profile.profile_image ? (
              <img src={profile.profile_image} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white/70">{(displayName || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-lg font-bold">{displayName}</h1>
            {profile.is_verified && <BadgeCheck size={17} className="text-[#D4AF37]" />}
          </div>
          <p className="text-white/50 text-sm mb-4">@{profile.username}</p>
          <div className="flex items-center gap-10 mb-4">
            <div className="text-center"><p className="font-bold text-lg">{followingCount}</p><p className="text-white/50 text-xs">Following</p></div>
            <div className="text-center"><p className="font-bold text-lg">{followerCount}</p><p className="text-white/50 text-xs">Followers</p></div>
            <div className="text-center"><p className="font-bold text-lg">{videosLoading && videos.length === 0 ? '—' : videos.length}</p><p className="text-white/50 text-xs">Videos</p></div>
          </div>
          {profile.bio && <p className="text-white/80 text-sm text-center max-w-sm mb-5">{profile.bio}</p>}
          {isOwnProfile ? (
            <div className="flex items-center gap-2 w-full max-w-sm mb-6">
              <a href="/edit-profile" className="flex-1 bg-white/10 border border-white/15 py-2.5 rounded-lg font-semibold text-sm text-center hover:bg-white/20">Edit profile</a>
              <a href="/profile" className="flex-1 bg-white/10 border border-white/15 py-2.5 rounded-lg font-semibold text-sm text-center hover:bg-white/20">My profile</a>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full max-w-sm mb-6">
              <button type="button" onClick={handleFollow} className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-colors ${isFollowing ? 'bg-white/10 border border-white/15 hover:bg-white/20' : 'bg-[#D4AF37] text-black hover:opacity-90'}`}>{isFollowing ? 'Following' : 'Follow'}</button>
              <button type="button" onClick={openMessage} className="flex-1 bg-white/10 border border-white/15 py-2.5 rounded-lg font-semibold text-sm text-center hover:bg-white/20 flex items-center justify-center gap-2"><MessageCircle size={16} />Message</button>
            </div>
          )}
        </div>

        <div className="flex border-b border-white/10 mb-1">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = selectedTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => setSelectedTab(tab.id)} className="flex-1 py-3 flex items-center justify-center relative">
                <TabIcon size={20} className={isActive ? 'text-white' : 'text-white/40'} />
                {isActive && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-white rounded-full" />}
              </button>
            );
          })}
        </div>

        {selectedTab === 'videos' && (
          <div>
            {deleteError && <p className="text-red-400 text-sm text-center py-3">{deleteError}</p>}
            {videosLoading && videos.length === 0 ? (
              <div className="grid grid-cols-3 gap-0.5">{Array.from({ length: 6 }).map((_, i) => (<div key={i} className="aspect-[3/4] bg-white/10 animate-pulse" />))}</div>
            ) : videos.length === 0 ? (
              <div className="text-center py-16"><Play size={48} className="text-white/20 mx-auto mb-4" /><p className="text-white/50">No videos yet</p></div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {videos.map((video) => (
                  <div key={video.id} className="relative aspect-[3/4] bg-white/5 overflow-hidden group">
                    <a href={`/video/${video.id}`} className="block w-full h-full">
                      <VideoThumb thumbnailUrl={video.thumbnail_url || video.thumbnailUrl} videoUrl={video.video_url || video.videoUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1"><Play size={12} className="text-white" fill="white" /><span className="text-white text-xs font-semibold">{video.views_count ?? video.viewsCount ?? 0}</span></div>
                      {(video.tagged_items?.length > 0 || video.taggedItems?.length > 0) && (<div className="absolute top-1.5 left-1.5 w-5 h-5 bg-[#D4AF37] rounded-full flex items-center justify-center"><ShoppingBag size={11} className="text-black" /></div>)}
                    </a>
                    {isOwnProfile && (
                      <button type="button" onClick={() => handleDeleteVideo(video.id)} disabled={deletingVideoId === video.id} aria-label="Delete video" className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center disabled:opacity-60">
                        {deletingVideoId === video.id ? <Loader2 size={13} className="text-white" style={{ animation: 'pp-spin 1s linear infinite' }} /> : <Trash2 size={13} className="text-white" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'shop' && (
          <div>
            {allShopItems.length === 0 ? (
              <div className="text-center py-16"><Package size={48} className="text-white/20 mx-auto mb-4" /><p className="text-white/50">No products yet</p></div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {allShopItems.map((item) => {
                  let media = item.media;
                  if (typeof media === 'string') { try { media = JSON.parse(media); } catch (e) { media = []; } }
                  const image = Array.isArray(media) ? media[0] : null;
                  const price = parseFloat(item.price ?? item.basic_price ?? 0);
                  return (
                    <a key={item.id} href={`/product/${item.id}`} className="relative aspect-[3/4] bg-white/5 overflow-hidden group">
                      {image ? <img src={typeof image === 'string' ? image : image?.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={24} className="text-white/20" /></div>}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-1">
                        <CurrencyPrice price={price} originalCurrency={item.seller_currency || 'GHS'} showOriginal={false} size="small" textStyle={{ color: '#D4AF37', fontSize: '0.75rem', fontWeight: 'bold' }} />
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
      <style jsx global>{`@keyframes pp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
