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
import {
  ArrowLeft,
  Search,
  MessageCircle,
  BadgeCheck,
  Headphones,
  Bell,
  Heart,
  UserPlus,
  ShoppingBag,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import useUser from '../utils/auth/useUser';
import useAuth from '../utils/auth/useAuth';
import { useTheme } from '../utils/theme';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import useLocalization from '../utils/localization';

const GOLD = '#D4AF37';
const BADGE = '#FE2C55';

function activityIcon(type) {
  if (type === 'new_order' || type === 'order' || type === 'sale' || type === 'payout')
    return ShoppingBag;
  if (type === 'like') return Heart;
  if (type === 'follow') return UserPlus;
  return Bell;
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user } = useUser();
  const { isAuthenticated } = useAuth();
  const colors = useTheme();
  const { t } = useLocalization();

  const [tab, setTab] = useState('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activityItems, setActivityItems] = useState([]);
  const [activityUnread, setActivityUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInbox = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [msgRes, actRes] = await Promise.all([
        authenticatedFetch('/api/messages'),
        authenticatedFetch('/api/notifications'),
      ]);
      if (msgRes.ok) {
        const data = await msgRes.json();
        setConversations(data.conversations || []);
      }
      if (actRes.ok) {
        const data = await actRes.json();
        const items = (data.notifications || []).filter((n) => n.type !== 'message');
        setActivityItems(items);
        setActivityUnread(Number(data.counts?.unreadActivity) || 0);
      }
    } catch (error) {
      console.error('Failed to fetch inbox:', error);
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
    fetchInbox();
    const interval = setInterval(fetchInbox, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchInbox]);

  const selectTab = async (next) => {
    setTab(next);
    if (next === 'activity' && activityUnread > 0) {
      try {
        await authenticatedFetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_all_read' }),
        });
        setActivityItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
        setActivityUnread(0);
      } catch {}
    }
  };

  const handleOpenChat = (conv) => {
    if (conv.partner_system) {
      router.push('/support-chat');
    } else {
      router.push({
        pathname: '/chat',
        params: {
          partnerId: conv.partner_id,
          partnerName: conv.partner_display_name || conv.partner_username,
          partnerType: '',
        },
      });
    }
  };

  const openActivity = async (n) => {
    if (!n.is_read) {
      try {
        await authenticatedFetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read', id: n.id }),
        });
        setActivityItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
        );
        setActivityUnread((c) => Math.max(0, c - 1));
      } catch {}
    }
    let data = n.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        data = {};
      }
    }
    data = data || {};
    if (n.type === 'new_order' || n.type === 'order' || n.type === 'sale') {
      if (data.order_id) router.push(`/orders/${data.order_id}`);
      else router.push('/seller-dashboard');
      return;
    }
    if (data.video_id) {
      router.push(`/video/${data.video_id}`);
      return;
    }
    if (data.from_user_id) {
      router.push({
        pathname: '/chat',
        params: { partnerId: String(data.from_user_id) },
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

  const messageUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const totalUnread = messageUnread + activityUnread;

  const filteredConversations = conversations.filter((conv) => {
    const query = searchQuery.toLowerCase();
    const name = (conv.partner_display_name || conv.partner_username || '').toLowerCase();
    return name.includes(query);
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />

      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', flex: 1 }}>
            {t('inbox') || 'Inbox'}
          </Text>
          {totalUnread > 0 && (
            <View
              style={{
                backgroundColor: BADGE,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                {totalUnread > 99 ? '99+' : totalUnread}
              </Text>
            </View>
          )}
        </View>

        {/* Crestar segmented control */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            padding: 4,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 12,
          }}
        >
          {['messages', 'activity'].map((key) => {
            const active = tab === key;
            const count = key === 'messages' ? messageUnread : activityUnread;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => selectTab(key)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: active ? GOLD : 'transparent',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    color: active ? '#000000' : colors.textSecondary,
                    fontSize: 14,
                    fontWeight: '700',
                  }}
                >
                  {key === 'messages' ? 'Messages' : 'Activity'}
                </Text>
                {count > 0 && (
                  <View
                    style={{
                      backgroundColor: active ? 'rgba(0,0,0,0.2)' : BADGE,
                      borderRadius: 8,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      minWidth: 18,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: active ? '#000000' : '#FFFFFF',
                        fontSize: 10,
                        fontWeight: '700',
                      }}
                    >
                      {count > 99 ? '99+' : count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'messages' && (
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
              placeholder={t('typeMessage') || 'Search'}
              placeholderTextColor={colors.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 15 }}
            />
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={GOLD} />
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
                fetchInbox();
              }}
              tintColor={colors.text}
            />
          }
        >
          {tab === 'activity' ? (
            activityItems.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Bell size={48} color={colors.textTertiary} />
                <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 16 }}>
                  No activity yet
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
                  Orders, likes, follows, and sales alerts appear here
                </Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                {activityItems.map((n) => {
                  const Icon = activityIcon(n.type);
                  const unread = !n.is_read;
                  return (
                    <TouchableOpacity
                      key={String(n.id)}
                      onPress={() => openActivity(n)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.borderLight,
                      }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: colors.cardBackground,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        <Icon size={22} color={GOLD} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 15,
                            fontWeight: unread ? '700' : '600',
                          }}
                          numberOfLines={1}
                        >
                          {n.title || 'Update'}
                        </Text>
                        <Text
                          style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {n.body || ''}
                        </Text>
                      </View>
                      <Text style={{ color: colors.textTertiary, fontSize: 12, marginLeft: 8 }}>
                        {formatTime(n.created_at)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          ) : filteredConversations.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <MessageCircle size={48} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 16 }}>
                {searchQuery ? t('search') : t('noMessages') || 'No messages'}
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16 }}>
              {filteredConversations.map((conv) => {
                const isUnread = conv.unread_count > 0;
                const name =
                  conv.partner_display_name || conv.partner_username || (conv.partner_system ? 'Crestar' : 'User');
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
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: GOLD,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      {conv.partner_system ? (
                        <Headphones size={24} color="#000000" />
                      ) : (
                        <Text style={{ color: '#000000', fontSize: 20, fontWeight: '700' }}>
                          {String(name).charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
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
                          {name}
                        </Text>
                        {(conv.partner_verified || conv.partner_system) && (
                          <BadgeCheck size={16} color={GOLD} />
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
                    {isUnread && (
                      <View
                        style={{
                          backgroundColor: BADGE,
                          borderRadius: 12,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          marginLeft: 12,
                          minWidth: 24,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
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
