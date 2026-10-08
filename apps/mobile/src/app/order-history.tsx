// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ChevronRight,
  ShoppingBag,
  Store,
  CircleCheck,
  AlertCircle,
  KeyRound,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import useUser from '../utils/auth/useUser';
import useAuth from '../utils/auth/useAuth';
import useLocalization from '../utils/localization';
import { useTheme } from '../utils/theme';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import CurrencyPrice from '../components/CurrencyPrice';

const STATUS_CONFIG = {
  pending_payment: { label: 'Awaiting Payment', color: '#F59E0B', icon: Clock },
  paid: { label: 'Paid', color: '#D4AF37', icon: CheckCircle2 },
  preparing: { label: 'Preparing', color: '#D4AF37', icon: Package },
  ready_for_pickup: { label: 'Ready', color: '#D4AF37', icon: Truck },
  in_transit: { label: 'On the Way', color: '#F97316', icon: Truck },
  delivered: { label: 'Delivered', color: '#D4AF37', icon: CircleCheck },
  completed: { label: 'Completed', color: '#D4AF37', icon: CircleCheck },
  cancelled: { label: 'Cancelled', color: '#EF4444', icon: XCircle },
  refunded: { label: 'Refunded', color: '#6B7280', icon: AlertCircle },
};

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

export default function OrderHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user } = useUser();
  const { isAuthenticated, signIn } = useAuth();
  const { formatCurrency } = useLocalization();
  const colors = useTheme();

  const [role, setRole] = useState('buyer'); // 'buyer' or 'seller'
  const [statusFilter, setStatusFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [isSeller, setIsSeller] = useState(false);

  // PIN entry state for inline confirmation
  const [pinValues, setPinValues] = useState({});
  const [pinErrors, setPinErrors] = useState({});
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      checkSellerStatus();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, statusFilter, isAuthenticated]);

  const checkSellerStatus = async () => {
    try {
      const res = await authenticatedFetch('/api/monetization/status');
      if (res.ok) {
        const data = await res.json();
        setIsSeller(data.seller?.verification_status === 'approved');
      }
    } catch (err) {
      console.error('Check seller:', err);
    }
  };

  const fetchOrders = async (loadMore = false) => {
    if (!loadMore) setLoading(true);
    try {
      const offset = loadMore ? orders.length : 0;
      const res = await authenticatedFetch(
        `/api/orders/list?role=${role}&status=${statusFilter}&limit=20&offset=${offset}`
      );
      if (res.ok) {
        const data = await res.json();
        if (loadMore) {
          setOrders((prev) => [...prev, ...data.orders]);
        } else {
          setOrders(data.orders || []);
        }
        setTotal(data.total);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleInlineConfirmWithPin = async (order) => {
    const pin = pinValues[order.id] || '';
    if (!pin || pin.length < 4) {
      setPinErrors((prev) => ({
        ...prev,
        [order.id]: 'Enter the 4-digit PIN',
      }));
      return;
    }

    setPinErrors((prev) => ({ ...prev, [order.id]: '' }));
    setConfirmingOrderId(order.id);

    try {
      const response = await authenticatedFetch('/api/orders/confirm-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          deliveryPin: pin,
          method: 'pin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg =
          data.error === 'Invalid delivery PIN'
            ? 'Wrong PIN. Check the package from your seller.'
            : data.error || 'Failed to confirm delivery';
        setPinErrors((prev) => ({ ...prev, [order.id]: errMsg }));
        return;
      }

      Alert.alert(
        'Delivery Confirmed! ✅',
        data.message || 'Payment has been released to the seller.',
        [{ text: 'OK' }]
      );

      // Update the order in the list
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'completed' } : o)));
      setPinValues((prev) => ({ ...prev, [order.id]: '' }));
    } catch (error) {
      console.error('Confirm delivery error:', error);
      setPinErrors((prev) => ({
        ...prev,
        [order.id]: 'Something went wrong. Try again.',
      }));
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleInlineConfirmWithoutPin = (order) => {
    Alert.alert(
      'Confirm Delivery',
      'Are you sure you have received your order? This will release payment to the seller.',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, I Received It',
          style: 'default',
          onPress: async () => {
            setConfirmingOrderId(order.id);
            try {
              const response = await authenticatedFetch('/api/orders/confirm-delivery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: order.id,
                  method: 'buyer_confirm',
                }),
              });

              const data = await response.json();

              if (!response.ok) {
                Alert.alert('Error', data.error || 'Failed to confirm');
                return;
              }

              Alert.alert(
                'Delivery Confirmed! ✅',
                data.message || 'Payment has been released to the seller.',
                [{ text: 'OK' }]
              );

              setOrders((prev) =>
                prev.map((o) => (o.id === order.id ? { ...o, status: 'completed' } : o))
              );
            } catch (error) {
              Alert.alert('Error', 'Something went wrong. Try again.');
            } finally {
              setConfirmingOrderId(null);
            }
          },
        },
      ]
    );
  };

  const renderOrderCard = (order) => {
    const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending_payment;
    const StatusIcon = status.icon;
    const counterpartyName =
      role === 'buyer'
        ? order.seller_business_name || order.seller_name || 'Seller'
        : order.buyer_name || 'Buyer';

    // Delivery confirmation is only possible AFTER payment is completed
    const canConfirmDelivery =
      role === 'buyer' &&
      (order.status === 'in_transit' ||
        order.status === 'ready_for_pickup' ||
        order.status === 'paid' ||
        order.status === 'preparing');

    const pinValue = pinValues[order.id] || '';
    const pinError = pinErrors[order.id] || '';
    const isConfirming = confirmingOrderId === order.id;

    return (
      <TouchableOpacity
        key={order.id}
        onPress={() =>
          router.push({
            pathname: '/order-details',
            params: { orderId: order.id },
          })
        }
        activeOpacity={canConfirmDelivery ? 1 : 0.7}
        style={{ marginBottom: 12, overflow: 'hidden', borderRadius: 16 }}
      >
        <BlurView
          intensity={40}
          tint={colors.glass.tint}
          style={{ padding: 16, borderWidth: 1, borderColor: colors.border }}
        >
          {/* Header row: status + date */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: status.color,
                }}
              />
              <Text style={{ color: status.color, fontSize: 13, fontWeight: '600' }}>
                {status.label}
              </Text>
            </View>
            <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
              {formatDate(order.created_at)}
            </Text>
          </View>

          {/* Order info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Item thumbnail placeholder */}
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                backgroundColor: colors.cardBackgroundAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {order.item_type === 'food_beverage' ? (
                <Text style={{ fontSize: 28 }}>🍜</Text>
              ) : (
                <Package size={24} color={colors.textTertiary} />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}
                numberOfLines={1}
              >
                {order.item_title || 'Order'}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  marginTop: 2,
                }}
              >
                {role === 'buyer' ? `From: ${counterpartyName}` : `By: ${counterpartyName}`}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <CurrencyPrice
                  price={order.total_amount}
                  originalCurrency={order.seller_currency || 'GHS'}
                  size="small"
                  textStyle={{
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: '700',
                  }}
                />
                {order.quantity > 1 && (
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                    × {order.quantity}
                  </Text>
                )}
              </View>
            </View>

            <ChevronRight size={20} color={colors.textTertiary} />
          </View>

          {/* Order number */}
          <View
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: colors.borderLight,
            }}
          >
            <Text style={{ color: colors.textTertiary, fontSize: 11 }}>
              Order #{order.order_number}
            </Text>
          </View>

          {/* PIN Entry & Confirm Delivery — inline on active buyer orders */}
          {canConfirmDelivery && (
            <View
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: colors.borderLight,
              }}
            >
              {/* PIN input row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <KeyRound size={16} color={colors.textSecondary} />
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  Enter delivery PIN
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TextInput
                  value={pinValue}
                  onChangeText={(text) => {
                    setPinValues((prev) => ({
                      ...prev,
                      [order.id]: text.replace(/[^0-9]/g, '').slice(0, 4),
                    }));
                    setPinErrors((prev) => ({ ...prev, [order.id]: '' }));
                  }}
                  placeholder="PIN"
                  placeholderTextColor={colors.inputPlaceholder}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={{
                    flex: 1,
                    backgroundColor: colors.inputBackground,
                    borderWidth: 1,
                    borderColor: pinError ? '#EF4444' : colors.inputBorder,
                    borderRadius: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: '700',
                    textAlign: 'center',
                    letterSpacing: 6,
                  }}
                />
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation && e.stopPropagation();
                    handleInlineConfirmWithPin(order);
                  }}
                  disabled={isConfirming || pinValue.length < 4}
                  style={{
                    backgroundColor:
                      pinValue.length === 4 && !isConfirming
                        ? '#D4AF37'
                        : 'rgba(212, 175, 55, 0.3)',
                    borderRadius: 10,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isConfirming ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <CheckCircle2 size={22} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              {pinError ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 6,
                  }}
                >
                  <AlertCircle size={12} color="#EF4444" />
                  <Text style={{ color: '#EF4444', fontSize: 12 }}>{pinError}</Text>
                </View>
              ) : null}

              {/* "I have received my order" fallback */}
              <TouchableOpacity
                onPress={() => handleInlineConfirmWithoutPin(order)}
                disabled={isConfirming}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: 'rgba(212, 175, 55, 0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(212, 175, 55, 0.2)',
                }}
              >
                <CircleCheck size={18} color="#D4AF37" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: '600',
                    }}
                  >
                    I have received my order
                  </Text>
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 11,
                      marginTop: 1,
                    }}
                  >
                    Tap if PIN is unavailable
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>
      </TouchableOpacity>
    );
  };

  // Show sign-in prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        <StatusBar style={colors.statusBar} />
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: 'absolute',
            top: insets.top + 12,
            left: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.inputBackground,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Package size={56} color={colors.textTertiary} />
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: '700',
            marginTop: 20,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Sign in to view orders
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            textAlign: 'center',
            marginBottom: 28,
            lineHeight: 22,
          }}
        >
          You need to be signed in to see your order history.
        </Text>
        <TouchableOpacity
          onPress={() => signIn()}
          style={{
            backgroundColor: '#111827',
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 40,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
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
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              color: colors.text,
              fontSize: 20,
              fontWeight: '700',
              flex: 1,
            }}
          >
            Orders
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: 13 }}>{total} total</Text>
        </View>

        {/* Role Tabs (Buyer / Seller) */}
        {isSeller && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => setRole('buyer')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: role === 'buyer' ? colors.accent : colors.inputBackground,
              }}
            >
              <ShoppingBag size={16} color={role === 'buyer' ? '#FFFFFF' : colors.text} />
              <Text
                style={{
                  color: role === 'buyer' ? '#FFFFFF' : colors.text,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                My Purchases
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setRole('seller')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: role === 'seller' ? colors.accent : colors.inputBackground,
              }}
            >
              <Store size={16} color={role === 'seller' ? '#FFFFFF' : colors.text} />
              <Text
                style={{
                  color: role === 'seller' ? '#FFFFFF' : colors.text,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                My Sales
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setStatusFilter(tab.id)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                backgroundColor: statusFilter === tab.id ? colors.text : colors.inputBackground,
              }}
            >
              <Text
                style={{
                  color: statusFilter === tab.id ? colors.background : colors.text,
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 40,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {orders.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Package size={56} color={colors.textTertiary} />
              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: '600',
                  marginTop: 20,
                }}
              >
                {role === 'buyer' ? 'No purchases yet' : 'No sales yet'}
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
                {role === 'buyer'
                  ? "When you buy something, it'll show up here"
                  : "When someone buys from you, it'll show up here"}
              </Text>
              {role === 'buyer' && (
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/shop')}
                  style={{
                    backgroundColor: colors.accent,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 20,
                    marginTop: 24,
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: '700',
                    }}
                  >
                    Browse Shop
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {orders.map(renderOrderCard)}

              {hasMore && (
                <TouchableOpacity
                  onPress={() => fetchOrders(true)}
                  style={{ alignItems: 'center', paddingVertical: 16 }}
                >
                  <Text
                    style={{
                      color: colors.accent,
                      fontSize: 14,
                      fontWeight: '600',
                    }}
                  >
                    Load More
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
