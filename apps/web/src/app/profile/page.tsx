// @ts-nocheck
'use client';
import { useState, useEffect, useCallback } from 'react';
import useUser from '@/utils/useUser';
import useLocalization from '@/utils/useLocalization';
import BottomNav from '@/components/BottomNav';
import {
  Menu,
  User as UserIcon,
  Wallet,
  Settings,
  ShoppingBag,
  Inbox,
  Package,
  HelpCircle,
  Shield,
  Grid3X3,
  Heart,
  Bookmark,
  Lock,
  BadgeCheck,
  Store,
  TrendingUp,
  Truck,
  Plus,
  Bell,
} from 'lucide-react';

const shell = 'min-h-screen bg-black text-white';

function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return '—';
  return `GH₵ ${n.toFixed(2)}`;
}

function mediaUrl(media) {
  if (!media) return null;
  if (Array.isArray(media) && media.length) {
    const first = media[0];
    return typeof first === 'string' ? first : first?.url || first?.uri || null;
  }
  if (typeof media === 'string') {
    try {
      const parsed = JSON.parse(media);
      return mediaUrl(parsed);
    } catch {
      return media;
    }
  }
  return null;
}

function EmptyState({ icon: Icon, title, subtitle, actionHref, actionLabel }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-8">
      <Icon size={40} className="text-white/30 mb-3" />
      <p className="text-white/70 text-sm font-medium mb-1">{title}</p>
      {subtitle && <p className="text-white/40 text-xs max-w-xs">{subtitle}</p>}
      {actionHref && actionLabel && (
        <a
          href={actionHref}
          className="mt-5 bg-[#D4AF37] text-black px-5 py-2.5 rounded-lg text-sm font-bold active:opacity-90"
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] bg-white/10 animate-pulse" />
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className={`${shell} pb-24`}>
      <div className="max-w-2xl mx-auto px-4 pt-10 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-white/10 animate-pulse mb-4" />
        <div className="h-5 w-36 rounded bg-white/10 animate-pulse mb-2" />
        <div className="h-3.5 w-24 rounded bg-white/10 animate-pulse mb-6" />
        <div className="grid grid-cols-3 gap-0.5 w-full mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-white/10 animate-pulse" />
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function GuestProfile({ t }) {
  return (
    <div className={`${shell} flex flex-col`}>
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-24 h-24 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center mb-6">
          <UserIcon size={40} className="text-white/40" strokeWidth={1.25} />
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight mb-7 text-center text-white">
          {t('signInToCrestar')}
        </h1>
        <a
          href="/account/signin?callbackUrl=/profile"
          className="w-full max-w-[320px] bg-[#D4AF37] text-black py-[15px] rounded-full font-bold text-center text-[16px] active:opacity-90"
        >
          {t('signIn')}
        </a>
        <a
          href="/account/signup?callbackUrl=/profile"
          className="mt-5 text-sm font-medium text-white/50 active:text-white/70"
        >
          {t('createAccount')}
        </a>
      </div>
      <BottomNav />
    </div>
  );
}

export default function ProfilePage() {
  const { data: user, loading: userLoading, refetch } = useUser();
  const { t } = useLocalization();
  const [activeTab, setActiveTab] = useState('posts');
  const [showDrawer, setShowDrawer] = useState(false);
  const [posts, setPosts] = useState([]);
  const [products, setProducts] = useState([]);
  const [liked, setLiked] = useState([]);
  const [saved, setSaved] = useState([]);
  const [privateVideos, setPrivateVideos] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isDeliverer, setIsDeliverer] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadActivity, setUnreadActivity] = useState(0);
  const [centerBadge, setCenterBadge] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('updated=')) {
      refetch?.();
    }
  }, [refetch]);

  const fetchPosts = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingPosts(true);
      const res = await fetch(`/api/videos/user/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.videos || []);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchPosts();
    (async () => {
      try {
        const res = await fetch('/api/business-centers');
        if (res.ok) {
          const data = await res.json();
          if (data.center?.verification_status === 'approved' || data.center?.status === 'active') {
            const type = data.center.center_type;
            if (type === 'seller' || type === 'foodhub') setIsSeller(true);
            else if (type === 'creator') setIsCreator(true);
            else if (type === 'deliverer') setIsDeliverer(true);
          }
        }
      } catch {}
    })();
  }, [user?.id, fetchPosts]);

  // Inbox badge stays until a conversation is opened (API marks messages read)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/notifications?counts=1', { credentials: 'include' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const c = data.counts || {};
        setUnreadMessages(Number(c.unreadMessages) || 0);
        setUnreadActivity(Number(c.unreadActivity) || 0);
        setCenterBadge(Number(c.center) || 0);
      } catch {}
    };
    load();
    const id = setInterval(load, 20000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      setLoadingTab(true);
      try {
        if (activeTab === 'shop' && isSeller) {
          const res = await fetch(`/api/listings/products?sellerId=${encodeURIComponent(user.id)}`);
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) setProducts(data.products || []);
          }
        } else if (activeTab === 'likes') {
          const res = await fetch('/api/videos/liked');
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) setLiked(data.videos || []);
          }
        } else if (activeTab === 'saved') {
          const res = await fetch('/api/videos/saved');
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) setSaved(data.videos || []);
          }
        } else if (activeTab === 'private') {
          const res = await fetch('/api/videos/private');
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) setPrivateVideos(data.videos || []);
          }
        }
      } catch (e) {
        console.error('Tab load error:', e);
      } finally {
        if (!cancelled) setLoadingTab(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, user?.id, isSeller]);

  const username = user?.username || (user?.email ? user.email.split('@')[0] : 'user');
  const displayName = user?.display_name || user?.name || username;
  const isVerified = !!user?.is_verified;
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/${username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${username} on Crestar`, url });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {}
    }
  };

  let monetizationItem = {
    label: t('monetizationCenter'),
    icon: TrendingUp,
    href: '/monetization-center',
  };
  if (isSeller) {
    monetizationItem = { label: t('sellerCenter'), icon: Store, href: '/seller/dashboard' };
  } else if (isCreator) {
    monetizationItem = { label: t('creatorProgram'), icon: TrendingUp, href: '/monetization-center' };
  } else if (isDeliverer) {
    monetizationItem = { label: t('deliveryCenter'), icon: Truck, href: '/monetization-center' };
  }

  const drawerItems = [
    ...(isAdmin
      ? [{ label: t('admin'), icon: Shield, href: '/admin/dashboard', badge: 0 }]
      : []),
    { label: t('inbox'), icon: Inbox, href: '/inbox', badge: unreadMessages },
    { label: 'Notifications', icon: Bell, href: '/notifications', badge: unreadActivity },
    { label: t('orders'), icon: Package, href: '/orders' },
    { label: t('wallet'), icon: Wallet, href: '/wallet' },
    { ...monetizationItem, badge: centerBadge },
    { label: t('support'), icon: HelpCircle, href: '/support' },
    { label: t('settingsPrivacy'), icon: Settings, href: '/settings' },
  ];

  const tabs = [
    { id: 'posts', icon: Grid3X3 },
    ...(isSeller ? [{ id: 'shop', icon: ShoppingBag }] : []),
    { id: 'private', icon: Lock },
    { id: 'likes', icon: Heart },
    { id: 'saved', icon: Bookmark },
  ];

  if (userLoading) return <ProfileSkeleton />;
  if (!user) return <GuestProfile t={t} />;

  return (
    <div className={`${shell} pb-24`}>
      <div className="max-w-2xl mx-auto px-4 pt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowDrawer(true)}
          className="relative w-10 h-10 flex items-center justify-center rounded-full active:bg-white/10"
        >
          <Menu size={24} className="text-white" />
          {unreadMessages + unreadActivity > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FE2C55] text-white text-[10px] font-bold flex items-center justify-center">
              {unreadMessages + unreadActivity > 99
                ? '99+'
                : unreadMessages + unreadActivity}
            </span>
          )}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border border-white/15 flex items-center justify-center mb-3">
            {user.profile_image ? (
              <img src={user.profile_image} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white/70">
                {(displayName || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex flex-col items-center mb-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-white text-xl font-bold leading-tight">{displayName}</h2>
              {isVerified && <BadgeCheck size={18} className="text-[#D4AF37]" />}
            </div>
            <span className="text-white/55 text-sm mt-1">@{username}</span>
          </div>

          <div className="flex items-center gap-10 mb-4">
            <div className="text-center">
              <p className="text-white font-bold text-lg">{user.following_count ?? 0}</p>
              <p className="text-white/50 text-xs">{t('following')}</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">{user.followers_count ?? 0}</p>
              <p className="text-white/50 text-xs">{t('followers')}</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">{posts.length}</p>
              <p className="text-white/50 text-xs">{t('posts')}</p>
            </div>
          </div>

          {user.bio && user.bio !== '✨ Content Creator' ? (
            <p className="text-white/80 text-sm text-center max-w-sm mb-5">{user.bio}</p>
          ) : (
            <a href="/edit-profile" className="text-white/40 text-sm mb-5">
              {t('addBio')}
            </a>
          )}

          <div className="flex items-center gap-2 w-full max-w-sm mb-6">
            <a
              href="/edit-profile"
              className="flex-1 bg-white/10 border border-white/15 text-center py-2.5 rounded-lg font-semibold text-sm active:opacity-80"
            >
              {t('editProfile')}
            </a>
            <button
              type="button"
              onClick={handleShareProfile}
              className="flex-1 bg-white/10 border border-white/15 py-2.5 rounded-lg font-semibold text-sm active:opacity-80"
            >
              {t('shareProfile')}
            </button>
            <a
              href="/wallet"
              className="w-11 h-10 bg-white/10 border border-white/15 rounded-lg flex items-center justify-center active:opacity-80"
            >
              <Wallet size={18} className="text-[#D4AF37]" />
            </a>
          </div>
        </div>

        <div className="flex border-b border-white/10 mb-1">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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

        {activeTab === 'posts' && (
          <div className="pt-2">
            {loadingPosts ? (
              <GridSkeleton />
            ) : posts.length === 0 ? (
              <EmptyState icon={Grid3X3} title={t('noPostsYet')} subtitle={t('noPostsSubtitle')} />
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {posts.map((video) => (
                  <a key={video.id} href={`/video/${video.id}`} className="relative aspect-[3/4] bg-white/5 overflow-hidden">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={video.video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="pt-2">
            {loadingTab ? (
              <GridSkeleton />
            ) : products.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title={t('noProductsYet')}
                subtitle={t('noProductsSubtitle')}
                actionHref="/seller/dashboard"
                actionLabel={t('addProduct')}
              />
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {products.map((p) => {
                  const img = mediaUrl(p.media) || mediaUrl(p.images);
                  return (
                    <a key={p.id} href={`/product/${p.id}`} className="relative aspect-[3/4] bg-white/5 overflow-hidden">
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag size={28} className="text-white/25" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1.5">
                        <p className="text-white text-xs font-bold truncate">{formatPrice(p.price)}</p>
                        <p className="text-white/60 text-[10px] truncate">{p.title}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
            {products.length > 0 && (
              <div className="flex justify-center py-4">
                <a href="/seller/dashboard" className="inline-flex items-center gap-1.5 text-[#D4AF37] text-sm font-semibold">
                  <Plus size={16} /> {t('manageShop')}
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'private' && (
          <div className="pt-2">
            {loadingTab ? (
              <GridSkeleton />
            ) : privateVideos.length === 0 ? (
              <EmptyState icon={Lock} title={t('noPrivateVideos')} subtitle={t('noPrivateSubtitle')} />
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {privateVideos.map((video) => (
                  <a key={video.id} href={`/video/${video.id}`} className="relative aspect-[3/4] bg-white/5 overflow-hidden">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={video.video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'likes' && (
          <div className="pt-2">
            {loadingTab ? (
              <GridSkeleton />
            ) : liked.length === 0 ? (
              <EmptyState icon={Heart} title={t('noLikedVideos')} subtitle={t('noLikedSubtitle')} />
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {liked.map((video) => (
                  <a key={video.id} href={`/video/${video.id}`} className="relative aspect-[3/4] bg-white/5 overflow-hidden">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={video.video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="pt-2">
            {loadingTab ? (
              <GridSkeleton />
            ) : saved.length === 0 ? (
              <EmptyState icon={Bookmark} title={t('noSavedVideos') || 'No saved videos'} subtitle={t('noSavedSubtitle') || ''} />
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {saved.map((video) => (
                  <a key={video.id} href={`/video/${video.id}`} className="relative aspect-[3/4] bg-white/5 overflow-hidden">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={video.video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setShowDrawer(false)} aria-label="Close" />
          <div className="relative w-full max-w-xs bg-black border-l border-white/10 h-full overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="font-bold">Menu</span>
              <button type="button" onClick={() => setShowDrawer(false)} className="text-white/60 text-sm">
                Close
              </button>
            </div>
            <div className="p-2">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                const badge = Number(item.badge) || 0;
                return (
                  <a
                    key={item.href + item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 relative"
                  >
                    <span className="relative inline-flex">
                      <Icon size={20} className="text-white/70" />
                      {badge > 0 && (
                        <span className="absolute -right-2 -top-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FE2C55] text-white text-[10px] font-bold flex items-center justify-center">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {badge > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#FE2C55] text-white text-[11px] font-bold flex items-center justify-center">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
