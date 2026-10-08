// @ts-nocheck
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MapPin, Package, Trash2, Shield, CheckCircle2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import useAuth from '../utils/auth/useAuth';
import useUser from '../utils/auth/useUser';
import useLocalization from '../utils/localization';
import useCartStore from '../utils/cartStore';
import { useTheme } from '../utils/theme';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import CurrencyPrice from '../components/CurrencyPrice';
import FulfillmentSection from '../components/Checkout/FulfillmentSection';
import useFulfillmentOptions from '../hooks/useFulfillmentOptions';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode } = useLocalSearchParams();
  const isBuyNow = mode === 'buynow';
  const { isAuthenticated, signIn } = useAuth();
  const { data: user } = useUser();
  const { formatCurrency } = useLocalization();
  const {
    items: cartItems,
    totalPrice: cartTotalPrice,
    clearCart,
    removeItem,
    buyNowItem,
    clearBuyNowItem,
  } = useCartStore();
  const colors = useTheme();

  // EXPRESS LANE: in buy-now mode, checkout operates on the single buy-now item only.
  const items = isBuyNow && buyNowItem ? [buyNowItem] : cartItems;
  const totalPrice =
    isBuyNow && buyNowItem
      ? (parseFloat(buyNowItem.price) || 0) * (buyNowItem.quantity || 1)
      : cartTotalPrice;

  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Delivery details
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [landmark, setLandmark] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Where the buyer is — this decides which of the seller's fees apply
  const [buyerLocation, setBuyerLocation] = useState({
    country: 'Ghana',
    region: '',
    city: '',
  });

  // Every way this cart can be fulfilled: store pickup (free), the seller's own
  // town fees, and on-demand riders who set their own price.
  const {
    sellerIds,
    optionsBySeller,
    selectionBySeller,
    sellerDeliveryFees,
    allSellersChosen,
    loading: loadingFees,
    error: fulfillmentError,
    selectOption,
    refetch: refetchFulfillment,
  } = useFulfillmentOptions(items, {
    ...buyerLocation,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
  });

  useEffect(() => {
    // In buy-now mode the item comes from memory; no need to load the persisted cart.
    if (!isBuyNow) {
      loadCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If buy-now mode was opened without an item (e.g. after app reload), go back.
  useEffect(() => {
    if (isBuyNow && !buyNowItem) {
      router.back();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBuyNow, buyNowItem]);

  const loadCart = async () => {
    try {
      await useCartStore.getState().loadCart();
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to use this feature');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCoordinates({ latitude, longitude });

      const address = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (address[0]) {
        const addr = address[0];
        const fullAddress = `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`;
        setDeliveryAddress(fullAddress.trim());
      }
      setLoading(false);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Could not get your location. Please enter manually.');
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!deliveryAddress || !phoneNumber) {
      Alert.alert('Missing Information', 'Please provide delivery address and phone number');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty');
      return;
    }

    try {
      setProcessingPayment(true);

      // Send the full cart to the checkout endpoint in a single request
      const response = await authenticatedFetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            seller: item.seller,
            sellerId: item.sellerId,
            seller_currency: item.seller_currency || 'GHS',
            type: item.type,
            originVideoId: item.originVideoId || null,
            originCreatorId: item.originCreatorId || null,
          })),
          deliveryAddress: deliveryAddress,
          recipientName: recipientName,
          phoneNumber: phoneNumber,
          landmark: landmark,
          latitude: coordinates?.latitude || null,
          longitude: coordinates?.longitude || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // NEW: self-healing cart — if the server says some items no longer
        // exist, remove ONLY those items and tell the user to retry.
        if (
          data?.unavailableItems &&
          Array.isArray(data.unavailableItems) &&
          data.unavailableItems.length > 0
        ) {
          if (isBuyNow) {
            clearBuyNowItem();
            Alert.alert('Item Unavailable', data.error || 'This item is no longer available.');
            router.back();
            return;
          }
          for (const bad of data.unavailableItems) {
            await removeItem(bad.cartKey || bad.id);
          }
          Alert.alert(
            'Cart Updated',
            data.error ||
              'Some items in your cart are no longer available and were removed. Please try again.'
          );
          // stop processing state (keep existing setLoading/setProcessingPayment(false) cleanup)
          return;
        }
        throw new Error(data.error || 'Failed to place order');
      }

      // ⚠️ Do NOT clear the cart here. TikTok behavior: items stay in the
      // cart until payment actually completes, so the buyer can resume the
      // purchase anytime if they abandon the payment page. The cart is
      // cleared by the order-details screen once payment is verified.

      if (data.paymentUrl) {
        // Open Paystack payment page
        await Linking.openURL(data.paymentUrl);
      }

      // Guard against missing orders array
      if (!data.orders || data.orders.length === 0) {
        Alert.alert('Order Placed', 'Your order has been placed successfully!');
        router.replace('/(tabs)/shop');
        return;
      }

      // Navigate to order details screen with the first order.
      // Pass the payment reference so it can verify payment on return
      // and clear the cart only after payment succeeds.
      const firstOrder = data.orders[0];
      router.replace({
        pathname: '/order-details',
        params: {
          orderId: firstOrder.id,
          paymentReference: data.reference || '',
          buyNow: isBuyNow ? '1' : '0',
        },
      });
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', error.message || 'Checkout failed. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

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
        {/* Close button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: 'absolute',
            top: insets.top + 16,
            left: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.inputBackground,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Shield size={56} color={colors.textTertiary} />
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
          Sign in to checkout
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
          You need to be signed in to place an order.
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

  // Calculate totals (simplified - no platform fee shown to user)
  const subtotal = totalPrice;

  // Sum delivery fees from all sellers
  const totalDeliveryFee = Object.values(sellerDeliveryFees).reduce(
    (sum, info) => sum + (info.fee || 0),
    0
  );

  const total = subtotal + totalDeliveryFee;

  // Get the primary currency from cart items (first item's currency)
  const primaryCurrency = items.length > 0 ? items[0]?.seller_currency || 'GHS' : 'GHS';

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
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: '700',
            flex: 1,
          }}
        >
          Checkout
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 180 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cart Items - Simplified */}
        <View style={{ padding: 20 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <Package size={20} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
              Items ({items.length})
            </Text>
          </View>

          {items.map((item) => {
            const itemKey = item.cartKey || item.id;
            return (
              <View
                key={itemKey}
                style={{
                  marginBottom: 12,
                  overflow: 'hidden',
                  borderRadius: 12,
                }}
              >
                <BlurView
                  intensity={40}
                  tint={colors.glass.tint}
                  style={{
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Image
                      source={{ uri: item.image }}
                      style={{ width: 70, height: 70, borderRadius: 8 }}
                      contentFit="cover"
                    />
                    <View style={{ flex: 1, justifyContent: 'space-between' }}>
                      <View>
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 15,
                            fontWeight: '600',
                            marginBottom: 4,
                          }}
                        >
                          {item.name}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                          Qty: {item.quantity}
                        </Text>
                      </View>
                      <CurrencyPrice
                        price={item.price * item.quantity}
                        originalCurrency={item.seller_currency || 'GHS'}
                        size="medium"
                        textStyle={{
                          color: colors.text,
                          fontSize: 16,
                          fontWeight: '700',
                        }}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => removeItem(itemKey)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </BlurView>
              </View>
            );
          })}
        </View>

        {/* Delivery Information */}
        <View style={{ padding: 20, paddingTop: 0 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <MapPin size={20} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Delivery</Text>
          </View>

          <TouchableOpacity
            onPress={handleGetCurrentLocation}
            disabled={loading}
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <MapPin size={18} color={colors.text} />
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  Use Current Location
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              Recipient Name
            </Text>
            <TextInput
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Full name of recipient"
              placeholderTextColor={colors.inputPlaceholder}
              style={{
                backgroundColor: colors.inputBackground,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                borderRadius: 12,
                padding: 12,
                color: colors.text,
                fontSize: 15,
              }}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              Address
            </Text>
            <TextInput
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="Enter your delivery address"
              placeholderTextColor={colors.inputPlaceholder}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: colors.inputBackground,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                borderRadius: 12,
                padding: 12,
                color: colors.text,
                fontSize: 15,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              Landmark (Optional)
            </Text>
            <TextInput
              value={landmark}
              onChangeText={setLandmark}
              placeholder="e.g. Near City Mall"
              placeholderTextColor={colors.inputPlaceholder}
              style={{
                backgroundColor: colors.inputBackground,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                borderRadius: 12,
                padding: 12,
                color: colors.text,
                fontSize: 15,
              }}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              Phone Number
            </Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Your contact number"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="phone-pad"
              style={{
                backgroundColor: colors.inputBackground,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                borderRadius: 12,
                padding: 12,
                color: colors.text,
                fontSize: 15,
              }}
            />
          </View>
        </View>

        {/* Payment Info */}
        <View style={{ padding: 20, paddingTop: 0 }}>
          <View
            style={{
              overflow: 'hidden',
              borderRadius: 12,
              backgroundColor: 'rgba(212, 175, 55, 0.08)',
              borderWidth: 1,
              borderColor: 'rgba(212, 175, 55, 0.2)',
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Shield size={24} color="#D4AF37" />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: '600',
                  marginBottom: 2,
                }}
              >
                Secure Payment
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                Payment via Paystack - Mobile Money, Card, or Bank Transfer
              </Text>
            </View>
          </View>
        </View>

        <FulfillmentSection
          sellerIds={sellerIds}
          optionsBySeller={optionsBySeller}
          selectionBySeller={selectionBySeller}
          buyerLocation={buyerLocation}
          onBuyerLocationChange={setBuyerLocation}
          loading={loadingFees}
          error={fulfillmentError}
          onSelect={selectOption}
          onRetry={refetchFulfillment}
          colors={colors}
        />

        {/* Order Summary - Simplified (no platform fee visible) */}
        <View style={{ padding: 20, paddingTop: 0 }}>
          <View style={{ overflow: 'hidden', borderRadius: 12 }}>
            <BlurView
              intensity={40}
              tint={colors.glass.tint}
              style={{
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Subtotal</Text>
                <CurrencyPrice
                  price={subtotal}
                  originalCurrency={primaryCurrency}
                  size="small"
                  textStyle={{
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Delivery</Text>
                {loadingFees ? (
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  >
                    ...
                  </Text>
                ) : totalDeliveryFee === 0 ? (
                  <Text
                    style={{
                      color: '#D4AF37',
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  >
                    Free
                  </Text>
                ) : (
                  <CurrencyPrice
                    price={totalDeliveryFee}
                    originalCurrency={primaryCurrency}
                    size="small"
                    textStyle={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  />
                )}
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  marginBottom: 16,
                }}
              />

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 20,
                    fontWeight: '700',
                  }}
                >
                  Total
                </Text>
                <CurrencyPrice
                  price={total}
                  originalCurrency={primaryCurrency}
                  size="xlarge"
                  textStyle={{
                    color: colors.text,
                    fontSize: 24,
                    fontWeight: '700',
                  }}
                />
              </View>
            </BlurView>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action - Pay Button */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={processingPayment || items.length === 0}
          style={{
            backgroundColor: '#111827',
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            opacity: processingPayment || items.length === 0 ? 0.45 : 1,
          }}
        >
          {processingPayment ? (
            <>
              <ActivityIndicator color="#FFFFFF" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: '700',
                }}
              >
                Processing...
              </Text>
            </>
          ) : (
            <>
              <CheckCircle2 size={20} color="#FFFFFF" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '700',
                  marginRight: 4,
                }}
              >
                Pay
              </Text>
              <CurrencyPrice
                price={total}
                originalCurrency={primaryCurrency}
                showOriginal={false}
                size="medium"
                textStyle={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: '700',
                }}
              />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
