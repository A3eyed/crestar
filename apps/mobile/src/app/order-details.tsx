// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  AppState,
  Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Package,
  MapPin,
  Truck,
  Shield,
  CheckCircle2,
  Clock,
  MessageCircle,
  ChevronRight,
  CircleCheck,
  AlertCircle,
  CreditCard,
  Phone,
  User,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import useUser from "../utils/auth/useUser";
import useLocalization from "../utils/localization";
import useCartStore from "../utils/cartStore";
import { useTheme } from "../utils/theme";
import { authenticatedFetch } from "../utils/authenticatedFetch";
import CurrencyPrice from "../components/CurrencyPrice";

const STATUS_CONFIG = {
  pending_payment: { label: "Awaiting Payment", color: "#F59E0B", icon: Clock },
  paid: { label: "Payment Confirmed", color: "#D4AF37", icon: CheckCircle2 },
  preparing: { label: "Preparing Order", color: "#D4AF37", icon: Package },
  ready_for_pickup: {
    label: "Ready for Pickup",
    color: "#D4AF37",
    icon: Truck,
  },
  in_transit: { label: "On the Way", color: "#F97316", icon: Truck },
  delivered: { label: "Delivered", color: "#D4AF37", icon: CheckCircle2 },
  completed: { label: "Completed", color: "#D4AF37", icon: CircleCheck },
  cancelled: { label: "Cancelled", color: "#EF4444", icon: AlertCircle },
  refunded: { label: "Refunded", color: "#6B7280", icon: AlertCircle },
};

export default function OrderDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { data: user } = useUser();
  const { formatCurrency } = useLocalization();
  const colors = useTheme();
  const { clearCart, clearBuyNowItem } = useCartStore();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const verifiedRef = useRef(false);
  const [pin, setPin] = useState("");
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    const orderId = params.orderId || params.id;
    if (orderId) {
      fetchOrder(orderId);
    } else {
      setLoading(false);
    }
  }, [params.orderId, params.id]);

  const fetchOrder = async (orderId) => {
    try {
      const response = await authenticatedFetch(
        `/api/orders/list?orderId=${orderId}`
      );
      if (response.ok) {
        const data = await response.json();
        const foundOrder =
          data.order || (data.orders && data.orders[0]) || null;
        setOrder(foundOrder);
      } else {
        setOrder(null);
      }
    } catch (error) {
      console.error("Failed to fetch order:", error);
      setOrder(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const verifyPayment = useCallback(async () => {
    const reference = params.paymentReference;
    if (!reference || verifiedRef.current) return;
    try {
      setVerifyingPayment(true);
      const response = await authenticatedFetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success || data.status === "success") {
          verifiedRef.current = true;
          if (params.buyNow === "1") {
            clearBuyNowItem();
          } else {
            await clearCart();
          }
          const orderId = params.orderId || params.id;
          if (orderId) {
            fetchOrder(orderId);
          }
        }
      }
    } catch (e) {
      console.error("Payment verification error:", e);
    } finally {
      setVerifyingPayment(false);
    }
  }, [params.paymentReference, params.orderId, params.id, clearBuyNowItem]);

  useFocusEffect(
    useCallback(() => {
      verifyPayment();
    }, [verifyPayment])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") verifyPayment();
    });
    return () => sub.remove();
  }, [verifyPayment]);

  const handleConfirmWithPin = async () => {
    if (!pin || pin.length < 4) {
      setPinError("Please enter the 4-digit delivery PIN");
      return;
    }
    setPinError("");
    setConfirmingDelivery(true);
    try {
      const response = await authenticatedFetch(
        "/api/orders/confirm-delivery",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            deliveryPin: pin,
            method: "pin",
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        if (data.error === "Invalid delivery PIN") {
          setPinError("Wrong PIN. Check the package from your seller.");
        } else {
          setPinError(data.error || "Failed to confirm delivery");
        }
        return;
      }
      Alert.alert(
        "Delivery Confirmed!",
        data.message || "Payment has been released to the seller.",
        [
          {
            text: "OK",
            onPress: () => {
              setPin("");
              setOrder((prev) => ({ ...prev, status: "completed" }));
              fetchOrder(order.id);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Confirm delivery error:", error);
      setPinError("Something went wrong. Try again.");
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const handleConfirmWithoutPin = async () => {
    Alert.alert(
      "Confirm Delivery",
      "Are you sure you have received your order? This will release payment to the seller.",
      [
        { text: "Not Yet", style: "cancel" },
        {
          text: "Yes, I Received It",
          style: "default",
          onPress: async () => {
            setConfirmingDelivery(true);
            try {
              const response = await authenticatedFetch(
                "/api/orders/confirm-delivery",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orderId: order.id,
                    method: "buyer_confirm",
                  }),
                }
              );
              const data = await response.json();
              if (!response.ok) {
                Alert.alert("Error", data.error || "Failed to confirm");
                return;
              }
              Alert.alert(
                "Delivery Confirmed!",
                data.message || "Payment has been released to the seller.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      setOrder((prev) => ({ ...prev, status: "completed" }));
                      fetchOrder(order.id);
                    },
                  },
                ]
              );
            } catch (error) {
              Alert.alert("Error", "Something went wrong. Try again.");
            } finally {
              setConfirmingDelivery(false);
            }
          },
        },
      ]
    );
  };

  const handleMessageSeller = () => {
    if (order?.seller_id) {
      router.push({
        pathname: "/chat",
        params: {
          partnerId: order.seller_id,
          partnerName: order.sellerName || "Seller",
          partnerType: "seller",
        },
      });
    }
  };

  const handleMessageBuyer = () => {
    if (order?.buyer_id) {
      router.push({
        pathname: "/chat",
        params: {
          partnerId: order.buyer_id,
          partnerName: order.buyer_name || "Buyer",
          partnerType: "buyer",
        },
      });
    }
  };

  const handleCallBuyer = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {});
    }
  };

  const handleCompletePayment = async () => {
    try {
      setVerifyingPayment(true);
      const response = await authenticatedFetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await response.json();
      if (response.ok && data.paymentUrl) {
        await Linking.openURL(data.paymentUrl);
      } else {
        Alert.alert(
          "Error",
          data.error || "Could not open the payment page. Please try again."
        );
      }
    } catch (e) {
      Alert.alert(
        "Error",
        "Could not open the payment page. Please try again."
      );
    } finally {
      setVerifyingPayment(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StatusBar style={colors.statusBar} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!order) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 40,
        }}
      >
        <StatusBar style={colors.statusBar} />
        <Package size={48} color={colors.textTertiary} />
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 16,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          Order not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 24 }}
        >
          <Text
            style={{ color: colors.accent, fontSize: 16, fontWeight: "600" }}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusConfig =
    STATUS_CONFIG[order.status] || STATUS_CONFIG.pending_payment;
  const StatusIcon = statusConfig.icon;
  const viewerId = user?.id ? user.id.toString() : null;
  const isSeller = !!viewerId && order.seller_id?.toString() === viewerId;
  const isBuyer = !isSeller;
  const isSelfFulfillment = !order.deliverer_id;
  const canConfirmDelivery =
    isBuyer &&
    (order.status === "in_transit" ||
      order.status === "ready_for_pickup" ||
      order.status === "paid" ||
      order.status === "preparing");
  const isAwaitingPayment = order.status === "pending_payment";
  const isCompleted =
    order.status === "delivered" || order.status === "completed";
  const shouldShowBuyerPin =
    isBuyer &&
    (order.status === "paid" ||
      order.status === "preparing" ||
      order.status === "ready_for_pickup" ||
      order.status === "in_transit");
  const showBuyerDeliveryDetails =
    isSeller &&
    [
      "paid",
      "preparing",
      "ready_for_pickup",
      "in_transit",
      "delivered",
      "completed",
    ].includes(order.status);

  let deliveryAddr = "";
  let addrDetails = null;
  try {
    if (order.delivery_address) {
      const addrObj =
        typeof order.delivery_address === "string"
          ? JSON.parse(order.delivery_address)
          : order.delivery_address;
      if (addrObj && typeof addrObj === "object") {
        addrDetails = addrObj;
        deliveryAddr = addrObj.address || "";
      } else {
        deliveryAddr = String(addrObj || "");
      }
    }
  } catch (e) {
    console.error("Failed to parse delivery address:", e);
    deliveryAddr =
      typeof order.delivery_address === "string" ? order.delivery_address : "";
  }
  const buyerPhone = addrDetails?.phone || order.buyer_phone || null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: "700",
            flex: 1,
          }}
        >
          Order Details
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              if (order?.id) {
                setRefreshing(true);
                fetchOrder(order.id);
              }
            }}
            tintColor={colors.accent}
          />
        }
      >
        <View style={{ margin: 20, overflow: "hidden", borderRadius: 16 }}>
          <BlurView
            intensity={40}
            tint={colors.glass.tint}
            style={{
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: `${statusConfig.color}20`,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <StatusIcon size={28} color={statusConfig.color} />
            </View>
            <Text
              style={{
                color: statusConfig.color,
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              {statusConfig.label}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                textAlign: "center",
              }}
            >
              Order #{order.orderNumber || order.order_number}
            </Text>
            {order.created_at && (
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {new Date(order.created_at).toLocaleDateString([], {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            )}
          </BlurView>
        </View>

        {isAwaitingPayment && (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View
              style={{
                borderRadius: 16,
                backgroundColor: "rgba(245, 158, 11, 0.08)",
                borderWidth: 1,
                borderColor: "rgba(245, 158, 11, 0.35)",
                padding: 20,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: 6,
                }}
              >
                Payment not completed
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  lineHeight: 19,
                  marginBottom: 16,
                }}
              >
                Your items are still saved in your cart. Complete the payment to
                activate this order. The seller only sees it after payment.
              </Text>
              <TouchableOpacity
                onPress={handleCompletePayment}
                disabled={verifyingPayment}
                style={{
                  backgroundColor: "#F59E0B",
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  opacity: verifyingPayment ? 0.6 : 1,
                }}
              >
                {verifyingPayment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CreditCard size={18} color="#FFFFFF" />
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 15,
                        fontWeight: "700",
                      }}
                    >
                      Complete Payment
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {shouldShowBuyerPin && order.deliveryPin && (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View
              style={{
                overflow: "hidden",
                borderRadius: 16,
                backgroundColor: "rgba(212, 175, 55, 0.05)",
                borderWidth: 2,
                borderColor: colors.accent,
              }}
            >
              <View style={{ padding: 24, alignItems: "center" }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "rgba(212, 175, 55, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Shield size={32} color={colors.accent} />
                </View>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "700",
                    marginBottom: 8,
                  }}
                >
                  Your Delivery PIN
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    textAlign: "center",
                    marginBottom: 20,
                    lineHeight: 19,
                    paddingHorizontal: 10,
                  }}
                >
                  Show this PIN to the deliverer only after you have inspected
                  and received your items.
                </Text>
                <View
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 16,
                    paddingVertical: 20,
                    paddingHorizontal: 40,
                    borderWidth: 2,
                    borderColor: colors.accent,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      color: colors.accent,
                      fontSize: 48,
                      fontWeight: "700",
                      letterSpacing: 12,
                      textAlign: "center",
                    }}
                  >
                    {order.deliveryPin}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: "rgba(255, 184, 0, 0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 184, 0, 0.3)",
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <AlertCircle size={18} color="#FFB800" />
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      flex: 1,
                      lineHeight: 17,
                    }}
                  >
                    Only share this PIN with the deliverer after inspecting your
                    order. This releases payment from escrow.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {showBuyerDeliveryDetails && (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <MapPin size={18} color={colors.text} />
              <Text
                style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}
              >
                Buyer Delivery Details
              </Text>
            </View>
            <View style={{ overflow: "hidden", borderRadius: 12 }}>
              <BlurView
                intensity={40}
                tint={colors.glass.tint}
                style={{
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "rgba(212, 175, 55, 0.35)",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <User size={16} color={colors.accent} />
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: "600",
                      flex: 1,
                    }}
                  >
                    {order.buyer_name || "Buyer"}
                  </Text>
                </View>
                {buyerPhone ? (
                  <TouchableOpacity
                    onPress={() => handleCallBuyer(buyerPhone)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <Phone size={16} color={colors.accent} />
                    <Text
                      style={{
                        color: colors.accent,
                        fontSize: 14,
                        fontWeight: "600",
                        textDecorationLine: "underline",
                      }}
                    >
                      {buyerPhone}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {deliveryAddr ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 10,
                      marginBottom:
                        addrDetails?.city || addrDetails?.landmark ? 10 : 0,
                    }}
                  >
                    <MapPin
                      size={16}
                      color={colors.accent}
                      style={{ marginTop: 2 }}
                    />
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        lineHeight: 20,
                        flex: 1,
                      }}
                    >
                      {deliveryAddr}
                    </Text>
                  </View>
                ) : null}
                {addrDetails?.city || addrDetails?.region ? (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginBottom: 6,
                      marginLeft: 26,
                    }}
                  >
                    {[addrDetails.city, addrDetails.region]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                ) : null}
                {addrDetails?.landmark ? (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginBottom: 6,
                      marginLeft: 26,
                    }}
                  >
                    Landmark: {addrDetails.landmark}
                  </Text>
                ) : null}
                {addrDetails?.notes ? (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginBottom: 6,
                      marginLeft: 26,
                    }}
                  >
                    Notes: {addrDetails.notes}
                  </Text>
                ) : null}
                {isSelfFulfillment && (
                  <View
                    style={{
                      marginTop: 12,
                      backgroundColor: "rgba(212, 175, 55, 0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(212, 175, 55, 0.3)",
                      borderRadius: 10,
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Truck size={16} color={colors.accent} />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                        flex: 1,
                        lineHeight: 17,
                      }}
                    >
                      No deliverer is assigned. You are handling this delivery
                      yourself. Ask the buyer for their 4-digit PIN on arrival
                      to confirm delivery.
                    </Text>
                  </View>
                )}
              </BlurView>
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Package size={18} color={colors.text} />
            <Text
              style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}
            >
              Items Ordered
            </Text>
          </View>
          <View
            style={{ overflow: "hidden", borderRadius: 12, marginBottom: 20 }}
          >
            <BlurView
              intensity={40}
              tint={colors.glass.tint}
              style={{
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                {order.item_title || order.itemTitle || "Order"}
              </Text>
              {order.items &&
                order.items.map((itemDesc, i) => (
                  <Text
                    key={i}
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      marginBottom: 4,
                    }}
                  >
                    • {itemDesc}
                  </Text>
                ))}
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  marginVertical: 12,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                  Subtotal
                </Text>
                <CurrencyPrice
                  price={order.subtotal || order.total || 0}
                  originalCurrency={order.seller_currency || "GHS"}
                  size="small"
                  textStyle={{
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                />
              </View>
              {order.delivery_fee > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                    Delivery Fee
                  </Text>
                  <CurrencyPrice
                    price={order.delivery_fee}
                    originalCurrency={order.seller_currency || "GHS"}
                    size="small"
                    textStyle={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  />
                </View>
              )}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  Total
                </Text>
                <CurrencyPrice
                  price={order.total_amount || order.total || 0}
                  originalCurrency={order.seller_currency || "GHS"}
                  size="medium"
                  textStyle={{
                    color: colors.accent,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                />
              </View>
            </BlurView>
          </View>
        </View>

        {deliveryAddr ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <MapPin size={18} color={colors.text} />
              <Text
                style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}
              >
                Delivery Address
              </Text>
            </View>
            <View style={{ overflow: "hidden", borderRadius: 12 }}>
              <BlurView
                intensity={40}
                tint={colors.glass.tint}
                style={{
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}
                >
                  {typeof deliveryAddr === "object"
                    ? JSON.stringify(deliveryAddr)
                    : deliveryAddr}
                </Text>
              </BlurView>
            </View>
          </View>
        ) : null}

        {canConfirmDelivery && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <CheckCircle2 size={18} color={colors.text} />
              <Text
                style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}
              >
                Confirm Delivery
              </Text>
            </View>
            <View
              style={{ overflow: "hidden", borderRadius: 12, marginBottom: 12 }}
            >
              <BlurView
                intensity={40}
                tint={colors.glass.tint}
                style={{
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    marginBottom: 10,
                    lineHeight: 17,
                  }}
                >
                  Enter the 4-digit confirmation PIN to release payment to the
                  seller.
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    value={pin}
                    onChangeText={(v) => {
                      setPin(v.replace(/[^0-9]/g, "").slice(0, 4));
                      if (pinError) setPinError("");
                    }}
                    placeholder="• • • •"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={{
                      flex: 1,
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: pinError ? "#EF4444" : colors.border,
                      borderRadius: 10,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      color: colors.text,
                      fontSize: 18,
                      fontWeight: "700",
                      letterSpacing: 8,
                      textAlign: "center",
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleConfirmWithPin}
                    disabled={confirmingDelivery || pin.length < 4}
                    style={{
                      backgroundColor: "#D4AF37",
                      borderRadius: 10,
                      paddingHorizontal: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: confirmingDelivery || pin.length < 4 ? 0.5 : 1,
                    }}
                  >
                    {confirmingDelivery ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Text
                        style={{
                          color: "#000000",
                          fontSize: 14,
                          fontWeight: "700",
                        }}
                      >
                        Confirm
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                {pinError ? (
                  <Text
                    style={{ color: "#EF4444", fontSize: 12, marginTop: 8 }}
                  >
                    {pinError}
                  </Text>
                ) : null}
              </BlurView>
            </View>
            <TouchableOpacity
              onPress={handleConfirmWithoutPin}
              disabled={confirmingDelivery}
              style={{ overflow: "hidden", borderRadius: 12 }}
            >
              <BlurView
                intensity={40}
                tint={colors.glass.tint}
                style={{
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "rgba(212, 175, 55, 0.3)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {confirmingDelivery ? (
                  <ActivityIndicator color="#D4AF37" />
                ) : (
                  <CircleCheck size={22} color="#D4AF37" />
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    I have received my order
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Tap to confirm delivery manually
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textTertiary} />
              </BlurView>
            </TouchableOpacity>
          </View>
        )}

        {isCompleted && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View style={{ overflow: "hidden", borderRadius: 12 }}>
              <BlurView
                intensity={40}
                tint={colors.glass.tint}
                style={{
                  padding: 20,
                  borderWidth: 1,
                  borderColor: "rgba(212, 175, 55, 0.3)",
                  alignItems: "center",
                }}
              >
                <CircleCheck size={40} color="#D4AF37" />
                <Text
                  style={{
                    color: "#D4AF37",
                    fontSize: 18,
                    fontWeight: "700",
                    marginTop: 12,
                  }}
                >
                  Order Complete
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  Payment has been released to the seller. Thank you for
                  shopping with Crestar!
                </Text>
              </BlurView>
            </View>
          </View>
        )}

        {isBuyer && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View style={{ overflow: "hidden", borderRadius: 12 }}>
              <BlurView
                intensity={40}
                tint={colors.glass.tint}
                style={{
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Shield size={22} color="#D4AF37" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: "600",
                      marginBottom: 2,
                    }}
                  >
                    Buyer Protection
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      lineHeight: 17,
                    }}
                  >
                    Your payment is held securely in escrow. Only share your
                    delivery PIN with the deliverer after inspecting your order.
                  </Text>
                </View>
              </BlurView>
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={isSeller ? handleMessageBuyer : handleMessageSeller}
            style={{ overflow: "hidden", borderRadius: 12 }}
          >
            <BlurView
              intensity={40}
              tint={colors.glass.tint}
              style={{
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <MessageCircle size={22} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {isSeller ? "Message Buyer" : "Message Seller"}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {isSeller
                    ? "Update the buyer on their delivery"
                    : "Ask about your order status or delivery"}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textTertiary} />
            </BlurView>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}