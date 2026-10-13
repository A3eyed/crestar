// @ts-nocheck
'use client';
import { useState, useEffect, useCallback } from 'react';
import useUser from '@/utils/useUser';
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
} from 'lucide-react';

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-10 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-black/5 dark:bg-white/10 animate-pulse mb-4" />
        <div className="h-5 w-36 rounded bg-black/5 dark:bg-white/10 animate-pulse mb-2" />
        <div className="h-3.5 w-24 rounded bg-black/5 dark:bg-white/10 animate-pulse mb-6" />
        <div className="flex gap-10 mb-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-4 w-8 rounded bg-black/5 dark:bg-white/10 animate-pulse" />
              <div className="h-3 w-12 rounded bg-black/5 dark:bg-white/10 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 w-full max-w-sm mb-8">
          <div className="flex-1 h-10 rounded-lg bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="flex-1 h-10 rounded-lg bg-black/5 dark:bg-white/10 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-0.5 w-full">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] bg-black/5 dark:bg-white/10 animate-pulse"
            />
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function GuestProfile() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-24 h-24 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.1] flex items-center justify-center mb-6">
          <UserIcon size={40} className="text-black/30 dark:text-white/40" strokeWidth={1.25} />
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight mb-7 text-center">
          Sign in to Crestar
        </h1>
        <a
          href="/account/signin?callbackUrl=/profile"
          className="w-full max-w-[320px] bg-[#D4AF37] text-black py-[15px] rounded-full font-bold text-center text-[16px] active:opacity-90 transition-opacity"
        >
          Sign In
        </a>
        <a
          href="/account/signup?callbackUrl=/profile"
          className="mt-5 text-sm font-medium text-black/45 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70"
        >
          Create account
        </a>
      </div>
      <BottomNav />
    </div>
  );
}

export default function ProfilePage() {
  const { data: user, loading: userLoading, refetch } = useUser();
  const [activeTab, setActiveTab] = useState('posts');
  const [showDrawer, setShowDrawer] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isSeller, setIsSeller] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isDeliverer, setIsDeliverer] = useState(false);

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
          if (data.center?.verification_status === 'approved') {
            const type = data.center.center_type;
            if (type === 'seller' || type === 'foodhub') setIsSeller(true);
            else if (type === 'creator') setIsCreator(true);
            else if (type === 'deliverer') setIsDeliverer(true);
          }
        }
      } catch {}
    })();
  }, [user?.id, fetchPosts]);

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
    label: 'Monetization Center',
    icon: TrendingUp,
    href: '/monetization-center',
  };
  if (isSeller) {
    monetizationItem = { label: 'Seller Center', icon: Store, href: '/seller/dashboard' };
  } else if (isCreator) {
    monetizationItem = { label: 'Creator Program', icon: TrendingUp, href: '/monetization-center' };
  } else if (isDeliverer) {
    monetizationItem = { label: 'Delivery Center', icon: Truck, href: '/monetization-center' };
  }

  const drawerItems = [
    ...(isAdmin ? [{ label: 'Admin', icon: Shield, href: '/admin/dashboard' }] : []),
    { label: 'Inbox', icon: Inbox, href: '/inbox' },
    { label: 'Orders', icon: Package, href: '/orders' },
    { label: 'Wallet', icon: Wallet, href: '/wallet' },
    monetizationItem,
    { label: 'Support', icon: HelpCircle, href: '/support' },
    { label: 'Settings & Privacy', icon: Settings, href: '/settings' },
  ];

  const tabs = [
    { id: 'posts', icon: Grid3X3 },
    ...(isSeller ? [{ id: 'shop', icon: ShoppingBag }] : []),
    { id: 'private', icon: Lock },
    { id: 'likes', icon: Heart },
    { id: 'saved', icon: Bookmark },
  ];

  if (userLoading) return <ProfileSkeleton />;
  if (!user) return <GuestProfile />;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowDrawer(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-black/5 dark:active:bg-white/10"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/15 flex items-center justify-center mb-3">
            {user.profile_image ? (
              <img src={user.profile_image} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold opacity-70">
                {(displayName || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex flex-col items-center mb-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-bold leading-tight">{displayName}</h2>
              {isVerified && <BadgeCheck size={18} className="text-[#D4AF37]" />}
            </div>
            <span className="text-black/50 dark:text-white/55 text-sm mt-1">@{username}</span>
          </div>

          <div className="flex items-center gap-10 mb-4">
            <div className="text-center">
              <p className="font-bold text-lg">{user.following_count ?? 0}</p>
              <p className="text-black/45 dark:text-white/50 text-xs">Following</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{user.followers_count ?? 0}</p>
              <p className="text-black/45 dark:text-white/50 text-xs">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{posts.length}</p>
              <p className="text-black/45 dark:text-white/50 text-xs">Posts</p>
            </div>
          </div>

          {user.bio && user.bio !== '✨ Content Creator' ? (
            <p className="text-sm text-center max-w-sm mb-5 opacity-80">{user.bio}</p>
          ) : (
            <a href="/edit-profile" className="text-black/40 dark:text-white/40 text-sm mb-5">
              + Add bio
            </a>
          )}

          <div className="flex items-center gap-2 w-full max-w-sm mb-6">
            <a
              href="/edit-profile"
              className="flex-1 bg-black/[0.06] dark:bg-white/10 border border-black/[0.06] dark:border-white/15 text-center py-2.5 rounded-lg font-semibold text-sm active:opacity-80"
            >
              Edit profile
            </a>
            <button
              type="button"
              onClick={handleShareProfile}
              className="flex-1 bg-black/[0.06] dark:bg-white/10 border border-black/[0.06] dark:border-white/15 py-2.5 rounded-lg font-semibold text-sm active:opacity-80"
            >
              Share profile
            </button>
            <a
              href="/wallet"
              className="w-11 h-10 bg-black/[0.06] dark:bg-white/10 border border-black/[0.06] dark:border-white/15 rounded-lg flex items-center justify-center active:opacity-80"
            >
              <Wallet size={18} className="text-[#D4AF37]" />
            </a>
          </div>
        </div>

        <div className="flex border-b border-black/10 dark:border-white/10 mb-1">
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
                <TabIcon
                  size={20}
                  className={isActive ? 'opacity-100' : 'opacity-40'}
                />
                {isActive && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-current rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {activeTab === 'posts' && (
          <div className="pt-2">
            {loadingPosts ? (
              <div className="grid grid-cols-3 gap-0.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] bg-black/5 dark:bg-white/10 animate-pulse"
                  />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 text-black/40 dark:text-white/40 text-sm">
                No posts yet
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {posts.map((video) => (
                  <a
                    key={video.id}
                    href={`/video/${video.id}`}
                    className="relative aspect-[3/4] bg-black/5 dark:bg-white/5 overflow-hidden"
                  >
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
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
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab !== 'posts' && (
          <div className="text-center py-16 text-black/40 dark:text-white/40 text-sm">
            Coming soon
          </div>
        )}
      </div>

      {showDrawer && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => setShowDrawer(false)}
            aria-label="Close"
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-background border-l border-black/10 dark:border-white/10 p-4">
            <p className="text-black/40 dark:text-white/40 text-xs uppercase mb-4">Menu</p>
            <div className="space-y-1">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg active:bg-black/5 dark:active:bg-white/5"
                  >
                    <Icon size={18} className="opacity-70" />
                    <span className="text-sm font-medium">{item.label}</span>
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
