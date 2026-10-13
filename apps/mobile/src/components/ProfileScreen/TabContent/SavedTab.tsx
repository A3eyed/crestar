// @ts-nocheck
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Image } from 'expo-image';
import { Play, Bookmark } from 'lucide-react-native';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = (SCREEN_WIDTH - 48) / 3;

export function SavedTab({ colors, userId }) {
  const router = useRouter();
  const [savedVideos, setSavedVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/videos/saved');
      if (res.ok) {
        const data = await res.json();
        setSavedVideos(data.videos || []);
      } else {
        setSavedVideos([]);
      }
    } catch (error) {
      console.error('Fetch saved videos error:', error);
      setSavedVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [userId, fetchSaved]);

  if (loading) {
    return (
      <View style={{ paddingTop: 80, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (savedVideos.length === 0) {
    return (
      <View style={{ paddingTop: 60, alignItems: 'center' }}>
        <Bookmark size={40} color={colors.textTertiary} style={{ marginBottom: 12 }} />
        <Text
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 4,
          }}
        >
          Saved videos
        </Text>
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 13,
            textAlign: 'center',
            paddingHorizontal: 60,
          }}
        >
          Save videos to watch later
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={savedVideos}
      numColumns={3}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 100,
      }}
      columnWrapperStyle={{ gap: 4 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: '/(tabs)/feed', params: { videoId: item.id } })
          }
          style={{
            width: ITEM_WIDTH,
            height: ITEM_WIDTH * 1.5,
            marginBottom: 4,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: item.thumbnail_url || item.video_url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
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
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
              {item.views_count || 0}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => String(item.id)}
    />
  );
}
