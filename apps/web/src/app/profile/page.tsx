// @ts-nocheck
'use client';
import { useState, useEffect, useCallback } from 'react';
import useUser from '@/utils/useUser';
import CurrencyPrice from '@/components/CurrencyPrice';
import BottomNav from '@/components/BottomNav';
import {
  Menu,
  X,
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
  Play,
  BadgeCheck,
  Store,
  TrendingUp,
  Truck,
  Trash2,
  RotateCcw,
  Clock,
} from 'lucide-react';

export default function ProfilePage() {
  const { data: user, loading: userLoading } = useUser();

  const [activeTab, setActiveTab] = useState('posts');
  const [showDrawer, setShowDrawer] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isDeliverer, setIsDeliverer] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trashedVideos, setTrashedVideos] = useState([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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

  const fetchSellerProducts = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingProducts(true);
      const res = await fetch(`/api/listings/products?sellerId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setSellerProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, [user?.id]);

  const fetchMonetizationStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/business-centers');
      if (res.ok) {
        const data = await res.json();
        if (data.center && data.center.verification_status === 'approved') {
          const type = data.center.center_type;
          if (type === 'seller' || type === 'foodhub') {
            setIsSeller(true);
            fetchSellerProducts();
          } else if (type === 'creator') {
            setIsCreator(true);
          } else if (type === 'deliverer') {
            setIsDeliverer(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch monetization status:', err);
    }
  }, [user?.id, fetchSellerProducts]);

  useEffect(() => {
    if (user?.id) {
      fetchPosts();
      fetchMonetizationStatus();
    }
  }, [user?.id, fetchPosts, fetchMonetizationStatus]);

  const fetchTrash = useCallback(async () => {
    try {
      setLoadingTrash(true);
      const res = await fetch('/api/videos/trash');
      if (res.ok) {
        const data = await res.json();
        setTrashedVideos(data.videos || []);
      }
    } catch (err) {
      console.error('Failed to fetch trash:', err);
    } finally {
      setLoadingTrash(false);
    }
  }, []);

  useEffect(() => {
    if (showTrash) fetchTrash();
  }, [showTrash, fetchTrash]);

  const handleDeleteVideo = async (videoId) => {
    if (!confirm('Move this video to Recently deleted? You can restore it within 30 days.')) return;
    try {
      setDeletingId(videoId);
      const res = await fetch(`/api/videos/delete?videoId=${videoId}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== videoId));
      } else {
        alert('Could not delete video. Please try again.');
      }
    } catch (err) {
      console.error('Delete video error:', err);
      alert('Could not delete video.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestoreVideo = async (videoId) => {
    try {
      setDeletingId(videoId);
      const res = await fetch('/api/videos/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });
      if (res.ok) {
        setTrashedVideos((prev) => prev.filter((v) => v.id !== videoId));
        fetchPosts();
      } else {
        alert('Could not restore video. Please try again.');
      }
    } catch (err) {
      console.error('Restore error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePermanentDelete = async (videoId) => {
    if (!confirm('Permanently delete this video? This cannot be undone.')) return;
    try {
      setDeletingId(videoId);
      const res = await fetch(`/api/videos/trash?videoId=${videoId}`, { method: 'DELETE' });
      if (res.ok) {
        setTrashedVideos((prev) => prev.filter((v) => v.id !== videoId));
      } else {
        alert('Could not permanently delete video.');
      }
    } catch (err) {
      console.error('Permanent delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const username = user?.username || (user?.email ? user.email.split('@')[0] : 'user');
  const displayName = user?.display_name || user?.name || username;
  const isVerified = !!user?.is_verified;
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/@${username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${username} on Crestar`, url });
      } catch (e) {}
    } else {
      await navigator.clipboard.writeText(url);
      alert('Profile link copied!');
    }
  };

  // Monetization drawer entry mirrors the mobile app
  let monetizationItem = {
    label: 'Monetization Center',
    icon: TrendingUp,
    href: '/monetization-center',
  };
  if (isSeller) {
    monetizationItem = {
      label: 'Seller Center',
      icon: Store,
      href: '/seller/dashboard',
    };
  } else if (isCreator) {
    monetizationItem = {
      label: 'Creator Program',
      icon: TrendingUp,
      href: '/monetization-center',
    };
  } else if (isDeliverer) {
    monetizationItem = {
      label: 'Delivery Center',
      icon: Truck,
      href: '/monetization-center',
    };
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

  // ── Loading state ──
  if (userLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full"
          style={{ animation: 'profile-spin 1s linear infinite' }}
        />
        <style jsx global>{`
          @keyframes profile-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // ── Guest view (signed out) — mirrors the mobile GuestView ──
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

          <div className="w-full max-w-xs space-y-3 mb-10 text-left">
            {[
              'Create and manage your shop',
              'Upload videos and grow your audience',
              'Track earnings and payouts',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                <span className="text-white/70 text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="w-full max-w-xs space-y-3">
            <a
              href="/account/signin?callbackUrl=/profile"
              className="block w-full bg-[#D4AF37] text-black py-3.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Sign In
            </a>
            <a
              href="/account/signup?callbackUrl=/profile"
              className="block w-full bg-white/10 border border-white/20 text-white py-3.5 rounded-xl font-semibold hover:bg-white/20 transition-colors"
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
      {/* ── Header: menu only, right aligned (like mobile) ── */}
      <div className="max-w-2xl mx-auto px-4 pt-4 flex items-center justify-end">
        <button
          onClick={() => setShowDrawer(true)}
          className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
        >
          <Menu size={24} className="text-white" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* ── Profile Info (mobile layout) ── */}
        <div className="flex flex-col items-center">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border border-white/15 flex items-center justify-center mb-3">
            {user.profile_image ? (
              <img
                src={user.profile_image}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-white/70">
                {(displayName || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Username + verified */}
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-white/70 text-sm">@{username}</span>
            {isVerified && <BadgeCheck size={16} className="text-[#D4AF37]" />}
          </div>

          {/* Stats row */}
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

          {/* Bio */}
          {user.bio && user.bio !== '✨ Content Creator' ? (
            <p className="text-white/80 text-sm text-center max-w-sm mb-5">{user.bio}</p>
          ) : (
            <a href="/edit-profile" className="text-white/40 text-sm mb-5 hover:text-white/60">
              + Add bio
            </a>
          )}

          {/* Action buttons: Edit / Share / Wallet (like mobile) */}
          <div className="flex items-center gap-2 w-full max-w-sm mb-6">
            <a
              href="/edit-profile"
              className="flex-1 bg-white/10 border border-white/15 text-center py-2.5 rounded-lg font-semibold text-sm hover:bg-white/20 transition-colors"
            >
              Edit profile
            </a>
            <button
              onClick={handleShareProfile}
              className="flex-1 bg-white/10 border border-white/15 py-2.5 rounded-lg font-semibold text-sm hover:bg-white/20 transition-colors"
            >
              Share profile
            </button>
            <a
              href="/wallet"
              className="w-11 h-10 bg-white/10 border border-white/15 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <Wallet size={18} className="text-[#D4AF37]" />
            </a>
          </div>
        </div>

        {/* ── Tabs (icon-only with underline, like mobile) ── */}
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

        {/* ── Tab content ── */}
        {activeTab === 'posts' && (
          <div>
            {/* Trash toggle */}
            <div className="flex items-center justify-end py-2">
              <button
                onClick={() => setShowTrash((s) => !s)}
                className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-semibold transition-colors"
              >
                {showTrash ? (
                  <>
                    <Grid3X3 size={14} />
                    Back to posts
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Recently deleted
                  </>
                )}
              </button>
            </div>

            {showTrash ? (
              <div>
                {loadingTrash ? (
                  <div className="flex justify-center py-16">
                    <div
                      className="w-8 h-8 border-3 border-white/20 border-t-[#D4AF37] rounded-full"
                      style={{ animation: 'profile-spin 1s linear infinite' }}
                    />
                  </div>
                ) : trashedVideos.length === 0 ? (
                  <div className="text-center py-16">
                    <Trash2 size={48} className="text-white/20 mx-auto mb-4" />
                    <p className="text-white/50">Nothing in the trash</p>
                    <p className="text-white/30 text-sm mt-1">
                      Deleted videos stay here for 30 days before being permanently removed
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-0.5">
                    {trashedVideos.map((video) => (
                      <div
                        key={video.id}
                        className="relative aspect-[3/4] bg-white/5 overflow-hidden group"
                      >
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt=""
                            className="w-full h-full object-cover opacity-60"
                          />
                        ) : (
                          <video
                            src={video.video_url}
                            className="w-full h-full object-cover opacity-60"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        )}
                        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/70 rounded px-1.5 py-0.5">
                          <Clock size={10} className="text-[#FF9F0A]" />
                          <span className="text-white text-[10px] font-semibold">
                            {video.daysRemaining}d left
                          </span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-black/40">
                          <button
                            onClick={() => handleRestoreVideo(video.id)}
                            disabled={deletingId === video.id}
                            className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
                            title="Restore"
                          >
                            <RotateCcw size={16} className="text-white" />
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(video.id)}
                            disabled={deletingId === video.id}
                            className="w-9 h-9 bg-red-500/70 hover:bg-red-500 rounded-full flex items-center justify-center"
                            title="Delete forever"
                          >
                            <Trash2 size={16} className="text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : loadingPosts ? (
              <div className="flex justify-center py-16">
                <div
                  className="w-8 h-8 border-3 border-white/20 border-t-[#D4AF37] rounded-full"
                  style={{ animation: 'profile-spin 1s linear infinite' }}
                />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16">
                <Play size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/50 mb-4">No posts yet</p>
                <a
                  href="/create"
                  className="inline-block bg-[#D4AF37] text-black px-6 py-2.5 rounded-lg font-semibold hover:opacity-90"
                >
                  Create your first video
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="relative aspect-[3/4] bg-white/5 overflow-hidden group"
                  >
                    <a href={`/video/${post.id}`} className="block w-full h-full">
                      {post.thumbnail_url ? (
                        <img
                          src={post.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <video
                          src={post.video_url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      )}
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                        <Play size={12} className="text-white" fill="white" />
                        <span className="text-white text-xs font-semibold">
                          {post.views_count ?? 0}
                        </span>
                      </div>
                      {post.tagged_items?.length > 0 && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#D4AF37] rounded-full flex items-center justify-center">
                          <ShoppingBag size={11} className="text-black" />
                        </div>
                      )}
                    </a>
                    {/* Delete (hover, own profile) */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteVideo(post.id);
                      }}
                      disabled={deletingId === post.id}
                      className="absolute top-1.5 left-1.5 w-6 h-6 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      title="Delete video"
                    >
                      <Trash2 size={12} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'shop' && isSeller && (
          <div>
            {loadingProducts ? (
              <div className="flex justify-center py-16">
                <div
                  className="w-8 h-8 border-3 border-white/20 border-t-[#D4AF37] rounded-full"
                  style={{ animation: 'profile-spin 1s linear infinite' }}
                />
              </div>
            ) : sellerProducts.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/50 mb-4">No products yet</p>
                <a
                  href="/create-listing"
                  className="inline-block bg-[#D4AF37] text-black px-6 py-2.5 rounded-lg font-semibold hover:opacity-90"
                >
                  Add product
                </a>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between py-3">
                  <p className="text-white/60 text-sm">
                    {sellerProducts.length} product
                    {sellerProducts.length !== 1 ? 's' : ''}
                  </p>
                  <a
                    href="/create-listing"
                    className="text-[#D4AF37] text-sm font-semibold hover:opacity-80"
                  >
                    + Add product
                  </a>
                </div>
                <div className="grid grid-cols-3 gap-0.5">
                  {sellerProducts.map((product) => {
                    let media = product.media;
                    if (typeof media === 'string') {
                      try {
                        media = JSON.parse(media);
                      } catch (e) {
                        media = [];
                      }
                    }
                    const image = Array.isArray(media) ? media[0] : null;
                    return (
                      <a
                        key={product.id}
                        href={`/product/${product.id}`}
                        className="relative aspect-[3/4] bg-white/5 overflow-hidden group"
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag size={24} className="text-white/20" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-1">
                          <CurrencyPrice
                            price={parseFloat(product.price)}
                            originalCurrency={product.seller_currency || 'GHS'}
                            showOriginal={false}
                            size="small"
                            textStyle={{
                              color: '#D4AF37',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                            }}
                          />
                          <p className="text-white text-xs truncate">{product.title}</p>
                        </div>
                        {product.is_todays_special && (
                          <div className="absolute top-1.5 left-1.5 bg-[#D4AF37] text-black text-[10px] font-bold px-1.5 py-0.5 rounded">
                            ⭐ SPECIAL
                          </div>
                        )}
                      </a>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'private' && (
          <div className="text-center py-16">
            <Lock size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/50">No private videos</p>
            <p className="text-white/30 text-sm mt-1">
              Drafts you save stay on the device where you created them
            </p>
          </div>
        )}

        {activeTab === 'likes' && (
          <div className="text-center py-16">
            <Heart size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/50">No liked posts yet</p>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="text-center py-16">
            <Bookmark size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/50">No saved videos yet</p>
          </div>
        )}
      </div>

      {/* ── Drawer (right slide-in, like mobile) ── */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <button
            className="flex-1 bg-black/60"
            onClick={() => setShowDrawer(false)}
            aria-label="Close menu"
          />
          <div className="w-80 max-w-[85vw] bg-[#0D0D0D] border-l border-white/10 h-full flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-bold">Profile</h2>
              <button
                onClick={() => setShowDrawer(false)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {drawerItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors"
                  >
                    <ItemIcon size={20} className="text-white/70" />
                    <span className="text-white text-[15px]">{item.label}</span>
                  </a>
                );
              })}
            </div>

            <div className="p-5 border-t border-white/10">
              <a
                href="/account/logout"
                className="block w-full text-center bg-white/10 border border-white/15 py-3 rounded-xl font-semibold text-sm hover:bg-white/20 transition-colors"
              >
                Log out
              </a>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
