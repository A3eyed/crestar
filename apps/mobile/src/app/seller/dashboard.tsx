// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  Package,
  Eye,
  Plus,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  BarChart3,
  MapPin,
  Truck,
  Store,
  Users,
  Edit,
  Trash2,
  Settings,
  Megaphone,
  X,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import useUser from '../../utils/auth/useUser';
import useAuth from '../../utils/auth/useAuth';
import useLocalization from '../../utils/localization';
import { useTheme } from '../../utils/theme';
import { authenticatedFetch } from '../../utils/authenticatedFetch';
import CurrencyPrice from '../../components/CurrencyPrice';

const COMMISSION_OPTIONS = [5, 10, 15, 20, 25, 30];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRODUCT_WIDTH = (SCREEN_WIDTH - 52) / 3;

export default function SellerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user } = useUser();
  const { isAuthenticated, signIn } = useAuth();
  const { formatCurrency } = useLocalization();
  const colors = useTheme();
  const [businessCenter, setBusinessCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedTab, setSelectedTab] = useState('products'); // NEW: Tab state

  // Affiliate settings modal state (TikTok Seller Center style)
  const [affiliateProduct, setAffiliateProduct] = useState(null);
  const [affiliateEnabled, setAffiliateEnabled] = useState(false);
  const [affiliateRate, setAffiliateRate] = useState(5);
  const [savingAffiliate, setSavingAffiliate] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // Refresh whenever this screen regains focus — a product listed moments
  // ago shows up immediately (TikTok Seller Center behavior)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user?.id) {
        fetchDashboardData();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user?.id])
  );

  const fetchDashboardData = async () => {
    try {
      // ── Fetch listings FIRST and independently — a failure in any other
      // call must never prevent the seller's products from showing ──
      try {
        const listingsResponse = await authenticatedFetch(
          `/api/listings/products?sellerId=${user.id}`
        );
        if (listingsResponse.ok) {
          const listingsData = await listingsResponse.json();
          setListings(listingsData.products || []);
        }
      } catch (listingsError) {
        console.error('Failed to fetch listings:', listingsError);
      }

      // Fetch business center status
      try {
        const centerResponse = await authenticatedFetch('/api/business-centers');
        if (centerResponse.ok) {
          const centerData = await centerResponse.json();

          if (centerData.has_center) {
            const center = centerData.center;
            if (center.center_type === 'seller' || center.center_type === 'foodhub') {
              setBusinessCenter(center);
            } else {
              router.replace('/monetization-center');
              return;
            }
          } else {
            router.replace('/monetization-center');
            return;
          }
        }
      } catch (centerError) {
        console.error('Failed to fetch business center:', centerError);
      }

      // Fetch earnings — independent
      try {
        const earningsResponse = await authenticatedFetch('/api/wallet/pending-earnings');
        if (earningsResponse.ok) {
          const earningsData = await earningsResponse.json();
          setEarnings(earningsData);
        }
      } catch (earningsError) {
        console.error('Failed to fetch earnings:', earningsError);
      }

      // Fetch seller orders — independent
      try {
        const ordersResponse = await authenticatedFetch(`/api/orders/list?role=seller`);
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          setOrders(ordersData.orders || []);
        }
      } catch (ordersError) {
        console.error('Failed to fetch orders:', ordersError);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Delete (archive) a product — buyers stop seeing it immediately
  const handleDeleteProduct = (product) => {
    Alert.alert(
      'Delete Product',
      `Remove "${product.title}" from your shop? Buyers will no longer see it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authenticatedFetch(`/api/listings/products?id=${product.id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                setListings((prev) => prev.filter((p) => p.id !== product.id));
              } else {
                Alert.alert('Error', 'Could not delete product. Please try again.');
              }
            } catch (e) {
              Alert.alert('Error', 'Could not delete product. Please try again.');
            }
          },
        },
      ]
    );
  };

  // NEW: Handle product edit
  const handleEditProduct = (product) => {
    router.push(`/edit-product/${product.id}`);
  };

  // Open affiliate settings for a product
  const openAffiliateSettings = (product) => {
    setAffiliateProduct(product);
    setAffiliateEnabled(product.creator_promotion_enabled === true);
    setAffiliateRate(parseFloat(product.affiliate_commission_rate) || 5);
  };

  // Save affiliate settings via PATCH (only updates affiliate fields)
  const saveAffiliateSettings = async () => {
    if (!affiliateProduct || savingAffiliate) return;
    setSavingAffiliate(true);
    try {
      const response = await authenticatedFetch('/api/listings/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: affiliateProduct.id,
          creatorPromotionEnabled: affiliateEnabled,
          affiliateCommissionRate: affiliateRate,
        }),
      });
      if (!response.ok) {
        throw new Error(
          `When saving affiliate settings, the response was [${response.status}] ${response.statusText}`
        );
      }
      const data = await response.json();
      // Update the product in the local list
      setListings((prev) =>
        prev.map((p) =>
          p.id === affiliateProduct.id
            ? {
                ...p,
                creator_promotion_enabled: data.product.creator_promotion_enabled,
                affiliate_commission_rate: data.product.affiliate_commission_rate,
              }
            : p
        )
      );
      setAffiliateProduct(null);
    } catch (error) {
      console.error('Failed to save affiliate settings:', error);
      Alert.alert('Error', 'Could not save affiliate settings. Please try again.');
    } finally {
      setSavingAffiliate(false);
    }
  };

  // NEW: Tabs
  const tabs = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  if (!isAuthenticated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StatusBar style={colors.statusBar} />
        <Text style={{ color: colors.text, fontSize: 18, marginBottom: 20 }}>
          Please sign in to continue
        </Text>
        <TouchableOpacity
          onPress={() => signIn()}
          style={{
            backgroundColor: colors.text,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: colors.background,
              fontSize: 16,
              fontWeight: '700',
            }}
          >
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StatusBar style={colors.statusBar} />
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  const isApproved = businessCenter?.verification_status === 'approved';
  const totalEarnings = earnings?.total_pending || 0;
  const availableNow = earnings?.available_now || 0;
  const inEscrow = earnings?.in_escrow || 0;

  // Get seller's currency from business center
  const sellerCurrency = businessCenter?.default_currency || 'GHS';

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
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
              {businessCenter?.center_type === 'foodhub' ? 'FoodHub Dashboard' : 'Seller Center'}
            </Text>
          </View>
          {isApproved && (
            <TouchableOpacity
              onPress={() => router.push('/create-listing')}
              style={{
                backgroundColor: colors.text,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={18} color={colors.background} />
              <Text
                style={{
                  color: colors.background,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                New
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* NEW: Tabs */}
      {isApproved && (
        <View
          style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 16,
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setSelectedTab(tab.id)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 14,
                  borderBottomWidth: 2,
                  borderColor: isActive ? colors.text : 'transparent',
                }}
              >
                <Icon size={18} color={isActive ? colors.text : colors.textTertiary} />
                <Text
                  style={{
                    color: isActive ? colors.text : colors.textTertiary,
                    fontSize: 14,
                    fontWeight: isActive ? '700' : '500',
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        {/* Verification Status Banner */}
        {!isApproved && (
          <View
            style={{
              margin: 16,
              padding: 16,
              borderRadius: 12,
              backgroundColor:
                businessCenter?.verification_status === 'pending'
                  ? 'rgba(255, 184, 0, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
              borderWidth: 1,
              borderColor:
                businessCenter?.verification_status === 'pending'
                  ? 'rgba(255, 184, 0, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {businessCenter?.verification_status === 'pending' ? (
              <Clock size={24} color="#FFB800" />
            ) : (
              <AlertCircle size={24} color={colors.error} />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: '700',
                  marginBottom: 4,
                }}
              >
                {businessCenter?.verification_status === 'pending'
                  ? 'Under Review'
                  : 'Application Declined'}
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>
                {businessCenter?.verification_status === 'pending'
                  ? "We're reviewing your application (24 to 48 hours)"
                  : 'Contact support for more details'}
              </Text>
            </View>
          </View>
        )}

        {/* Products Tab - NEW */}
        {isApproved && selectedTab === 'products' && (
          <View style={{ padding: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: '700',
                }}
              >
                Product Management
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                }}
              >
                {listings.length} total
              </Text>
            </View>

            {listings.length === 0 ? (
              <View
                style={{
                  paddingVertical: 60,
                  alignItems: 'center',
                }}
              >
                <Package size={48} color={colors.textTertiary} />
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 16,
                    marginTop: 16,
                  }}
                >
                  No products yet
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/create-listing')}
                  style={{
                    marginTop: 16,
                    backgroundColor: colors.text,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      color: colors.background,
                      fontSize: 14,
                      fontWeight: '600',
                    }}
                  >
                    Create First Product
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {listings.map((product) => {
                  const media = Array.isArray(product.media)
                    ? product.media
                    : JSON.parse(product.media || '[]');
                  const image = media[0] || `https://picsum.photos/400/400?random=${product.id}`;

                  return (
                    <View
                      key={product.id}
                      style={{
                        width: PRODUCT_WIDTH,
                        backgroundColor: colors.cardBackground,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Product Image */}
                      <View style={{ position: 'relative' }}>
                        <Image
                          source={{ uri: image }}
                          style={{
                            width: PRODUCT_WIDTH,
                            height: PRODUCT_WIDTH,
                          }}
                          contentFit="cover"
                        />
                        {/* Edit Button */}
                        <TouchableOpacity
                          onPress={() => handleEditProduct(product)}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Edit size={16} color={colors.text} />
                        </TouchableOpacity>
                        {/* Delete Button */}
                        <TouchableOpacity
                          onPress={() => handleDeleteProduct(product)}
                          style={{
                            position: 'absolute',
                            top: 44,
                            right: 6,
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: colors.background,
                            borderWidth: 1,
                            borderColor: 'rgba(239, 68, 68, 0.4)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={15} color="#EF4444" />
                        </TouchableOpacity>
                        {/* Status Badge */}
                        {product.status === 'sold_out' && (
                          <View
                            style={{
                              position: 'absolute',
                              bottom: 6,
                              left: 6,
                              backgroundColor: colors.textTertiary,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                            }}
                          >
                            <Text
                              style={{
                                color: colors.background,
                                fontSize: 10,
                                fontWeight: '700',
                              }}
                            >
                              OUT OF STOCK
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Product Info */}
                      <View style={{ padding: 10 }}>
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 13,
                            fontWeight: '600',
                          }}
                          numberOfLines={2}
                        >
                          {product.title}
                        </Text>
                        <CurrencyPrice
                          price={parseFloat(product.price)}
                          originalCurrency={sellerCurrency}
                          size="small"
                          textStyle={{
                            color: colors.text,
                            fontSize: 16,
                            fontWeight: '700',
                            marginTop: 4,
                          }}
                        />
                        {product.stock_quantity !== null && (
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            Stock: {product.stock_quantity}
                          </Text>
                        )}

                        {/* Affiliate control (TikTok Seller Center style) */}
                        <TouchableOpacity
                          onPress={() => openAffiliateSettings(product)}
                          style={{
                            marginTop: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            borderRadius: 8,
                            alignSelf: 'flex-start',
                            backgroundColor:
                              product.creator_promotion_enabled === true
                                ? 'rgba(212, 175, 55, 0.15)'
                                : colors.cardBackgroundAlt,
                            borderWidth: 1,
                            borderColor:
                              product.creator_promotion_enabled === true
                                ? 'rgba(212, 175, 55, 0.4)'
                                : colors.border,
                          }}
                        >
                          <Megaphone
                            size={12}
                            color={
                              product.creator_promotion_enabled === true
                                ? '#D4AF37'
                                : colors.textTertiary
                            }
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color:
                                product.creator_promotion_enabled === true
                                  ? '#D4AF37'
                                  : colors.textTertiary,
                            }}
                          >
                            {product.creator_promotion_enabled === true
                              ? `Affiliate ${parseFloat(product.affiliate_commission_rate) || 5}%`
                              : 'Affiliate off'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Orders Tab */}
        {isApproved && selectedTab === 'orders' && (
          <View style={{ padding: 16 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
                marginBottom: 16,
              }}
            >
              Recent Orders
            </Text>
            {orders.length === 0 ? (
              <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                <ShoppingBag size={48} color={colors.textTertiary} />
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 16,
                    marginTop: 16,
                  }}
                >
                  No orders yet
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {orders.slice(0, 10).map((order) => (
                  <TouchableOpacity
                    key={order.id}
                    onPress={() => router.push(`/order-details?id=${order.id}`)}
                    style={{
                      backgroundColor: colors.cardBackground,
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 15,
                          fontWeight: '700',
                        }}
                      >
                        {order.order_number}
                      </Text>
                      <CurrencyPrice
                        price={parseFloat(order.total_amount)}
                        originalCurrency={order.seller_currency || sellerCurrency}
                        size="small"
                        textStyle={{
                          color: colors.text,
                          fontSize: 15,
                          fontWeight: '700',
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 13,
                      }}
                    >
                      {order.item_title} | Qty: {order.quantity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Analytics Tab */}
        {isApproved && selectedTab === 'analytics' && (
          <View style={{ padding: 16 }}>
            {/* Earnings Card */}
            <View
              style={{
                backgroundColor: colors.cardBackgroundAlt,
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 24,
              }}
            >
              {/* Total Earnings */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 13,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  TOTAL EARNINGS
                </Text>
                <CurrencyPrice
                  price={totalEarnings}
                  originalCurrency={sellerCurrency}
                  size="xlarge"
                  textStyle={{
                    color: colors.text,
                    fontSize: 36,
                    fontWeight: '700',
                    letterSpacing: -1,
                  }}
                />
              </View>

              {/* Earnings Breakdown */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                }}
              >
                {/* Available Now */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(212, 175, 55, 0.2)',
                  }}
                >
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 11,
                      marginBottom: 6,
                      textTransform: 'uppercase',
                    }}
                  >
                    AVAILABLE
                  </Text>
                  <CurrencyPrice
                    price={availableNow}
                    originalCurrency={sellerCurrency}
                    size="medium"
                    textStyle={{
                      color: '#D4AF37',
                      fontSize: 20,
                      fontWeight: '700',
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => router.push('/wallet')}
                    style={{
                      marginTop: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      backgroundColor: '#D4AF37',
                      borderRadius: 6,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      Withdraw
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* In Escrow */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(212, 175, 55, 0.06)',
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(212, 175, 55, 0.15)',
                  }}
                >
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 11,
                      marginBottom: 6,
                      textTransform: 'uppercase',
                    }}
                  >
                    IN ESCROW
                  </Text>
                  <CurrencyPrice
                    price={inEscrow}
                    originalCurrency={sellerCurrency}
                    size="medium"
                    textStyle={{
                      color: '#B8960F',
                      fontSize: 20,
                      fontWeight: '700',
                    }}
                  />
                  <Text
                    style={{
                      marginTop: 8,
                      color: colors.textTertiary,
                      fontSize: 11,
                    }}
                  >
                    Releasing soon
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Stats Grid */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 24,
              }}
            >
              <StatCard
                icon={Package}
                label="Products"
                value={listings.length.toString()}
                color="#D4AF37"
              />
              <StatCard
                icon={ShoppingBag}
                label="Orders"
                value={orders.length.toString()}
                color="#D4AF37"
              />
              <StatCard icon={Eye} label="Views" value="0" color="#D4AF37" />
              <StatCard icon={TrendingUp} label="Conversion" value="0%" color="#D4AF37" />
            </View>

            {/* Recent Orders Summary */}
            {orders.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: '700',
                    marginBottom: 12,
                  }}
                >
                  Sales Summary
                </Text>
                <View
                  style={{
                    backgroundColor: colors.cardBackgroundAlt,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: colors.textTertiary, fontSize: 14 }}>Total Orders</Text>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '700',
                      }}
                    >
                      {orders.length}
                    </Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: colors.border }} />
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: colors.textTertiary, fontSize: 14 }}>Total Revenue</Text>
                    <CurrencyPrice
                      price={orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)}
                      originalCurrency={sellerCurrency}
                      size="small"
                      textStyle={{
                        color: '#D4AF37',
                        fontSize: 14,
                        fontWeight: '700',
                      }}
                    />
                  </View>
                  <View style={{ height: 1, backgroundColor: colors.border }} />
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: colors.textTertiary, fontSize: 14 }}>
                      Avg Order Value
                    </Text>
                    <CurrencyPrice
                      price={
                        orders.length > 0
                          ? orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0) /
                            orders.length
                          : 0
                      }
                      originalCurrency={sellerCurrency}
                      size="small"
                      textStyle={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '700',
                      }}
                    />
                  </View>
                  <View style={{ height: 1, backgroundColor: colors.border }} />
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: colors.textTertiary, fontSize: 14 }}>Completed</Text>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '700',
                      }}
                    >
                      {
                        orders.filter((o) => o.status === 'completed' || o.status === 'delivered')
                          .length
                      }
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Manage Section */}
            <View>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: '700',
                  marginBottom: 12,
                }}
              >
                Manage
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/delivery-zones')}
                style={{
                  backgroundColor: colors.cardBackgroundAlt,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MapPin size={20} color="#D4AF37" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  >
                    Delivery Zones
                  </Text>
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    Set regions, cities & fees
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/fulfillment-settings')}
                style={{
                  backgroundColor: colors.cardBackgroundAlt,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Truck size={20} color="#D4AF37" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  >
                    Delivery & pickup
                  </Text>
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    Set regions, cities & fees
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/store-location')}
                style={{
                  backgroundColor: colors.cardBackgroundAlt,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Store size={20} color="#D4AF37" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  >
                    Store location
                  </Text>
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    Set regions, cities & fees
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/deliverer-requests')}
                style={{
                  backgroundColor: colors.cardBackgroundAlt,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users size={20} color="#D4AF37" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  >
                    Deliverer Requests
                  </Text>
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    Accept or decline deliverers
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Affiliate Settings Modal (TikTok Seller Center style) */}
      <Modal
        visible={!!affiliateProduct}
        transparent
        animationType="slide"
        onRequestClose={() => setAffiliateProduct(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: insets.bottom + 24,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
                Affiliate Marketing
              </Text>
              <TouchableOpacity onPress={() => setAffiliateProduct(null)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                marginBottom: 16,
              }}
              numberOfLines={2}
            >
              {affiliateProduct?.title}
            </Text>

            {/* Enable toggle */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.cardBackgroundAlt,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                  Open to creators
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  Creators can tag this product in their videos and earn a commission on sales they
                  drive
                </Text>
              </View>
              <Switch
                value={affiliateEnabled}
                onValueChange={setAffiliateEnabled}
                trackColor={{ false: colors.border, true: '#D4AF37' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Commission rate picker */}
            {affiliateEnabled && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: '600',
                    marginBottom: 10,
                  }}
                >
                  Commission per sale
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {COMMISSION_OPTIONS.map((rate) => {
                    const isSelected = affiliateRate === rate;
                    return (
                      <TouchableOpacity
                        key={rate}
                        onPress={() => setAffiliateRate(rate)}
                        style={{
                          paddingHorizontal: 18,
                          paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor: isSelected ? '#D4AF37' : colors.cardBackgroundAlt,
                          borderWidth: 1,
                          borderColor: isSelected ? '#D4AF37' : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? '#FFFFFF' : colors.text,
                            fontSize: 14,
                            fontWeight: '700',
                          }}
                        >
                          {rate}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 12,
                    marginTop: 10,
                  }}
                >
                  Creators earn {affiliateRate}% of each sale they drive. This comes out of your
                  payout for that sale only.
                </Text>
              </View>
            )}

            {/* Save button */}
            <TouchableOpacity
              onPress={saveAffiliateSettings}
              disabled={savingAffiliate}
              style={{
                backgroundColor: '#D4AF37',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                opacity: savingAffiliate ? 0.6 : 1,
              }}
            >
              {savingAffiliate ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                  Save Settings
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: (SCREEN_WIDTH - 48) / 2 - 6,
        backgroundColor: colors.cardBackgroundAlt,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Icon size={20} color={color} style={{ marginBottom: 12 }} />
      <Text
        style={{
          color: colors.text,
          fontSize: 24,
          fontWeight: '700',
          marginBottom: 4,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.textTertiary,
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
