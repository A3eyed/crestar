// @ts-nocheck
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { X, Tag } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { ProductTagModal } from './ProductTagModal';
import { TaggedProductsList } from './TaggedProductsList';
import useUpload from '@/utils/useUpload';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import { processVideoForUpload, formatFileSize } from '@/utils/videoProcessing';
import { saveDraft, deleteDraft } from '@/utils/draftsStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function VideoPreviewScreen({ videoUri, onDiscard, onPost, draft }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [caption, setCaption] = useState(draft?.caption || '');
  const [taggedProducts, setTaggedProducts] = useState(draft?.taggedProducts || []);
  const [showProductModal, setShowProductModal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(''); // "Uploading video...", "Creating post...", etc.
  const [upload, { loading: uploading }] = useUpload();

  // Stable setup callback — prevents infinite loop inside useVideoPlayer
  const setupPlayer = useCallback((p) => {
    p.loop = true;
    p.play();
  }, []);

  const player = useVideoPlayer(videoUri, setupPlayer);

  const handleRemoveProduct = (productId) => {
    setTaggedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // TikTok-style exit: offer to save as draft instead of losing the video
  const handleExit = () => {
    if (posting) return;
    Alert.alert('Save video?', 'You can save this video as a draft and post it later.', [
      {
        text: 'Save as draft',
        onPress: async () => {
          try {
            await saveDraft({ videoUri, caption, taggedProducts });
            // If this was already a draft, remove the old copy
            if (draft?.id) await deleteDraft(draft.id);
            onDiscard();
          } catch (e) {
            Alert.alert('Error', 'Could not save draft. Please try again.');
          }
        },
      },
      { text: 'Discard', style: 'destructive', onPress: onDiscard },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePost = async () => {
    // ── REQUIRED: at least one product must be tagged before posting ──
    if (!taggedProducts || taggedProducts.length === 0) {
      Alert.alert(
        'Tag a product to post',
        'Every video must showcase at least one product or service. Tap "Tag Product" to link one before posting.'
      );
      return;
    }

    try {
      setPosting(true);
      setUploadProgress(0);

      // 0. Process video silently (compression, size optimization)
      setUploadStatus('Getting video ready...');
      setUploadProgress(5);
      console.log('🎬 Processing video for upload...');

      const processedVideo = await processVideoForUpload(videoUri);

      if (processedVideo.compressed) {
        console.log(
          `📦 Video compressed: ${formatFileSize(processedVideo.originalSize)} → ${formatFileSize(processedVideo.size)}`
        );
      }

      // Use processed video URI for upload
      const videoToUpload = processedVideo.uri;

      // 1. Upload the video file — REAL byte-level progress (TikTok-style)
      setUploadStatus('Uploading...');
      setUploadProgress(10);
      console.log('📤 Uploading video file...');
      const { url: videoUrl, error: uploadError } = await upload(
        {
          reactNativeAsset: {
            uri: videoToUpload,
            type: 'video',
            mimeType: 'video/mp4',
            name: `video_${Date.now()}.mp4`,
          },
        },
        {
          onProgress: ({ status, progress }) => {
            if (status === 'uploading' && typeof progress === 'number') {
              setUploadProgress(progress);
            }
          },
        }
      );

      if (uploadError || !videoUrl) {
        throw new Error(uploadError || 'Failed to upload video');
      }

      console.log('✅ Video uploaded to CDN:', videoUrl);
      setUploadProgress(92);

      // 2. Create video record in database
      setUploadStatus('Posting...');
      const payload = {
        videoUrl,
        thumbnailUrl: null,
        caption: caption.trim(),
        taggedProducts: taggedProducts.map((p) => ({
          productId: p.itemType === 'service' ? null : p.id,
          serviceId: p.itemType === 'service' ? p.id : null,
        })),
        durationSeconds: null,
      };

      console.log('📝 Creating video record with payload:', {
        ...payload,
        taggedProductsCount: taggedProducts.length,
      });

      const response = await authenticatedFetch('/api/videos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Video upload API error:', errorData);
        throw new Error(errorData.error || 'Failed to post video');
      }

      const data = await response.json();
      console.log('✅ Video posted successfully! ID:', data.video?.id);

      // Posting from a draft? Clean the draft up now that it's live
      if (draft?.id) {
        await deleteDraft(draft.id);
      }

      setUploadProgress(100);
      setUploadStatus('Posted! 🎉');

      // 3. Navigate to Profile Grid tab to show the new video
      onPost(); // Clear create screen

      // Wait a moment for the success state to show
      setTimeout(() => {
        console.log('🔄 Navigating to profile...');
        router.replace('/(tabs)/profile'); // Navigate to Profile tab
      }, 800);
    } catch (error) {
      console.error('❌ Post video error:', error);
      Alert.alert('Error', error.message || 'Failed to post video. Please try again.');
      setUploadProgress(0);
      setUploadStatus('');
    } finally {
      setPosting(false);
    }
  };

  // Only allow one product tag
  const canAddProduct = taggedProducts.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar style="light" />

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

      {/* Tap anywhere on the video to dismiss the keyboard (TikTok behavior) */}
      <Pressable
        onPress={() => Keyboard.dismiss()}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Upload Progress Overlay */}
      {posting && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <View
            style={{
              width: '80%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
                marginTop: 16,
                marginBottom: 24,
              }}
            >
              {uploadStatus || 'Preparing...'}
            </Text>
            <View
              style={{
                width: '100%',
                height: 6,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  backgroundColor: '#D4AF37',
                  borderRadius: 3,
                }}
              />
            </View>
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 14,
                marginTop: 12,
              }}
            >
              {uploadProgress}%
            </Text>
          </View>
        </View>
      )}

      <View
        style={{
          position: 'absolute',
          top: insets.top + 16,
          left: 16,
          right: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity
          onPress={handleExit}
          disabled={posting}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: posting ? 0.5 : 1,
          }}
        >
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom controls — keyboard-aware so the caption stays visible while typing */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        <View style={{ paddingBottom: insets.bottom + 20 }}>
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <TaggedProductsList products={taggedProducts} onRemoveProduct={handleRemoveProduct} />

            <View
              style={{
                overflow: 'hidden',
                borderRadius: 12,
                marginBottom: 12,
              }}
            >
              <BlurView
                intensity={80}
                tint="dark"
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <TextInput
                  placeholder="Add a caption..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  style={{
                    color: '#FFFFFF',
                    fontSize: 15,
                    padding: 16,
                    minHeight: 80,
                  }}
                />
              </BlurView>
            </View>

            <TouchableOpacity
              onPress={() => canAddProduct && setShowProductModal(true)}
              disabled={!canAddProduct}
              style={{
                overflow: 'hidden',
                borderRadius: 12,
                marginBottom: 12,
                opacity: canAddProduct ? 1 : 0.5,
              }}
            >
              <BlurView
                intensity={80}
                tint="dark"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 14,
                  gap: 8,
                  borderWidth: 1,
                  borderColor: canAddProduct
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Tag size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>
                  {canAddProduct ? 'Tag Product (1 max)' : 'Product Tagged'}
                </Text>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePost}
              style={{
                backgroundColor: taggedProducts.length > 0 ? '#D4AF37' : 'rgba(212,175,55,0.4)',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                {taggedProducts.length > 0 ? 'Post' : 'Tag a product to post'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ProductTagModal
        visible={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSelectProduct={(product) => {
          // Only add if we don't already have a product
          if (taggedProducts.length === 0) {
            setTaggedProducts([product]);
            setShowProductModal(false);
          }
        }}
        alreadyTagged={taggedProducts}
      />
    </View>
  );
}
