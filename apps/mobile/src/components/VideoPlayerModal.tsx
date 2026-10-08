// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Modal, FlatList } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { X, Heart, MessageCircle, Share2, Plus, Check } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import useAuth from '@/utils/auth/useAuth';
import FeedProductSheet from '@/components/FeedProductSheet';
import TaggedProductAnchor from '@/components/TaggedProductAnchor';
import SafeBoundary from '@/components/SafeBoundary';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function VideoPlayer({ video, isActive, onProductPress, onUserPress }) {
  const { isAuthenticated, signIn } = useAuth();
  const [liked, setLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const firstTaggedProduct = video.taggedItems?.[0] || video.tagged_items?.[0] || null;
  const hasProduct = firstTaggedProduct !== null;

  // Stable setup callback — prevents infinite loop if useVideoPlayer tracks it
  const setupPlayer = useCallback((p) => {
    p.loop = true;
    p.muted = false;
  }, []);

  const player = useVideoPlayer(video.videoUrl || video.video_url, setupPlayer);

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  const handleInteraction = () => {
    if (!isAuthenticated) {
      signIn();
    } else {
      setLiked(!liked);
    }
  };

  const handleFollowPress = () => {
    if (!isAuthenticated) {
      signIn();
    } else {
      setIsFollowing(!isFollowing);
    }
  };

  return (
    <View
      style={{
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: '#000000',
      }}
    >
      <VideoView
        player={player}
        style={{
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          position: 'absolute',
        }}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Right Action Bar */}
      <View
        style={{
          position: 'absolute',
          right: 12,
          bottom: 120,
          gap: 24,
        }}
      >
        {/* Avatar with Follow Button */}
        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity onPress={onUserPress} style={{ position: 'relative', marginBottom: 8 }}>
            <Image
              source={{ uri: video.avatar || video.profile_image }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                borderWidth: 2,
                borderColor: '#FFFFFF',
              }}
              contentFit="cover"
            />
            <TouchableOpacity
              onPress={handleFollowPress}
              style={{
                position: 'absolute',
                bottom: -6,
                left: '50%',
                transform: [{ translateX: -12 }],
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: isFollowing ? '#FFFFFF' : '#D4AF37',
                borderWidth: 2,
                borderColor: '#000000',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isFollowing ? (
                <Check size={12} color="#D4AF37" strokeWidth={3} />
              ) : (
                <Plus size={14} color="#FFFFFF" strokeWidth={3} />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleInteraction} style={{ alignItems: 'center', gap: 4 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heart
              size={24}
              color={liked ? '#D4AF37' : '#FFFFFF'}
              fill={liked ? '#D4AF37' : 'transparent'}
            />
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
            {video.likes_count || video.likesCount || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', gap: 4 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageCircle size={24} color="#FFFFFF" />
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
            {video.comments_count || video.commentsCount || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', gap: 4 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Share2 size={24} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Info */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 80,
          padding: 16,
          paddingBottom: 120,
        }}
      >
        <TouchableOpacity
          onPress={onUserPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '700',
            }}
          >
            {video.businessName ||
              video.business_name ||
              video.displayName ||
              video.display_name ||
              `@${video.username}`}
          </Text>
          {video.is_verified && (
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#D4AF37',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>✓</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={{ color: '#FFFFFF', fontSize: 14, marginBottom: 16 }}>
          {video.caption || video.description || ''}
        </Text>

        {/* ── TikTok-style shopping anchor, last child under the caption ── */}
        {hasProduct && (
          <TaggedProductAnchor
            video={video}
            isActive={isActive}
            onProductPress={onProductPress}
            style={{ marginTop: 10 }}
          />
        )}
      </View>
    </View>
  );
}

export default function VideoPlayerModal({
  visible,
  videos = [],
  initialIndex = 0,
  onClose,
  onProductPress,
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Product sheet shown OVER the video (TikTok style) — rendered inside
  // this Modal because anything outside it is hidden behind the fullscreen modal
  const [sheetProduct, setSheetProduct] = useState(null);
  const productSheetRef = useRef(null);

  const handleInternalProductPress = (product) => {
    setSheetProduct(product);
    setTimeout(() => productSheetRef.current?.snapToIndex(0), 60);
  };

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // FIX: Wrap in useRef to create stable reference
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  // FIX: Wrap in useRef to create stable reference
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleUserPress = () => {
    const video = videos[currentIndex];
    const userId = video?.creatorUserId || video?.creator_user_id;
    if (userId) {
      onClose();
      router.push(`/seller/${userId}`);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {/* A react-native <Modal> is a SEPARATE native root view, so the
          GestureHandlerRootView in _layout.tsx does not reach inside it.
          Without this wrapper the product bottom sheet below cannot mount /
          receive gestures on a real device (it still worked on web because
          the modal is just a div in the same tree). */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
        <StatusBar style="light" />

        {/* Close Button */}
        <TouchableOpacity
          onPress={onClose}
          style={{
            position: 'absolute',
            top: insets.top + 16,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Video List — now passes the INTERNAL product press handler */}
        {videos.length > 0 && (
          <FlatList
            data={videos}
            renderItem={({ item, index }) => (
              <VideoPlayer
                video={item}
                isActive={index === currentIndex && !sheetProduct}
                onProductPress={handleInternalProductPress}
                onUserPress={handleUserPress}
              />
            )}
            keyExtractor={(item) => item.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={SCREEN_HEIGHT}
            snapToAlignment="start"
            decelerationRate="fast"
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(data, index) => ({
              length: SCREEN_HEIGHT,
              offset: SCREEN_HEIGHT * index,
              index,
            })}
            initialScrollIndex={initialIndex}
          />
        )}

        {/* Product sheet INSIDE the modal so it appears over the video */}
        <SafeBoundary name="VideoPlayerModal:FeedProductSheet">
          <FeedProductSheet
            ref={productSheetRef}
            product={sheetProduct}
            onClose={() => setSheetProduct(null)}
          />
        </SafeBoundary>
      </GestureHandlerRootView>
    </Modal>
  );
}
