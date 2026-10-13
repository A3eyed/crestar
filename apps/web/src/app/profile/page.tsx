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
    // Force profile reload after edit (?updated=)
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
      await navigator.clipboard.writeText(url);
      alert('Profile link copied!');
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

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-24 h-24 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mb-6">
            <UserIcon size={40} className="text-white/50" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Crestar</h1>
          <p className="text-white/60 mb-8 max-w-sm">
            Sign in to create videos, sell products, and track your earnings
          </p>
          <div className="w-full max-w-xs space-y-3">
            <a
              href="/account/signin?callbackUrl=/profile"
              className="block w-full bg-[#D4AF37] text-black py-3.5 rounded-xl font-bold"
            >
              Sign In
            </a>
            <a
              href="/account/signup?callbackUrl=/profile"
              className="block w-full bg-white/10 border border-white/20 text-white py-3.5 rounded-xl font-semibold"
            >
              Create Account
            </a>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-4 flex items-center justify-end">
        <button
          onClick={() => setShowDrawer(true)}
          className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full"
        >
          <Menu size={24} className="text-white" />
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

          {/* TikTok-style: display name, then @username */}
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
              <p className="text-white/50 text-xs">Following</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">{user.followers_count ?? 0}</p>
              <p className="text-white/50 text-xs">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">{posts.length}</p>
              <p className="text-white/50 text-xs">Posts</p>
            </div>
          </div>

          {user.bio && user.bio !== '✨ Content Creator' ? (
            <p className="text-white/80 text-sm text-center max-w-sm mb-5">{user.bio}</p>
          ) : (
            <a href="/edit-profile" className="text-white/40 text-sm mb-5 hover:text-white/60">
              + Add bio
            </a>
          )}

          <div className="flex items-center gap-2 w-full max-w-sm mb-6">
            <a
              href="/edit-profile"
              className="flex-1 bg-white/10 border border-white/15 text-center py-2.5 rounded-lg font-semibold text-sm"
            >
              Edit profile
            </a>
            <button
              onClick={handleShareProfile}
              className="flex-1 bg-white/10 border border-white/15 py-2.5 rounded-lg font-semibold text-sm"
            >
              Share profile
            </button>
            <a
              href="/wallet"
              className="w-11 h-10 bg-white/10 border border-white/15 rounded-lg flex items-center justify-center"
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
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-white/20 border-t-[#D4AF37] rounded-full animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 text-white/40 text-sm">No posts yet</div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {posts.map((video) => (
                  <a
                    key={video.id}
                    href={`/video/${video.id}`}
                    className="relative aspect-[3/4] bg-white/5 overflow-hidden"
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
          <div className="text-center py-16 text-white/40 text-sm">Coming soon</div>
        )}
      </div>

      {showDrawer && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowDrawer(false)}
            aria-label="Close"
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-black border-l border-white/10 p-4">
            <p className="text-white/40 text-xs uppercase mb-4">Menu</p>
            <div className="space-y-1">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 text-white"
                  >
                    <Icon size={18} className="text-white/70" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </a>
                );
              })}
            </div>
            <a
              href="/account/verify-email?optional=1&callbackUrl=/profile"
              className="mt-6 block text-center text-xs text-white/40 hover:text-white/70"
            >
              Verify email
            </a>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
