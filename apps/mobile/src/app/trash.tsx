// @ts-nocheck
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Trash2, RotateCcw, Play, Clock } from 'lucide-react-native';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import { useTheme } from '@/utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = (SCREEN_WIDTH - 3) / 3;

export default function TrashScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null);
  const [retentionDays, setRetentionDays] = useState(30);

  const fetchTrash = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/videos/trash');
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
        if (data.retentionDays) setRetentionDays(data.retentionDays);
      }
    } catch (error) {
      console.error('Trash fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrash();
    }, [fetchTrash])
  );

  const handleRestore = async (video) => {
    try {
      setWorking(video.id);
      const response = await authenticatedFetch('/api/videos/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      });
      if (response.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== video.id));
        Alert.alert('Restored', 'Your video is back on your profile.');
      } else {
        Alert.alert('Error', 'Could not restore this video. Please try again.');
      }
    } catch (err) {
      console.error('Restore error:', err);
      Alert.alert('Error', 'Could not restore this video.');
    } finally {
      setWorking(null);
    }
  };

  const handlePermanentDelete = (video) => {
    Alert.alert(
      'Delete permanently?',
      'This video will be permanently deleted and cannot be recovered.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            try {
              setWorking(video.id);
              const response = await authenticatedFetch(`/api/videos/trash?videoId=${video.id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                setVideos((prev) => prev.filter((v) => v.id !== video.id));
              } else {
                Alert.alert('Error', 'Could not delete this video. Please try again.');
              }
            } catch (err) {
              console.error('Permanent delete error:', err);
              Alert.alert('Error', 'Could not delete this video.');
            } finally {
              setWorking(null);
            }
          },
        },
      ]
    );
  };

  const handleVideoPress = (video) => {
    Alert.alert('Recently deleted', `Deleted video · ${video.daysRemaining} days left`, [
      { text: 'Restore', onPress: () => handleRestore(video) },
      {
        text: 'Delete permanently',
        style: 'destructive',
        onPress: () => handlePermanentDelete(video),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <StatusBar style={colors.statusBar} />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight || 'rgba(0,0,0,0.06)',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
            Recently deleted
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
            Videos are permanently removed after {retentionDays} days
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent || '#D4AF37'} />
        </View>
      ) : videos.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          <Trash2 size={48} color={colors.textTertiary} />
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: '600',
              marginTop: 16,
            }}
          >
            Nothing in the trash
          </Text>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 14,
              textAlign: 'center',
              marginTop: 6,
            }}
          >
            Deleted videos stay here for {retentionDays} days before being permanently removed
          </Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          numColumns={3}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          columnWrapperStyle={{ gap: 1.5 }}
          ItemSeparatorComponent={() => <View style={{ height: 1.5 }} />}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleVideoPress(item)}
              activeOpacity={0.85}
              style={{
                width: ITEM_WIDTH,
                height: ITEM_WIDTH * 1.6,
                position: 'relative',
                backgroundColor: '#1A1A1A',
              }}
            >
              {item.thumbnailUrl ? (
                <Image
                  source={{ uri: item.thumbnailUrl }}
                  style={{ width: '100%', height: '100%', opacity: 0.7 }}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
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

              {/* Days remaining badge */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  borderRadius: 8,
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                }}
              >
                <Clock size={10} color="#FF9F0A" />
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>
                  {item.daysRemaining}d left
                </Text>
              </View>

              {/* Quick restore button */}
              <TouchableOpacity
                onPress={() => handleRestore(item)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {working === item.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <RotateCcw size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
