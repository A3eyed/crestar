// @ts-nocheck
import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Play, Trash2, Clock, Tag } from 'lucide-react-native';
import { useTheme } from '../utils/theme';
import { getDrafts, deleteDraft, usePendingDraft } from '../utils/draftsStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE = (SCREEN_WIDTH - 4) / 3;

export default function DraftsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();
  const { setPendingDraft } = usePendingDraft();
  const [drafts, setDrafts] = useState([]);

  const loadDrafts = useCallback(async () => {
    const list = await getDrafts();
    setDrafts(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [loadDrafts])
  );

  const handleOpenDraft = (draft) => {
    setPendingDraft(draft);
    router.push('/(tabs)/create');
  };

  const handleDeleteDraft = (draft) => {
    Alert.alert('Delete draft?', 'This draft will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = await deleteDraft(draft.id);
          setDrafts(updated);
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', flex: 1 }}>Drafts</Text>
      </View>

      {drafts.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 40,
          }}
        >
          <Clock size={48} color={colors.textTertiary} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 16,
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            No drafts yet
          </Text>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 13,
              marginTop: 8,
              textAlign: 'center',
              lineHeight: 19,
            }}
          >
            When you exit a video before posting, you can save it here and finish it later.
          </Text>
        </View>
      ) : (
        <FlatList
          data={drafts}
          numColumns={3}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 1, paddingBottom: insets.bottom + 20 }}
          columnWrapperStyle={{ gap: 2 }}
          ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleOpenDraft(item)}
              activeOpacity={0.85}
              style={{
                width: TILE,
                height: TILE * 1.6,
                backgroundColor: '#111111',
                position: 'relative',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Play size={28} color="rgba(255,255,255,0.6)" fill="rgba(255,255,255,0.6)" />

              {/* Tagged product indicator */}
              {item.taggedProducts?.length > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: 'rgba(212,175,55,0.9)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Tag size={11} color="#FFFFFF" />
                </View>
              )}

              {/* Caption + date */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 6,
                  right: 6,
                }}
              >
                {item.caption ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: '600',
                      textShadowColor: 'rgba(0,0,0,0.9)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 3,
                    }}
                  >
                    {item.caption}
                  </Text>
                ) : null}
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 10,
                    marginTop: 2,
                  }}
                >
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>

              {/* Delete */}
              <TouchableOpacity
                onPress={() => handleDeleteDraft(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
