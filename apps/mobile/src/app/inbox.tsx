// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, MessageCircle, BadgeCheck, Headphones } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import useUser from '../utils/auth/useUser';
import useAuth from '../utils/auth/useAuth';
import { useTheme } from '../utils/theme';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import useLocalization from '../utils/localization';

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user } = useUser();
  const { isAuthenticated, signIn } = useAuth();
  const colors = useTheme();
  const { t } = useLocalization();

  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const response = await authenticatedFetch('/api/messages');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchConversations]);

  const handleOpenChat = (conv) => {
    if (conv.partner_system) {
      // Crestar support
      router.push('/support-chat');
    } else {
      router.push({
        pathname: '/chat',
        params: {
          partnerId: conv.partner_id,
          partnerName: conv.partner_display_name || conv.partner_username,
          partnerType: '', // unknown type from inbox list
        },
      });
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const filteredConversations = conversations.filter((conv) => {
    const query = searchQuery.toLowerCase();
    const name = (conv.partner_display_name || conv.partner_username || '').toLowerCase();
    return name.includes(query);
  });

  const getPartnerAvatar = (conv) => {
    if (conv.partner_system) {
      return { bg: colors.accent, icon: Headphones, letter: 'C' };
    }
    return {
      bg: '#D4AF37',
      icon: null,
      letter: (conv.partner_display_name || conv.partner_username || '?').charAt(0).toUpperCase(),
    };
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
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              color: colors.text,
              fontSize: 24,
              fontWeight: '700',
              flex: 1,
            }}
          >
            {t('inbox')}
          </Text>
          {totalUnread > 0 && (
            <View
              style={{
                backgroundColor: colors.accent,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: colors.accentText, fontSize: 13, fontWeight: '700' }}>
                {totalUnread}
              </Text>
            </View>
          )}
        </View>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.inputBackground,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: colors.inputBorder,
          }}
        >
          <Search size={18} color={colors.iconSecondary} />
          <TextInput
            placeholder={t('typeMessage')}
            placeholderTextColor={colors.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 15 }}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={{ flexDirection: 'row', padding: 16, gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.push('/support-chat')}
          style={{
            flex: 1,
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Headphones size={18} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
            {t('supportChat')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conversations */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchConversations();
              }}
              tintColor={colors.text}
            />
          }
        >
          {filteredConversations.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <MessageCircle size={48} color={colors.textTertiary} />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 16,
                  marginTop: 16,
                }}
              >
                {searchQuery ? t('search') : t('noMessages')}
              </Text>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 14,
                  marginTop: 8,
                  textAlign: 'center',
                  paddingHorizontal: 40,
                }}
              >
                {searchQuery ? t('retry') : t('contactUs')}
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16 }}>
              {filteredConversations.map((conv) => {
                const avatar = getPartnerAvatar(conv);
                const isUnread = conv.unread_count > 0;

                return (
                  <TouchableOpacity
                    key={conv.conversation_id}
                    onPress={() => handleOpenChat(conv)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderLight,
                    }}
                  >
                    {/* Avatar */}
                    <View style={{ marginRight: 12 }}>
                      <View
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 26,
                          backgroundColor: avatar.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {avatar.icon ? (
                          <avatar.icon
                            size={24}
                            color={conv.partner_system ? colors.accentText : '#FFFFFF'}
                          />
                        ) : (
                          <Text
                            style={{
                              color: conv.partner_system ? colors.accentText : '#FFFFFF',
                              fontSize: 20,
                              fontWeight: '700',
                            }}
                          >
                            {avatar.letter}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 16,
                            fontWeight: isUnread ? '700' : '600',
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {conv.partner_display_name || conv.partner_username}
                        </Text>
                        {(conv.partner_verified || conv.partner_system) && (
                          <BadgeCheck size={16} color="#D4AF37" />
                        )}
                        <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
                          {formatTime(conv.last_message_at)}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: isUnread ? colors.text : colors.textSecondary,
                          fontSize: 14,
                          fontWeight: isUnread ? '600' : '400',
                        }}
                        numberOfLines={1}
                      >
                        {conv.last_message}
                      </Text>
                    </View>

                    {/* Unread Badge */}
                    {isUnread && (
                      <View
                        style={{
                          backgroundColor: colors.accent,
                          borderRadius: 12,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          marginLeft: 12,
                          minWidth: 24,
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: colors.accentText,
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        >
                          {conv.unread_count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
