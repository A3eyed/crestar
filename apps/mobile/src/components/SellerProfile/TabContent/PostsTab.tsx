// @ts-nocheck
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import { useRouter } from 'expo-router';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import FeedProductSheet from '@/components/FeedProductSheet';
import SafeBoundary from '@/components/SafeBoundary';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = (SCREEN_WIDTH - 48) / 3; // 3 columns with 16px padding and 8px gaps

export function PostsTab({ userType, sellerId }) {
  const router = useRouter();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const productSheetRef = useRef(null);

  const fetchUserVideos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`/api/videos/user/${sellerId}`);
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Fetch user videos error:', error);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    if (sellerId) {
      fetchUserVideos();
    }
  }, [sellerId, fetchUserVideos]);

  const handleVideoPress = (video, index) => {
    // Open video player modal at this video (TikTok style)
    setSelectedVideoIndex(index);
    setShowVideoPlayer(true);
  };

  const handleProductPress = (product) => {
    setSelectedProduct(product);
    productSheetRef.current?.snapToIndex(0);
  };

  if (loading) {
    return (
      <View style={{ paddingTop: 80, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  if (videos.length === 0) {
    const { isMonetized } = userType || {};
    return (
      <View style={{ paddingTop: 60, alignItems: 'center' }}>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 15,
            marginBottom: 8,
          }}
        >
          No videos yet
        </Text>
        {!isMonetized && (
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 13,
              marginTop: 4,
              textAlign: 'center',
              paddingHorizontal: 40,
            }}
          >
            This is a regular user account. Videos will appear here when they start posting.
          </Text>
        )}
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={videos}
        numColumns={3}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 100,
        }}
        columnWrapperStyle={{ gap: 4 }}
        renderItem={({ item, index }) => {
          return (
            <TouchableOpacity
              onPress={() => handleVideoPress(item, index)}
              style={{
                width: ITEM_WIDTH,
                height: ITEM_WIDTH * 1.5,
                marginBottom: 4,
                position: 'relative',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <Image
                source={{
                  uri: item.thumbnail_url || item.thumbnailUrl || item.video_url || item.videoUrl,
                }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />

              {/* Play Icon + View Count - TikTok style */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: '600',
                    textShadowColor: 'rgba(0, 0, 0, 0.8)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                >
                  {item.views_count || item.viewsCount || 0}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item.id}
      />

      {/* TikTok-style Video Player Modal */}
      <VideoPlayerModal
        visible={showVideoPlayer}
        videos={videos}
        initialIndex={selectedVideoIndex}
        onClose={() => setShowVideoPlayer(false)}
        onProductPress={handleProductPress}
      />

      {/* Product Detail Sheet */}
      <SafeBoundary name="SellerPostsTab:FeedProductSheet">
        <FeedProductSheet
          ref={productSheetRef}
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      </SafeBoundary>
    </>
  );
}
