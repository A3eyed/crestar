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
import { ArrowLeft, Send, ShieldCheck, BadgeCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import useUser from '../utils/auth/useUser';
import useAuth from '../utils/auth/useAuth';
import { useTheme } from '../utils/theme';

// Crestar system account IDs — these are the official support accounts
const CRESTAR_ACCOUNT_ID = '8'; // username: Crestar
const CRESTARHQ_ACCOUNT_ID = '10'; // username: crestarhq

export default function SupportChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();
  const { data: user } = useUser();
  const { isAuthenticated, signIn } = useAuth();
  const scrollViewRef = useRef(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [partner, setPartner] = useState(null);

  // Fetch messages from backend
  const fetchMessages = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await fetch(`/api/messages?partnerId=${CRESTAR_ACCOUNT_ID}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setPartner(data.partner || null);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchMessages();
    // Poll for new messages every 30 seconds
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

    // Optimistic: show user message immediately
    const tempMessage = {
      id: `temp_${Date.now()}`,
      sender_user_id: user?.id?.toString(),
      receiver_user_id: CRESTAR_ACCOUNT_ID,
      message_text: text,
      created_at: new Date().toISOString(),
      sender_username: user?.username || 'You',
      sender_verified: false,
      sender_system: false,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: CRESTAR_ACCOUNT_ID,
          message: text,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Refresh messages to get the auto-reply from Crestar
      setTimeout(() => {
        fetchMessages();
      }, 1500);
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
  const partnerName = partner?.display_name || partner?.username || 'Crestar';
  const isVerified = partner?.is_verified || true;

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

          {/* Crestar Avatar */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.accentText, fontSize: 18, fontWeight: '700' }}>C</Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
                {partnerName}
              </Text>
              {isVerified && <BadgeCheck size={18} color="#D4AF37" />}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.success,
                }}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                Official Support • @Crestar
              </Text>
            </View>
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
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 20,
            }}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            onTouchStart={() => Keyboard.dismiss()}
          >
            {/* Welcome message */}
            {messages.length === 0 && (
              <View
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '80%',
                  marginBottom: 12,
                }}
              >
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
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: colors.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.accentText,
                        fontSize: 11,
                        fontWeight: '700',
                      }}
                    >
                      C
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    Crestar Support
                  </Text>
                  <BadgeCheck size={14} color="#D4AF37" />
                </View>

                <View
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderRadius: 16,
                    borderTopLeftRadius: 4,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>
                    👋 Hi there! Welcome to Crestar Support.{'\n\n'}How can we help you today?
                    Describe your issue and our team will respond as soon as possible.
                  </Text>
                </View>
              </View>
            )}

            {messages.map((msg) => {
              const isUser = msg.sender_user_id === userId;
              const isSystem = msg.sender_system;
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
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: colors.accent,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: colors.accentText,
                            fontSize: 11,
                            fontWeight: '700',
                          }}
                        >
                          C
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 12,
                          fontWeight: '600',
                        }}
                      >
                        {msg.sender_username || 'Crestar'}
                      </Text>
                      {(msg.sender_verified || isSystem) && (
                        <BadgeCheck size={14} color="#D4AF37" />
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
              placeholder="Describe your issue..."
              placeholderTextColor={colors.inputPlaceholder}
              multiline
              style={{
                color: colors.text,
                fontSize: 15,
                maxHeight: 100,
              }}
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
