// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Search, X, TrendingUp, BadgeCheck, Store, Clock, Play } from 'lucide-react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VideoPlayerModal from '@/components/VideoPlayerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT = 10;

/**
 * TikTok-style search:
 * - Recent searches (saved on device, tap to reuse, clearable)
 * - Tabs: Top / Users / Videos / Shop
 * - Video results play instantly in the full-screen player
 * - Users open profiles, products open the product page
 */
export function SearchModal({
  visible,
  insets,
  searchQuery,
  onSearchChange,
  onClose,
  searching,
  searchResults,
  searchTab,
  onTabChange,
  onUserPress,
  onProductPress,
  formatCurrency,
  getProductImage,
}) {
  const [recentSearches, setRecentSearches] = useState([]);

  // Video playback inside search (TikTok behavior)
  const [playerVisible, setPlayerVisible] = useState(false);
  const [playerVideos, setPlayerVideos] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(0);

  const loadRecent = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      setRecentSearches(Array.isArray(list) ? list : []);
    } catch (e) {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    if (visible) loadRecent();
  }, [visible, loadRecent]);

  // Save the query to recent searches when the user has results
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        let list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) list = [];
        list = [q, ...list.filter((s) => s.toLowerCase() !== q.toLowerCase())];
        list = list.slice(0, MAX_RECENT);
        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
        setRecentSearches(list);
      } catch (e) {}
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const removeRecent = async (term) => {
    try {
      const updated = recentSearches.filter((s) => s !== term);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const clearAllRecent = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {}
  };

  const handleVideoPress = (video) => {
    const vids = searchResults.videos || [];
    const idx = vids.findIndex((v) => v.id === video.id);
    // Normalize for the player
    setPlayerVideos(
      vids.map((v) => ({
        ...v,
        videoUrl: v.video_url,
        avatar: v.profile_image,
        displayName: v.display_name,
        businessName: v.business_name,
      }))
    );
    setPlayerIndex(idx >= 0 ? idx : 0);
    setPlayerVisible(true);
  };

  const allItems = [...(searchResults.products || []), ...(searchResults.services || [])];
  const hasResults =
    allItems.length > 0 ||
    (searchResults.users || []).length > 0 ||
    (searchResults.videos || []).length > 0;

  const showRecent = !searching && !searchQuery.trim();

  return (
    <Modal visible={visible} animationType="slide">
      <View
        style={{
          flex: 1,
          backgroundColor: '#000000',
          paddingTop: insets.top + 8,
        }}
      >
        {/* Search Bar */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            marginBottom: 12,
            gap: 10,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 24,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Search size={18} color="rgba(255, 255, 255, 0.5)" />
            <TextInput
              placeholder="Search"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              autoFocus
              value={searchQuery}
              onChangeText={onSearchChange}
              style={{
                flex: 1,
                marginLeft: 8,
                color: '#FFFFFF',
                fontSize: 15,
              }}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => onSearchChange('')}>
                <X size={18} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Search Tabs — TikTok naming */}
        {!showRecent && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, paddingHorizontal: 16, marginBottom: 16 }}
          >
            {[
              { id: 'all', label: 'Top' },
              { id: 'users', label: 'Users' },
              { id: 'videos', label: 'Videos' },
              { id: 'products', label: 'Shop' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => onTabChange(tab.id)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: searchTab === tab.id ? '#D4AF37' : 'rgba(255, 255, 255, 0.1)',
                  marginRight: 10,
                }}
              >
                <Text
                  style={{
                    color: searchTab === tab.id ? '#000000' : 'rgba(255, 255, 255, 0.7)',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Results / Recent */}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {searching && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color="#D4AF37" />
            </View>
          )}

          {/* ── Recent searches (TikTok style) ── */}
          {showRecent && (
            <View>
              {recentSearches.length > 0 ? (
                <>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
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
                      Recent searches
                    </Text>
                    <TouchableOpacity onPress={clearAllRecent}>
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.5)',
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        Clear all
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {recentSearches.map((term) => (
                    <View
                      key={term}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <Clock size={16} color="rgba(255,255,255,0.4)" />
                      <TouchableOpacity
                        onPress={() => onSearchChange(term)}
                        style={{ flex: 1, marginLeft: 12 }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 15 }}>{term}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeRecent(term)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <X size={16} color="rgba(255,255,255,0.4)" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                  <TrendingUp size={40} color="rgba(255, 255, 255, 0.2)" />
                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: 16,
                      marginTop: 16,
                    }}
                  >
                    Search videos, users, and products
                  </Text>
                </View>
              )}
            </View>
          )}

          {!searching && searchQuery.trim() && !hasResults && (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Search size={40} color="rgba(255, 255, 255, 0.2)" />
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: 16,
                  marginTop: 16,
                }}
              >
                No results for "{searchQuery}"
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.3)',
                  fontSize: 14,
                  marginTop: 8,
                }}
              >
                Try a different search term
              </Text>
            </View>
          )}

          {/* Users Results */}
          {!searching &&
            (searchResults.users || []).length > 0 &&
            (searchTab === 'all' || searchTab === 'users') && (
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 17,
                    fontWeight: '700',
                    marginBottom: 12,
                  }}
                >
                  Users
                </Text>
                {searchResults.users.map((u) => {
                  const userDisplayName =
                    u.display_name ||
                    u.business_name ||
                    u.username ||
                    u.name ||
                    (u.email ? u.email.split('@')[0] : 'User');
                  const userHandle = u.username
                    ? `@${u.username}`
                    : u.email
                      ? u.email.split('@')[0]
                      : '';
                  const avatarLetter = userDisplayName.charAt(0).toUpperCase();

                  return (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => onUserPress(u.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: u.business_name
                            ? '#D4AF37'
                            : 'rgba(255, 255, 255, 0.15)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        {u.profile_image ? (
                          <Image
                            source={{ uri: u.profile_image }}
                            style={{ width: 48, height: 48, borderRadius: 24 }}
                            contentFit="cover"
                          />
                        ) : u.business_name ? (
                          <Store size={22} color="#FFFFFF" />
                        ) : (
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 20,
                              fontWeight: '700',
                            }}
                          >
                            {avatarLetter}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 15,
                              fontWeight: '600',
                            }}
                          >
                            {userDisplayName}
                          </Text>
                          {u.is_verified && <BadgeCheck size={14} color="#D4AF37" />}
                        </View>
                        <Text
                          style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: 13,
                          }}
                        >
                          {userHandle}
                          {u.seller_type
                            ? ` · ${u.seller_type === 'food_beverage' ? '🍽️ Food' : '🛍️ Seller'}`
                            : ''}
                          {u.product_count > 0 ? ` · ${u.product_count} products` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

          {/* Videos Results — tap plays instantly (TikTok style) */}
          {!searching &&
            (searchResults.videos || []).length > 0 &&
            (searchTab === 'all' || searchTab === 'videos') && (
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 17,
                    fontWeight: '700',
                    marginBottom: 12,
                  }}
                >
                  Videos
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {searchResults.videos.map((video) => (
                    <TouchableOpacity
                      key={video.id}
                      onPress={() => handleVideoPress(video)}
                      style={{
                        width: (SCREEN_WIDTH - 40) / 3,
                        height: ((SCREEN_WIDTH - 40) / 3) * 1.5,
                        borderRadius: 8,
                        overflow: 'hidden',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        position: 'relative',
                      }}
                    >
                      <Image
                        source={{
                          uri:
                            video.thumbnail_url ||
                            'https://picsum.photos/300/450?random=' + video.id,
                        }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          left: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Play size={12} color="#FFFFFF" fill="#FFFFFF" />
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontSize: 11,
                            fontWeight: '600',
                            textShadowColor: 'rgba(0, 0, 0, 0.8)',
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 2,
                          }}
                        >
                          {video.views_count || 0}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

          {/* Products Results */}
          {!searching &&
            allItems.length > 0 &&
            (searchTab === 'all' || searchTab === 'products') && (
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 17,
                    fontWeight: '700',
                    marginBottom: 12,
                  }}
                >
                  Shop
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {allItems.map((item) => {
                    const img = getProductImage(item);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => onProductPress(item.id)}
                        style={{
                          width: (SCREEN_WIDTH - 48) / 2,
                          borderRadius: 12,
                          overflow: 'hidden',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <Image
                          source={{ uri: img }}
                          style={{
                            width: '100%',
                            height: (SCREEN_WIDTH - 48) / 2,
                          }}
                          contentFit="cover"
                        />
                        <View style={{ padding: 10 }}>
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 14,
                              fontWeight: '600',
                            }}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={{
                              color: '#D4AF37',
                              fontSize: 15,
                              fontWeight: '700',
                              marginTop: 4,
                            }}
                          >
                            {formatCurrency(item.price)}
                          </Text>
                          {item.seller_name && (
                            <Text
                              style={{
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontSize: 12,
                                marginTop: 4,
                              }}
                            >
                              {item.seller_name}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
        </ScrollView>

        {/* Full-screen video player for search results */}
        <VideoPlayerModal
          visible={playerVisible}
          videos={playerVideos}
          initialIndex={playerIndex}
          onClose={() => setPlayerVisible(false)}
        />
      </View>
    </Modal>
  );
}
