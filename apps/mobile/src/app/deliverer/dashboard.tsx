// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ArrowLeft,
  Package,
  DollarSign,
  MapPin,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Navigation,
  Phone,
  Store,
  QrCode,
  Tag,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import useAuth from '../../utils/auth/useAuth';
import useLocalization from '../../utils/localization';
import GlassButton from '../../components/GlassButton';
import { useTheme } from '../../utils/theme';
import { authenticatedFetch } from '../../utils/authenticatedFetch';
import CurrencyPrice from '../../components/CurrencyPrice';

export default function DelivererDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, isReady, signIn } = useAuth();
  const { formatCurrency } = useLocalization();
  const colors = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [earningsVisible, setEarningsVisible] = useState(true);
  const [businessCenter, setBusinessCenter] = useState(null);

  const [earnings, setEarnings] = useState({ today: 0, week: 0, total: 0 });
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [availableAssignments, setAvailableAssignments] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);

  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [deliveryPin, setDeliveryPin] = useState('');

  // QR code delivery confirmation
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // One-shot guard: never redirect away more than once per mount
  const hasRedirectedRef = useRef(false);

  const deliveryCurrency = businessCenter?.default_currency || 'GHS';

  const fetchData = async () => {
    try {
      // Check business center status first
      const centerResponse = await authenticatedFetch('/api/business-centers');
      if (centerResponse.ok) {
        const centerData = await centerResponse.json();

        // Check if user has a deliverer business center
        if (centerData.has_center) {
          const center = centerData.center;

          // Ensure it's a deliverer type
          if (center.center_type === 'deliverer') {
            setBusinessCenter(center);
          } else if (!hasRedirectedRef.current) {
            // Wrong type - redirect to monetization center (once)
            hasRedirectedRef.current = true;
            router.replace('/monetization-center');
            return;
          }
        } else if (!hasRedirectedRef.current) {
          // No business center - redirect to monetization center (once)
          hasRedirectedRef.current = true;
          router.replace('/monetization-center');
          return;
        }
      }
      // NOTE: if the check fails (401/5xx/network), we stay on the dashboard —
      // redirecting on failure creates a redirect loop with monetization-center.

      const response = await authenticatedFetch('/api/deliverers/assignments');
      if (response.ok) {
        const data = await response.json();
        setActiveAssignments(data.activeAssignments || []);
        setAvailableAssignments(data.availableAssignments || []);
        setCompletedDeliveries(data.completedDeliveries || []);
        setEarnings(data.earnings || { today: 0, week: 0, total: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading — isAuthenticated is null while loading,
    // and treating that as "signed out" pops the sign-in modal for users who
    // ARE signed in.
    if (!isReady) {
      return;
    }
    if (!isAuthenticated) {
      signIn();
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isAuthenticated]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAcceptAssignment = async (assignmentId) => {
    try {
      const response = await authenticatedFetch('/api/deliverers/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Assignment accepted!');
        fetchData();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept assignment');
    }
  };

  const handleConfirmDelivery = async (pinOverride) => {
    const pin = typeof pinOverride === 'string' ? pinOverride : deliveryPin;

    if (!selectedAssignment?.id) {
      Alert.alert('Error', 'No assignment selected');
      return;
    }
    if (!pin || pin.length !== 4) {
      Alert.alert('Error', 'Please enter a valid 4-digit PIN');
      return;
    }

    try {
      const response = await authenticatedFetch('/api/deliverers/confirm-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          deliveryPin: pin,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowPinModal(false);
        setShowScanner(false);
        setDeliveryPin('');
        setSelectedAssignment(null);
        Alert.alert('🎉 Delivery Confirmed!', data.message);
        fetchData();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm delivery');
    }
  };

  // Open the QR scanner (requests camera permission if needed)
  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Access Needed',
          "Allow camera access to scan the buyer's delivery QR code, or enter the PIN manually."
        );
        return;
      }
    }
    setScanned(false);
    setShowScanner(true);
  };

  // Handle a scanned QR code — supports the Crestar delivery QR payload
  // and plain 4-digit PIN QR codes
  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);

    let pin = null;
    try {
      const parsed = JSON.parse(data);
      if (parsed && parsed.t === 'crestar_delivery' && parsed.pin) {
        pin = String(parsed.pin);
      }
    } catch {
      // Not JSON — check for a plain 4-digit PIN
      if (/^\d{4}$/.test(String(data).trim())) {
        pin = String(data).trim();
      }
    }

    if (pin && /^\d{4}$/.test(pin)) {
      setDeliveryPin(pin);
      setShowScanner(false);
      // Auto-confirm with the scanned PIN
      handleConfirmDelivery(pin);
    } else {
      Alert.alert(
        'Invalid QR Code',
        "This doesn't look like a Crestar delivery QR code. Ask the buyer to open their order details.",
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
      );
    }
  };

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
      </View>
    );
  }

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
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
              Deliverer Dashboard
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
              {isAvailable ? 'Available' : 'Offline'}
            </Text>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: colors.inputBackground, true: '#D4AF37' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 16,
          paddingTop: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Earnings Card — always dark (financial card pattern) ── */}
        <View
          style={{
            borderRadius: 24,
            marginBottom: 16,
            backgroundColor: '#111111',
            padding: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 14,
                fontWeight: '500',
              }}
            >
              Total Earnings
            </Text>
            <TouchableOpacity onPress={() => setEarningsVisible(!earningsVisible)}>
              {earningsVisible ? (
                <Eye size={20} color="rgba(255, 255, 255, 0.6)" />
              ) : (
                <EyeOff size={20} color="rgba(255, 255, 255, 0.6)" />
              )}
            </TouchableOpacity>
          </View>

          {earningsVisible ? (
            <CurrencyPrice
              price={earnings.total}
              originalCurrency={deliveryCurrency}
              size="xlarge"
              textStyle={{
                color: '#FFFFFF',
                fontSize: 40,
                fontWeight: '700',
                marginBottom: 24,
              }}
              convertedStyle={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 15,
                marginTop: 4,
                marginBottom: 24,
              }}
            />
          ) : (
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 40,
                fontWeight: '700',
                marginBottom: 24,
              }}
            >
              ••••••
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                Today
              </Text>
              {earningsVisible ? (
                <CurrencyPrice
                  price={earnings.today}
                  originalCurrency={deliveryCurrency}
                  showOriginal={false}
                  size="medium"
                  textStyle={{
                    color: '#D4AF37',
                    fontSize: 20,
                    fontWeight: '700',
                  }}
                />
              ) : (
                <Text style={{ color: '#D4AF37', fontSize: 20, fontWeight: '700' }}>••••</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                This Week
              </Text>
              {earningsVisible ? (
                <CurrencyPrice
                  price={earnings.week}
                  originalCurrency={deliveryCurrency}
                  showOriginal={false}
                  size="medium"
                  textStyle={{
                    color: '#D4AF37',
                    fontSize: 20,
                    fontWeight: '700',
                  }}
                />
              ) : (
                <Text style={{ color: '#D4AF37', fontSize: 20, fontWeight: '700' }}>••••</Text>
              )}
            </View>
          </View>
        </View>

        {/* Immediately AFTER the earnings summary block (the card/section showing
    today / week / total earnings) and BEFORE the assignments list, insert this
    row. Match the surrounding card styling used elsewhere on this screen: */}
        <TouchableOpacity
          onPress={() => router.push('/deliverer/rates')}
          activeOpacity={0.8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginHorizontal: 20,
            marginBottom: 20,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.cardBackground,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
            }}
          >
            <Tag size={19} color="#D4AF37" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
              My delivery rates
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
              Set your own prices — buyers pick you at checkout
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* ── Find Sellers Button ── */}
        <TouchableOpacity
          onPress={() => router.push('/browse-sellers')}
          style={{
            backgroundColor: 'rgba(212, 175, 55, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.25)',
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#D4AF37',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Store size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
              Find Sellers
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                marginTop: 2,
              }}
            >
              Browse & request to deliver for sellers
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── Active Deliveries ── */}
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: '700',
            marginBottom: 12,
          }}
        >
          Active Deliveries ({activeAssignments.length})
        </Text>

        {activeAssignments.length === 0 ? (
          <View
            style={{
              borderRadius: 16,
              marginBottom: 24,
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 32,
              alignItems: 'center',
            }}
          >
            <Package size={40} color={colors.textTertiary} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                marginTop: 12,
                textAlign: 'center',
              }}
            >
              No active deliveries
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12, marginBottom: 24 }}>
            {activeAssignments.map((assignment) => (
              <View
                key={assignment.id}
                style={{
                  borderRadius: 16,
                  backgroundColor: colors.cardBackground,
                  borderWidth: 1,
                  borderColor: 'rgba(212,175,55,0.3)',
                  padding: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 16,
                      fontWeight: '700',
                    }}
                  >
                    Order #{assignment.order_number}
                  </Text>
                  <View
                    style={{
                      backgroundColor: 'rgba(212, 175, 55, 0.15)',
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(212,175,55,0.3)',
                    }}
                  >
                    <Text
                      style={{
                        color: '#D4AF37',
                        fontSize: 12,
                        fontWeight: '600',
                      }}
                    >
                      {assignment.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 14,
                    marginBottom: 12,
                  }}
                >
                  {assignment.item_title}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <MapPin size={16} color={colors.textTertiary} />
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      flex: 1,
                    }}
                  >
                    {assignment.delivery_address?.street || 'Delivery address'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.cardBackground,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Navigation size={16} color={colors.text} />
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                    >
                      Navigate
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedAssignment(assignment);
                      setShowPinModal(true);
                    }}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: '#D4AF37',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: 14,
                        fontWeight: '700',
                      }}
                    >
                      Confirm
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Available Deliveries ── */}
        {isAvailable && availableAssignments.length > 0 && (
          <>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
                marginBottom: 12,
              }}
            >
              Available Deliveries
            </Text>

            <View style={{ gap: 12, marginBottom: 24 }}>
              {availableAssignments.map((assignment) => (
                <View
                  key={assignment.id}
                  style={{
                    borderRadius: 16,
                    backgroundColor: colors.cardBackground,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 16,
                  }}
                >
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
                        color: colors.text,
                        fontSize: 15,
                        fontWeight: '600',
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      {assignment.item_title}
                    </Text>
                    <CurrencyPrice
                      price={assignment.net_delivery_fee ?? assignment.delivery_fee}
                      originalCurrency={assignment.delivery_currency || deliveryCurrency}
                      showOriginal={false}
                      size="small"
                      textStyle={{
                        color: '#D4AF37',
                        fontSize: 16,
                        fontWeight: '700',
                      }}
                    />
                  </View>

                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginBottom: 12,
                    }}
                  >
                    {assignment.distance_km}km away
                  </Text>

                  <GlassButton
                    title="Accept Delivery"
                    onPress={() => handleAcceptAssignment(assignment.id)}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Recent Completions ── */}
        {completedDeliveries.length > 0 && (
          <>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
                marginBottom: 12,
              }}
            >
              Recent Completions
            </Text>

            <View style={{ gap: 8 }}>
              {completedDeliveries.map((delivery) => (
                <View
                  key={delivery.id}
                  style={{
                    borderRadius: 12,
                    backgroundColor: colors.cardBackground,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '600',
                        marginBottom: 4,
                      }}
                    >
                      #{delivery.order_number}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Clock size={12} color={colors.textTertiary} />
                      <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                        {new Date(delivery.delivered_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                      style={{
                        color: '#D4AF37',
                        fontSize: 16,
                        fontWeight: '700',
                        marginRight: 2,
                      }}
                    >
                      +
                    </Text>
                    <CurrencyPrice
                      price={delivery.net_delivery_fee ?? delivery.delivery_fee}
                      originalCurrency={delivery.delivery_currency || deliveryCurrency}
                      showOriginal={false}
                      size="small"
                      textStyle={{
                        color: '#D4AF37',
                        fontSize: 16,
                        fontWeight: '700',
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── PIN Confirmation Modal — always dark by design ── */}
      {showPinModal && (
        <Modal visible animationType="slide" transparent>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              justifyContent: 'center',
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                borderRadius: 24,
                backgroundColor: '#1A1A1A',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.15)',
                padding: 24,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 24,
                  fontWeight: '700',
                  marginBottom: 8,
                  textAlign: 'center',
                }}
              >
                Confirm Delivery
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: 14,
                  marginBottom: 20,
                  textAlign: 'center',
                }}
              >
                Scan the buyer's QR code or enter their 4-digit delivery PIN
              </Text>

              {/* Scan QR button — primary confirmation method */}
              <TouchableOpacity
                onPress={handleOpenScanner}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(212, 175, 55, 0.4)',
                  marginBottom: 16,
                }}
              >
                <QrCode size={22} color="#D4AF37" />
                <Text style={{ color: '#D4AF37', fontSize: 16, fontWeight: '700' }}>
                  Scan Buyer's QR Code
                </Text>
              </TouchableOpacity>

              <Text
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 12,
                  textAlign: 'center',
                  marginBottom: 12,
                }}
              >
                — or enter PIN manually —
              </Text>

              <TextInput
                value={deliveryPin}
                onChangeText={setDeliveryPin}
                placeholder="••••"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                keyboardType="number-pad"
                maxLength={4}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  padding: 20,
                  color: '#FFFFFF',
                  fontSize: 32,
                  fontWeight: '700',
                  textAlign: 'center',
                  letterSpacing: 12,
                  marginBottom: 20,
                }}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowPinModal(false);
                    setDeliveryPin('');
                    setSelectedAssignment(null);
                  }}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleConfirmDelivery()}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: '#D4AF37',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontWeight: '700',
                    }}
                  >
                    Confirm
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── QR Scanner Modal ── */}
      {showScanner && (
        <Modal visible animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#000000' }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            {/* Scanner overlay */}
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 240,
                  height: 240,
                  borderRadius: 24,
                  borderWidth: 3,
                  borderColor: '#D4AF37',
                  backgroundColor: 'transparent',
                }}
              />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: '600',
                  marginTop: 20,
                  textAlign: 'center',
                  paddingHorizontal: 40,
                }}
              >
                Point the camera at the buyer's delivery QR code
              </Text>
            </View>

            {/* Close button */}
            <TouchableOpacity
              onPress={() => setShowScanner(false)}
              style={{
                position: 'absolute',
                top: insets.top + 12,
                right: 16,
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
}
