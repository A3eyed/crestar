// @ts-nocheck
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Image } from 'expo-image';
import { Play, ShoppingBag, MoreVertical, FileEdit } from 'lucide-react-native';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import { useRouter, useFocusEffect } from 'expo-router';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import FeedProductSheet from '@/components/FeedProductSheet';
import SafeBoundary from '@/components/SafeBoundary';
import { getDraftCount } from '@/utils/draftsStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = (SCREEN_WIDTH - 3) / 3; // 3 tight columns like TikTok

export function PostsTab({ colors, userId, isOwnProfile }) {
  const router = useRouter();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const productSheetRef = useRef(null);
  const [draftCount, setDraftCount] = useState(0);

  const fetchUserVideos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`/api/videos/user/${userId || 'me'}`);
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('PostsTab fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserVideos();
  }, [fetchUserVideos]);

  useFocusEffect(
    useCallback(() => {
      fetchUserVideos();
      if (isOwnProfile) {
        getDraftCount()
          .then(setDraftCount)
          .catch(() => {});
      }
    }, [fetchUserVideos, isOwnProfile])
  );

  const handleVideoPress = (video, index) => {
    setSelectedVideoIndex(index);
    setShowVideoPlayer(true);
  };

  const handleProductPress = (product) => {
    setSelectedProduct(product);
    productSheetRef.current?.snapToIndex(0);
  };

  const handleDeleteVideo = async (videoId) => {
    Alert.alert(
      'Delete video',
      'This video will be moved to Recently deleted. You can restore it within 30 days from your profile menu.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(videoId);
              const response = await authenticatedFetch(`/api/videos/delete?videoId=${videoId}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                setVideos((prev) => prev.filter((v) => v.id !== videoId));
              } else {
                Alert.alert('Error', 'Could not delete video. Please try again.');
              }
            } catch (err) {
              console.error('Delete video error:', err);
              Alert.alert('Error', 'Could not delete video.');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const handleVideoOptions = (video) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Delete video'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleDeleteVideo(video.id);
        }
      );
    } else {
      handleDeleteVideo(video.id);
    }
  };

  // Drafts tile shown first on own profile (TikTok behavior)
  const showDraftsTile = isOwnProfile && draftCount > 0;

  if (loading) {
    return (
      <View style={{ paddingTop: 80, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (videos.length === 0 && !showDraftsTile) {
    return (
      <View style={{ paddingTop: 80, alignItems: 'center', paddingHorizontal: 32 }}>
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 14,
            textAlign: 'center',
          }}
        >
          No videos yet
        </Text>
      </View>
    );
  }

  // Prepend a synthetic drafts item to the grid data
  const gridData = showDraftsTile ? [{ id: '__drafts__', isDraftsTile: true }, ...videos] : videos;

  return (
    <>
      <FlatList
        data={gridData}
        numColumns={3}
        contentContainerStyle={{ paddingBottom: 100 }}
        columnWrapperStyle={{ gap: 1.5 }}
        ItemSeparatorComponent={() => <View style={{ height: 1.5 }} />}
        renderItem={({ item, index }) => {
          // ── Drafts tile (first item, own profile only) ──
          if (item.isDraftsTile) {
            return (
              <TouchableOpacity
                onPress={() => router.push('/drafts')}
                activeOpacity={0.85}
                style={{
                  width: ITEM_WIDTH,
                  height: ITEM_WIDTH * 1.6,
                  backgroundColor: '#1A1A1A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileEdit size={26} color="rgba(255,255,255,0.7)" />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: '600',
                    marginTop: 8,
                  }}
                >
                  Drafts
                </Text>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {draftCount} video{draftCount === 1 ? '' : 's'}
                </Text>
              </TouchableOpacity>
            );
          }

          const videoIndex = showDraftsTile ? index - 1 : index;

          return (
            <TouchableOpacity
              onPress={() => handleVideoPress(item, videoIndex)}
              activeOpacity={0.85}
              style={{
                width: ITEM_WIDTH,
                height: ITEM_WIDTH * 1.6,
                position: 'relative',
                backgroundColor: '#1A1A1A',
              }}
            >
              {item.thumbnail_url || item.thumbnailUrl || item.thumbnail || null ? (
                <Image
                  source={{ uri: item.thumbnail_url || item.thumbnailUrl || item.thumbnail }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                // Fallback when no thumbnail (recently uploaded, still processing)
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#111',
                  }}
                >
                  <Play size={24} color="rgba(255,255,255,0.3)" fill="rgba(255,255,255,0.3)" />
                </View>
              )}

              {/* Shoppable indicator */}
              {(item.taggedItems?.length > 0 ||
                item.tagged_items?.length > 0 ||
                (item.product_tags && item.product_tags.length > 0)) && (
                <View
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: 'rgba(212,175,55,0.9)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShoppingBag size={12} color="#FFFFFF" />
                </View>
              )}

              {/* Play count bottom left */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Play size={11} color="#FFFFFF" fill="#FFFFFF" />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: '600',
                    textShadowColor: 'rgba(0,0,0,0.9)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  }}
                >
                  {(item.views_count || item.viewsCount || 0) >= 1000
                    ? `${((item.views_count || item.viewsCount || 0) / 1000).toFixed(1)}K`
                    : item.views_count || item.viewsCount || 0}
                </Text>
              </View>

              {/* 3-dot options (only on own profile) */}
              {isOwnProfile && (
                <TouchableOpacity
                  onPress={() => handleVideoOptions(item)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {deleting === item.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MoreVertical size={14} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item.id}
      />

      <VideoPlayerModal
        visible={showVideoPlayer}
        videos={videos}
        initialIndex={selectedVideoIndex}
        onClose={() => setShowVideoPlayer(false)}
        onProductPress={handleProductPress}
      />

      <SafeBoundary name="ProfilePostsTab:FeedProductSheet">
        <FeedProductSheet
          ref={productSheetRef}
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      </SafeBoundary>
    </>
  );
}
