// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, BadgeCheck, Store, Truck } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import useUser from '../utils/auth/useUser';
import useAuth from '../utils/auth/useAuth';
import { useTheme } from '../utils/theme';
import { authenticatedFetch } from '../utils/authenticatedFetch';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();
  const { data: user } = useUser();
  const { isAuthenticated, signIn } = useAuth();
  const { partnerId, partnerName: initialName, partnerType } = useLocalSearchParams();
  const scrollViewRef = useRef(null);

  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [partner, setPartner] = useState(null);

  const displayName = partner?.display_name || partner?.username || initialName || 'User';
  const isVerified = partner?.is_verified || false;
  const isSystem = partner?.is_system_account || false;

  const fetchMessages = useCallback(async () => {
    if (!isAuthenticated || !partnerId) return;
    try {
      const response = await authenticatedFetch(`/api/messages?partnerId=${partnerId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        if (data.partner) setPartner(data.partner);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, partnerId]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    if (!messageText.trim() || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    const tempMessage = {
      id: `temp_${Date.now()}`,
      sender_user_id: user?.id?.toString(),
      receiver_user_id: partnerId,
      message_text: text,
      created_at: new Date().toISOString(),
      sender_username: user?.username || 'You',
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await authenticatedFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: partnerId, message: text }),
      });
      if (!response.ok) throw new Error('Failed to send');
      setTimeout(fetchMessages, 1000);
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const userId = user?.id?.toString();

  const getPartnerIcon = () => {
    if (partnerType === 'seller') return Store;
    if (partnerType === 'deliverer') return Truck;
    return null;
  };
  const PartnerIcon = getPartnerIcon();

  const getAvatarLetter = () => {
    return (displayName || '?').charAt(0).toUpperCase();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={colors.statusBar} />

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor:
                partnerType === 'seller'
                  ? '#D4AF37'
                  : partnerType === 'deliverer'
                    ? '#D4AF37'
                    : colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {PartnerIcon ? (
              <PartnerIcon size={20} color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
                {getAvatarLetter()}
              </Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              {isVerified && <BadgeCheck size={16} color="#D4AF37" />}
            </View>
            {partnerType && (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {partnerType === 'seller'
                  ? 'Seller'
                  : partnerType === 'deliverer'
                    ? 'Deliverer'
                    : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Messages */}
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            onTouchStart={() => Keyboard.dismiss()}
          >
            {messages.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Send size={40} color={colors.textTertiary} />
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 15,
                    marginTop: 12,
                    textAlign: 'center',
                  }}
                >
                  Start a conversation with {displayName}
                </Text>
              </View>
            )}

            {messages.map((msg) => {
              const isUser = msg.sender_user_id === userId;
              return (
                <View
                  key={msg.id}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    marginBottom: 12,
                  }}
                >
                  {!isUser && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor:
                            partnerType === 'seller'
                              ? '#D4AF37'
                              : partnerType === 'deliverer'
                                ? '#D4AF37'
                                : colors.accent,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontSize: 10,
                            fontWeight: '700',
                          }}
                        >
                          {getAvatarLetter()}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 12,
                          fontWeight: '600',
                        }}
                      >
                        {msg.sender_username || displayName}
                      </Text>
                      {(msg.sender_verified || isVerified) && !isUser && (
                        <BadgeCheck size={12} color="#D4AF37" />
                      )}
                    </View>
                  )}

                  <View
                    style={{
                      backgroundColor: isUser ? colors.accent : colors.cardBackground,
                      borderRadius: 16,
                      borderTopRightRadius: isUser ? 4 : 16,
                      borderTopLeftRadius: isUser ? 16 : 4,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderWidth: isUser ? 0 : 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: isUser ? colors.accentText : colors.text,
                        fontSize: 15,
                        lineHeight: 22,
                      }}
                    >
                      {msg.message_text}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 11,
                      marginTop: 4,
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {formatTime(msg.created_at)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Input */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 12,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: Platform.OS === 'ios' ? 10 : 6,
              maxHeight: 120,
            }}
          >
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              placeholderTextColor={colors.inputPlaceholder}
              multiline
              style={{ color: colors.text, fontSize: 15, maxHeight: 100 }}
            />
          </View>

          <TouchableOpacity
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor:
                messageText.trim() && !sending ? colors.accent : colors.inputBackground,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 2,
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.textTertiary} />
            ) : (
              <Send
                size={20}
                color={messageText.trim() ? colors.accentText : colors.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
