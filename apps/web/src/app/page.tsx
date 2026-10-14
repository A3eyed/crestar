// @ts-nocheck
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Heart,
  MessageCircle,
  Share2,
  ShoppingBag,
  Search,
  Volume2,
  VolumeX,
  RefreshCw,
} from 'lucide-react';
import useUser from '@/utils/useUser';
import useLocalization from '@/utils/useLocalization';
import BottomNav from '@/components/BottomNav';

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
    id,
    isProduct: !!productId,
    name: tag.productTitle || tag.product_title || tag.serviceTitle || tag.service_title || 'Product',
    price: parseFloat(tag.productPrice ?? tag.product_price ?? tag.servicePrice ?? tag.service_price ?? 0),
    currency: tag.seller_currency || tag.currency || 'GHS',
    image: mediaArr[0] || item.thumbnail || null,
    stock,
    soldOut: stock != null && stock <= 0,
  };
}

export default function FeedPage() {
  const { data: user } = useUser();
  const { t } = useLocalization();
  const [muted, setMuted] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const res = await fetch('/api/feed');
      if (!res.ok) throw new Error('Failed to load feed');
      return res.json();
    },
    staleTime: 30_000,
    retry: 1,
  });

  const feedItems = (data?.feedItems || []).filter((item) => item.videoUrl || item.video_url);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  return (
    <div className="bg-black min-h-[100dvh]">
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-center relative h-14 px-4">
          <div className="flex items-center gap-5">
            <a href="/live/watch" className="text-white/60 text-[15px] font-semibold hover:text-white transition-colors">
              {t('live')}
            </a>
            <span className="text-white text-[16px] font-bold border-b-2 border-white pb-0.5">
              {t('forYou')}
            </span>
            <a href="/shop" className="text-white/60 text-[15px] font-semibold hover:text-white transition-colors">
              {t('shop')}
            </a>
          </div>
          <a
            href="/search"
            className="absolute right-4 text-white hover:opacity-70 transition-opacity"
            aria-label={t('search')}
          >
            <Search size={22} />
          </a>
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
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white"
            style={{ backgroundColor: BRAND }}
          >
            <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
            {t('retry')}
          </button>
        </div>
      ) : feedItems.length === 0 ? (
        <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-white/70 text-center">{t('noVideos')}</p>
          <a href="/search" className="px-6 py-3 rounded-full font-bold text-black" style={{ backgroundColor: BRAND }}>
            {t('findPeople')}
          </a>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {feedItems.map((item, index) => {
            const videoUrl = item.videoUrl || item.video_url;
            const caption = item.caption || '';
            const username = item.username || item.creator_username || 'creator';
            const likes = item.likesCount ?? item.likes_count ?? 0;
            const comments = item.commentsCount ?? item.comments_count ?? 0;
            const tagged = resolveTaggedProduct(item);
            return (
              <div
                key={item.id || index}
                className="relative h-[100dvh] w-full snap-start snap-always bg-black"
              >
                <video
                  src={videoUrl}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  loop
                  muted={muted}
                  autoPlay={index === activeIndex}
                  onClick={toggleMute}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />
                <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
                  <button type="button" className="flex flex-col items-center gap-1 text-white">
                    <Heart size={28} />
                    <span className="text-xs">{formatCount(likes)}</span>
                  </button>
                  <button type="button" className="flex flex-col items-center gap-1 text-white">
                    <MessageCircle size={28} />
                    <span className="text-xs">{formatCount(comments)}</span>
                  </button>
                  <button type="button" className="flex flex-col items-center gap-1 text-white">
                    <Share2 size={28} />
                    <span className="text-xs">{t('share')}</span>
                  </button>
                  {tagged && (
                    <a
                      href={'/product/' + tagged.id}
                      className="flex flex-col items-center gap-1 text-white"
                    >
                      <ShoppingBag size={28} color={BRAND} />
                      <span className="text-xs">{t('shop')}</span>
                    </a>
                  )}
                </div>
                <div className="absolute left-3 right-16 bottom-24 z-10">
                  <a href={'/@' + username} className="font-bold text-white text-[15px]">
                    @{username}
                  </a>
                  {caption ? <p className="text-white/90 text-sm mt-1 line-clamp-3">{caption}</p> : null}
                  {tagged && (
                    <a
                      href={'/product/' + tagged.id}
                      className="mt-3 flex items-center gap-2 bg-black/50 border border-white/20 rounded-xl p-2 max-w-xs"
                    >
                      {tagged.image ? (
                        <img src={tagged.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/10" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">{tagged.name}</p>
                        <p className="text-sm font-bold" style={{ color: BRAND }}>
                          {tagged.soldOut ? t('soldOut') : 'GHS ' + tagged.price.toFixed(2)}
                        </p>
                      </div>
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="absolute top-16 right-4 z-10 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
