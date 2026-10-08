// @ts-nocheck
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
  Modal,
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  Pressable,
} from 'react-native';
import {
  useState,
  forwardRef,
  useMemo,
  useImperativeHandle,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Image } from 'expo-image';
import {
  X,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Check,
  ChevronRight,
  Truck,
  Package,
  AlertCircle,
  Info,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import useAuth from '../utils/auth/useAuth';
import useLocalization from '../utils/localization';
import useCartStore from '../utils/cartStore';
import SizeGuideModal from './SizeGuideModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Self-contained bottom sheet (replaces @gorhom/bottom-sheet) ─────────
// The native build used to render this sheet through @gorhom/bottom-sheet.
// That component is remounted by `key` on every product change and drives its
// position through Reanimated worklets, so on a real device the sheet either
// mounted closed and then ignored the later `index` change, or threw while
// mounting and was silently swallowed by the surrounding <SafeBoundary> —
// which is why tapping a tagged product in the feed or on a profile did
// nothing on device while the web build (a plain <Modal>) worked fine.
//
// This implementation uses React Native primitives only: it can never fail to
// resolve, it reacts to the `index` prop, it still supports the imperative
// `snapToIndex()/expand()/close()` calls made by the feed and profile screens,
// and it renders inside its own <Modal> so it also appears above the
// fullscreen video player on the profile tab.
function parseSnapPoint(point, fallback) {
  if (typeof point === 'number' && Number.isFinite(point)) return point;
  if (typeof point === 'string') {
    const trimmed = point.trim();
    if (trimmed.endsWith('%')) {
      const pct = parseFloat(trimmed);
      if (Number.isFinite(pct)) return (SCREEN_HEIGHT * pct) / 100;
    }
    const raw = parseFloat(trimmed);
    if (Number.isFinite(raw)) return raw;
  }
  return fallback;
}

const BottomSheet = forwardRef(function LocalBottomSheet(
  {
    index = -1,
    snapPoints,
    onChange,
    onClose,
    backgroundStyle,
    handleIndicatorStyle,
    enablePanDownToClose = true,
    children,
  },
  ref
) {
  const points = useMemo(
    () => (Array.isArray(snapPoints) && snapPoints.length > 0 ? snapPoints : ['75%']),
    [snapPoints]
  );

  const [currentIndex, setCurrentIndex] = useState(index);
  const [mounted, setMounted] = useState(index >= 0);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const reportedIndex = useRef(index);

  const sheetHeight = useMemo(() => {
    const safeIndex = currentIndex < 0 ? 0 : Math.min(currentIndex, points.length - 1);
    return parseSnapPoint(points[safeIndex], SCREEN_HEIGHT * 0.75);
  }, [currentIndex, points]);

  const report = useCallback(
    (next) => {
      if (reportedIndex.current === next) return;
      reportedIndex.current = next;
      onChange?.(next);
    },
    [onChange]
  );

  // Follow the `index` prop — this is what actually opens the sheet, because
  // every caller sets its product state first and `index` is derived from it.
  useEffect(() => {
    setCurrentIndex(index);
  }, [index]);

  useEffect(() => {
    if (currentIndex >= 0) {
      setMounted(true);
      translateY.setValue(SCREEN_HEIGHT);
      const openAnimation = Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      openAnimation.start();
      report(currentIndex);
      return () => openAnimation.stop();
    }

    const closeAnimation = Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    closeAnimation.start(({ finished }) => {
      if (finished) setMounted(false);
    });
    report(-1);
    return () => closeAnimation.stop();
  }, [currentIndex, report, translateY]);

  const requestClose = useCallback(() => {
    setCurrentIndex(-1);
    onClose?.();
  }, [onClose]);

  useImperativeHandle(
    ref,
    () => ({
      snapToIndex: (next = 0) => setCurrentIndex(next),
      snapToPosition: () => setCurrentIndex(0),
      expand: () => setCurrentIndex(points.length - 1),
      collapse: () => setCurrentIndex(0),
      close: () => setCurrentIndex(-1),
      forceClose: () => setCurrentIndex(-1),
    }),
    [points.length]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          enablePanDownToClose && gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_evt, gesture) => {
          if (gesture.dy > 0) translateY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dy > 120 || gesture.vy > 0.8) {
            requestClose();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 0,
            }).start();
          }
        },
      }),
    [enablePanDownToClose, requestClose, translateY]
  );

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={requestClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={requestClose}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}
        />
        <Animated.View
          style={[
            {
              height: sheetHeight,
              width: '100%',
              backgroundColor: '#000000',
              overflow: 'hidden',
            },
            backgroundStyle,
            {
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={{ paddingTop: 10, paddingBottom: 6 }}>
            <View
              style={[
                {
                  alignSelf: 'center',
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                },
                handleIndicatorStyle,
              ]}
            />
          </View>
          <View style={{ flex: 1 }}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
});

const FeedProductSheet = forwardRef(({ product, onClose }, ref) => {
  const router = useRouter();
  const { isAuthenticated, signIn } = useAuth();
  const { formatCurrency } = useLocalization();
  const { addItem, totalItems, setBuyNowItem } = useCartStore();

  const bottomSheetRef = useRef(null);
  const isMountedRef = useRef(false); // Track component mount status
  const openAttemptRef = useRef(0); // Track number of open attempts

  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [visible, setVisible] = useState(false);
  const [productDetails, setProductDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [fetchErrorCode, setFetchErrorCode] = useState(null);
  const [displayMedia, setDisplayMedia] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [variantStock, setVariantStock] = useState({});
  const [variantImages, setVariantImages] = useState({});

  const snapPoints = useMemo(() => ['75%', '90%'], []);

  // ✅ DIAGNOSTIC: Track component lifecycle
  useEffect(() => {
    console.log('🛍️ [FeedProductSheet] Component MOUNTED');
    isMountedRef.current = true;

    // Check BottomSheet ref availability after a delay
    setTimeout(() => {
      console.log('🛍️ [FeedProductSheet] Mount status check:', {
        platform: Platform.OS,
        isMounted: isMountedRef.current,
        hasBottomSheetRef: !!bottomSheetRef.current,
        BottomSheetExists: Platform.OS !== 'web' && !!BottomSheet,
      });
    }, 200);

    return () => {
      console.log('🛍️ [FeedProductSheet] Component UNMOUNTING');
      isMountedRef.current = false;
    };
  }, []);

  // ── Open state is derived from `product`, never from the imperative ref ──
  // Every caller does `setProduct(p)` then `sheetRef.current?.snapToIndex(0)`.
  // On native that imperative call lands while the BottomSheet is being
  // remounted (its `key` contains the product id) and before it has measured
  // its layout, so @gorhom/bottom-sheet silently drops it and nothing opens.
  // The web build never hits that path (it renders a plain <Modal> driven by
  // `visible`), which is why the preview worked and a real device did not.
  useEffect(() => {
    if (product?.id) {
      setVisible(true);
    } else {
      // Clearing the product must also reset `visible`, otherwise the derived
      // `index` never goes back to -1 and the following tap can't re-open it.
      setVisible(false);
    }
  }, [product?.id]);

  useEffect(() => {
    if (product?.id && visible) {
      console.log('[FeedProductSheet] Fetching product details for:', product.id);
      setFetchError(false);
      setProductDetails(null);
      setDisplayMedia([]);
      fetchProductDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, visible]);

  // ── Parse a variant's full image list (variant_images jsonb array, falling back to legacy variant_image) ──
  const parseVariantImageList = (variant) => {
    if (!variant) return [];
    let list = [];
    try {
      if (Array.isArray(variant.variant_images)) {
        list = variant.variant_images;
      } else if (typeof variant.variant_images === 'string' && variant.variant_images.trim()) {
        const parsed = JSON.parse(variant.variant_images);
        if (Array.isArray(parsed)) list = parsed;
      }
    } catch (e) {
      list = [];
    }
    if (list.length === 0 && variant.variant_image) list = [variant.variant_image];
    return list.filter(Boolean);
  };

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${product.id}`);
      if (!response.ok) {
        setFetchError(true);
        setFetchErrorCode(response.status);
        return;
      }
      const data = await response.json();
      const media = Array.isArray(data.product.media)
        ? data.product.media
        : typeof data.product.media === 'string'
          ? JSON.parse(data.product.media)
          : [];

      const parsedDetails = {
        ...data.product,
        media,
        variants: data.variants || [],
      };
      setProductDetails(parsedDetails);
      setDisplayMedia(media);

      const stockMap = {};
      const imagesMap = {};
      if (data.variants && data.variants.length > 0) {
        const initialSelection = {};
        const variantTypes = [...new Set(data.variants.map((v) => v.variant_type))];
        variantTypes.forEach((type) => {
          const first = data.variants.find((v) => v.variant_type === type);
          if (first) initialSelection[type] = first.variant_value;
        });
        data.variants
          .filter((v) => v.variant_type === 'color')
          .forEach((v) => {
            stockMap[v.variant_value] = v.stock_quantity || 0;
            // Store the FULL image list per variant so buyers can slide through every photo
            const imgs = parseVariantImageList(v);
            if (imgs.length > 0) imagesMap[v.variant_value] = imgs;
          });
        setVariantStock(stockMap);
        setVariantImages(imagesMap);
        setSelectedVariants(initialSelection);
        const firstColor = initialSelection['color'];
        if (firstColor && imagesMap[firstColor]) {
          const varImgs = imagesMap[firstColor];
          setDisplayMedia([...varImgs, ...media.filter((m) => !varImgs.includes(m))]);
          setSelectedImageIndex(0);
        }
      }
      console.log('✅ [FeedProductSheet] Product details loaded successfully');
    } catch (error) {
      console.error('❌ [FeedProductSheet] Fetch error:', error);
      setFetchError(true);
      setFetchErrorCode(null);
    } finally {
      setLoading(false);
    }
  };

  // ─── IMPERATIVE HANDLE WITH ULTRA-ROBUST RETRY LOGIC ─────────────────────────
  useImperativeHandle(ref, () => ({
    snapToIndex: (index) => {
      openAttemptRef.current += 1;
      const attemptId = openAttemptRef.current;

      console.log('🛍️ [FeedProductSheet] snapToIndex called (#' + attemptId + '):', {
        index,
        platform: Platform.OS,
        hasProduct: !!product,
        productId: product?.id,
        productName: product?.name,
        isMounted: isMountedRef.current,
        hasBottomSheetRef: !!bottomSheetRef.current,
        timestamp: new Date().toISOString(),
      });

      if (Platform.OS === 'web') {
        console.log('🛍️ [FeedProductSheet] Opening web modal');
        setVisible(index >= 0);
        return;
      }

      // ✅ Check if BottomSheet package is loaded
      if (!BottomSheet) {
        console.error('❌ [FeedProductSheet] BottomSheet package not loaded!');
        return;
      }

      // ✅ NATIVE: Check mount status first
      if (!isMountedRef.current) {
        console.warn('⚠️ [FeedProductSheet] Component not mounted - scheduling retry');
        setTimeout(() => {
          console.log('🛍️ [FeedProductSheet] Retrying after mount delay');
          if (isMountedRef.current) {
            this.snapToIndex(index);
          } else {
            console.error('❌ [FeedProductSheet] Still not mounted after delay');
          }
        }, 500);
        return;
      }

      // Set visible FIRST
      console.log('🛍️ [FeedProductSheet] Setting visible=true');
      setVisible(true);

      // ✅ ULTRA-ROBUST retry with exponential backoff
      const attemptOpen = (attemptNumber, delay) => {
        setTimeout(() => {
          console.log(
            `🛍️ [FeedProductSheet #${attemptId}] Attempt ${attemptNumber} after ${delay}ms`
          );
          console.log(`   → bottomSheetRef.current exists: ${!!bottomSheetRef.current}`);
          console.log(`   → Component mounted: ${isMountedRef.current}`);
          console.log(`   → Visible state: ${visible}`);

          if (!bottomSheetRef.current) {
            console.warn(
              `⚠️ [FeedProductSheet #${attemptId}] Attempt ${attemptNumber}: bottomSheetRef is null`
            );

            // Retry up to 6 times with exponential backoff
            if (attemptNumber < 6) {
              const nextDelay = Math.min(300 * Math.pow(1.5, attemptNumber), 2000);
              console.log(
                `   → Scheduling retry #${attemptNumber + 1} in ${Math.round(nextDelay)}ms`
              );
              attemptOpen(attemptNumber + 1, nextDelay);
            } else {
              console.error(`❌ [FeedProductSheet #${attemptId}] FAILED after 6 attempts`);
              console.error('   → Final state:', {
                visible,
                hasProduct: !!product,
                isMounted: isMountedRef.current,
                Platform: Platform.OS,
                BottomSheetPackageExists: !!BottomSheet,
              });
            }
            return;
          }

          try {
            console.log(
              `✅ [FeedProductSheet #${attemptId}] Attempt ${attemptNumber}: Calling snapToIndex(${index})`
            );
            bottomSheetRef.current.snapToIndex(index >= 0 ? index : 0);
            console.log(`✅ [FeedProductSheet #${attemptId}] Sheet opened successfully!`);
          } catch (error) {
            console.error(
              `❌ [FeedProductSheet #${attemptId}] Attempt ${attemptNumber} threw error:`,
              error
            );
            if (attemptNumber < 6) {
              attemptOpen(attemptNumber + 1, 300);
            }
          }
        }, delay);
      };

      // ✅ FIX 1: Reduced initial delay from 500ms to 50ms for faster response
      attemptOpen(1, 50);
    },
    close: () => {
      console.log('🛍️ [FeedProductSheet] close() called via ref');
      doClose();
    },
  }));
  // ────────────────────────────────────────────────────────────────────────────

  const doClose = () => {
    console.log('🛍️ [FeedProductSheet] doClose() executing');
    setVisible(false);
    if (Platform.OS !== 'web') {
      bottomSheetRef.current?.close();
    }
    setQuantity(1);
    setAddedToCart(false);
    setSelectedVariants({});
    setSelectedImageIndex(0);
    setProductDetails(null);
    setDisplayMedia([]);
    setFetchError(false);
    setFetchErrorCode(null);
    setShowSizeGuide(false);
    onClose();
    console.log('🛍️ [FeedProductSheet] doClose() completed');
  };

  const productImage = product?.images?.[0] || product?.image || product?.thumbnail;
  const productName = product?.name || product?.productName || 'Product';
  const productPrice = product?.price || product?.productPrice || 0;
  const sellerName = product?.seller || product?.username || product?.sellerName || 'Seller';

  const variantsByType = {};
  if (productDetails?.variants) {
    productDetails.variants.forEach((variant) => {
      if (!variantsByType[variant.variant_type]) variantsByType[variant.variant_type] = [];
      if (
        !variantsByType[variant.variant_type].find((v) => v.variant_value === variant.variant_value)
      ) {
        variantsByType[variant.variant_type].push(variant);
      }
    });
  }

  const handleVariantSelect = (type, value) => {
    if (type === 'color' && variantStock[value] === 0) return;
    setSelectedVariants((prev) => ({ ...prev, [type]: value }));
    if (type === 'color' && variantImages[value]) {
      // Show ALL photos of the selected variant first, then remaining product media
      const varImgs = variantImages[value];
      const base = productDetails?.media || [];
      setDisplayMedia([...varImgs, ...base.filter((m) => !varImgs.includes(m))]);
      setSelectedImageIndex(0);
    }
  };

  const calculateFinalPrice = () => {
    let price = parseFloat(productPrice);
    if (productDetails?.variants) {
      Object.entries(selectedVariants).forEach(([type, value]) => {
        const variant = productDetails.variants.find(
          (v) => v.variant_type === type && v.variant_value === value
        );
        if (variant?.price_adjustment) price += parseFloat(variant.price_adjustment);
      });
    }
    return price;
  };

  const getCurrentStock = () => {
    const selectedColor = selectedVariants['color'];
    if (!selectedColor || variantStock[selectedColor] == null)
      return productDetails?.stock_quantity || 0;
    return variantStock[selectedColor];
  };

  const isLowStock = () => {
    const s = getCurrentStock();
    return s > 0 && s < 10;
  };
  const isColorOutOfStock = (color) => variantStock[color] === 0;
  const finalPrice = calculateFinalPrice();

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    await addItem(
      {
        id: product.id,
        name: productName,
        price: finalPrice,
        image: displayMedia[selectedImageIndex] || productImage,
        seller: sellerName,
        sellerId: product.sellerId,
        selectedVariants: Object.keys(selectedVariants).length > 0 ? selectedVariants : undefined,
        // Creator attribution: the tagged product is what the buyer purchases,
        // and the creator whose video drove the sale earns their commission
        originVideoId: product.originVideoId || null,
        originCreatorId: product.originCreatorId || null,
      },
      quantity
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    // Validate variant selection: require at least color and size
    if (!selectedVariants['color'] || !selectedVariants['size']) {
      alert('Please select both color and size before buying.');
      return;
    }
    // Validate stock: check if selected variant is in stock
    const selectedVariant = productDetails.variants.find(
      (v) =>
        v.variant_type === 'color' &&
        v.variant_value === selectedVariants['color'] &&
        v.variant_type === 'size' &&
        v.variant_value === selectedVariants['size']
    );
    if (!selectedVariant || selectedVariant.stock_quantity <= 0) {
      alert('Selected variant is out of stock.');
      return;
    }
    const source = productDetails || product;
    const basePrice =
      typeof source?.price === 'number' ? source.price : parseFloat(source?.price) || 0;

    // Apply the selected variant's price adjustment if one exists (same logic as add-to-cart)
    let priceAdjustment = 0;
    const variants = productDetails?.variants || [];
    const colorVariant = variants.find(
      (v) => v.variant_type === 'color' && v.variant_value === selectedVariants.color
    );
    if (colorVariant?.price_adjustment) {
      priceAdjustment = parseFloat(colorVariant.price_adjustment) || 0;
    }

    const expressItem = {
      id: source.id,
      name: source.title || source.name,
      price: basePrice + priceAdjustment,
      image:
        (Array.isArray(displayMedia) && displayMedia[0]?.url) ||
        displayMedia[0] ||
        source.image ||
        source.thumbnail_url ||
        null,
      sellerId: source.seller_id || source.sellerId || source.seller,
      sellerName: source.seller_name || source.sellerName || null,
      selectedColor: selectedVariants.color || null,
      selectedSize: selectedVariants.size || null,
      currency: source.seller_currency || source.currency || 'GHS',
    };

    // EXPRESS LANE (TikTok-style): skip the cart, go straight to checkout
    setBuyNowItem(expressItem, quantity);
    doClose();
    router.push('/checkout?mode=buynow');
  };

  // ── Inline sheet content (NOT a sub-component to avoid remount bugs) ──
  const sheetInner = (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* Sheet title — "Shop this item" */}
      <View
        style={{
          paddingTop: 18,
          paddingHorizontal: 16,
          paddingBottom: 4,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Shop this item</Text>
      </View>
      <TouchableOpacity
        onPress={doClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(255,255,255,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={18} color="#FFFFFF" />
      </TouchableOpacity>

      {loading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      {!loading && fetchError && (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          <ShoppingBag size={48} color="rgba(255,255,255,0.2)" />
          <Text
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 16,
              fontWeight: '600',
              textAlign: 'center',
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            {fetchErrorCode === 404 ? 'Product No Longer Available' : 'Product Unavailable'}
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            {fetchErrorCode === 404
              ? 'This product has been removed or is out of stock.'
              : 'This product could not be loaded. Please try again.'}
          </Text>
          <TouchableOpacity
            onPress={fetchErrorCode === 404 ? doClose : fetchProductDetails}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              {fetchErrorCode === 404 ? 'Close' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !fetchError && product && (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 140,
            }}
            showsVerticalScrollIndicator={false}
          >
            {displayMedia.length > 0 ? (
              <View style={{ marginBottom: 20 }}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  onScroll={(e) =>
                    setSelectedImageIndex(
                      Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32))
                    )
                  }
                  scrollEventThrottle={16}
                >
                  {displayMedia.map((img, index) => (
                    <Image
                      key={index}
                      source={{ uri: img }}
                      style={{
                        width: SCREEN_WIDTH - 32,
                        height: (SCREEN_WIDTH - 32) * 1.1,
                        borderRadius: 16,
                      }}
                      contentFit="cover"
                      transition={200}
                    />
                  ))}
                </ScrollView>
                {displayMedia.length > 1 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6,
                      marginTop: 12,
                    }}
                  >
                    {displayMedia.map((img, i) => (
                      <View
                        key={i}
                        style={{
                          width: selectedImageIndex === i ? 20 : 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor:
                            selectedImageIndex === i ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                        }}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : productImage ? (
              <View style={{ marginBottom: 20 }}>
                <Image
                  source={{ uri: productImage }}
                  style={{
                    width: SCREEN_WIDTH - 32,
                    height: (SCREEN_WIDTH - 32) * 1.1,
                    borderRadius: 16,
                  }}
                  contentFit="cover"
                />
              </View>
            ) : null}

            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 20,
                  fontWeight: '700',
                  marginBottom: 4,
                }}
              >
                {productName}
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 14,
                  marginBottom: 12,
                }}
              >
                {sellerName}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800' }}>
                  {formatCurrency(finalPrice)}
                </Text>
                {product.originalPrice && (
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.35)',
                      fontSize: 16,
                      textDecorationLine: 'line-through',
                    }}
                  >
                    {formatCurrency(product.originalPrice)}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {getCurrentStock() > 0 ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Package size={14} color="#D4AF37" />
                    <Text
                      style={{
                        color: '#D4AF37',
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {getCurrentStock()} in stock
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <AlertCircle size={14} color="#F59E0B" />
                    <Text
                      style={{
                        color: '#F59E0B',
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      Out of stock
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Truck size={14} color="rgba(255,255,255,0.4)" />
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                    Delivery available
                  </Text>
                </View>
              </View>
            </View>

            {selectedVariants['color'] && getCurrentStock() === 0 && (
              <View
                style={{
                  marginBottom: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: 'rgba(245,158,11,0.15)',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(245,158,11,0.3)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} color="#F59E0B" />
                  <Text
                    style={{
                      color: '#F59E0B',
                      fontSize: 14,
                      fontWeight: '600',
                    }}
                  >
                    This variant is out of stock
                  </Text>
                </View>
              </View>
            )}
            {selectedVariants['color'] && isLowStock() && (
              <View
                style={{
                  marginBottom: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: 'rgba(245,158,11,0.15)',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(245,158,11,0.3)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} color="#F59E0B" />
                  <Text
                    style={{
                      color: '#F59E0B',
                      fontSize: 14,
                      fontWeight: '600',
                    }}
                  >
                    Only {getCurrentStock()} left in stock!
                  </Text>
                </View>
              </View>
            )}

            {Object.keys(variantsByType).map((type) => (
              <View key={type} style={{ marginBottom: 20 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: 14,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {type}: {selectedVariants[type] || 'Select'}
                  </Text>
                  {type === 'size' && (
                    <TouchableOpacity
                      onPress={() => setShowSizeGuide(true)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: 'rgba(212,175,55,0.15)',
                        borderWidth: 1,
                        borderColor: 'rgba(212,175,55,0.3)',
                      }}
                    >
                      <Info size={12} color="#D4AF37" />
                      <Text
                        style={{
                          color: '#D4AF37',
                          fontSize: 11,
                          fontWeight: '600',
                        }}
                      >
                        Size Guide
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {variantsByType[type].map((variant) => {
                    const isSelected = selectedVariants[type] === variant.variant_value;
                    const hasImage = !!variant.variant_image;
                    const isOutOfStock =
                      type === 'color' && isColorOutOfStock(variant.variant_value);
                    const vs = type === 'color' ? variantStock[variant.variant_value] : null;
                    const isLow = vs != null && vs > 0 && vs < 10;
                    return (
                      <TouchableOpacity
                        key={variant.id || variant.variant_value}
                        onPress={() => handleVariantSelect(type, variant.variant_value)}
                        disabled={isOutOfStock}
                        style={{
                          paddingHorizontal: hasImage ? 4 : 16,
                          paddingVertical: hasImage ? 4 : 10,
                          borderRadius: 10,
                          backgroundColor: isSelected
                            ? 'rgba(255,255,255,0.2)'
                            : isOutOfStock
                              ? 'rgba(255,255,255,0.03)'
                              : 'rgba(255,255,255,0.05)',
                          borderWidth: 2,
                          borderColor: isSelected
                            ? '#FFFFFF'
                            : isLow
                              ? '#F59E0B'
                              : isOutOfStock
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(255,255,255,0.15)',
                          minWidth: hasImage ? 56 : undefined,
                          opacity: isOutOfStock ? 0.5 : 1,
                        }}
                      >
                        {hasImage ? (
                          <View style={{ position: 'relative' }}>
                            <Image
                              source={{ uri: variant.variant_image }}
                              style={{ width: 48, height: 48, borderRadius: 6 }}
                              contentFit="cover"
                            />
                            {isOutOfStock && (
                              <View
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  backgroundColor: 'rgba(0,0,0,0.6)',
                                  borderRadius: 6,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Text
                                  style={{
                                    color: '#FFFFFF',
                                    fontSize: 9,
                                    fontWeight: '700',
                                  }}
                                >
                                  OUT
                                </Text>
                              </View>
                            )}
                          </View>
                        ) : (
                          <Text
                            style={{
                              color: isSelected
                                ? '#FFFFFF'
                                : isOutOfStock
                                  ? 'rgba(255,255,255,0.3)'
                                  : 'rgba(255,255,255,0.6)',
                              fontSize: 14,
                              fontWeight: isSelected ? '700' : '500',
                              textDecorationLine: isOutOfStock ? 'line-through' : 'none',
                            }}
                          >
                            {variant.variant_value}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => {
                doClose();
                router.push(`/product/${product.id}`);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                paddingVertical: 12,
                marginBottom: 16,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 14,
                  fontWeight: '500',
                }}
              >
                View full details
              </Text>
              <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

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
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 15,
                  fontWeight: '600',
                }}
              >
                Quantity
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Minus size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 18,
                    fontWeight: '700',
                    minWidth: 32,
                    textAlign: 'center',
                  }}
                >
                  {quantity}
                </Text>
                <TouchableOpacity
                  onPress={() => setQuantity(quantity + 1)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#000000',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.1)',
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: Platform.OS === 'ios' ? 34 : 16,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
              <TouchableOpacity
                onPress={handleAddToCart}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: 'center',
                  backgroundColor: addedToCart ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.15)',
                  borderWidth: 1.5,
                  borderColor: addedToCart ? '#D4AF37' : '#FFFFFF',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 7,
                }}
              >
                {addedToCart ? (
                  <>
                    <Check size={18} color="#D4AF37" strokeWidth={3} />
                    <Text
                      style={{
                        color: '#D4AF37',
                        fontSize: 15,
                        fontWeight: '700',
                      }}
                    >
                      Added!
                    </Text>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} color="#FFFFFF" />
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: 15,
                        fontWeight: '700',
                      }}
                    >
                      Add to Cart
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBuyNow}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 7,
                }}
              >
                <ShoppingBag size={18} color="#000000" />
                <Text style={{ color: '#000000', fontSize: 15, fontWeight: '700' }}>Buy Now</Text>
              </TouchableOpacity>
            </View>
            {totalItems > 0 && !addedToCart && (
              <TouchableOpacity
                onPress={() => {
                  doClose();
                  router.push('/cart');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 8,
                }}
              >
                <ShoppingCart size={14} color="rgba(255,255,255,0.5)" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                  {totalItems} {totalItems === 1 ? 'item' : 'items'} in cart
                </Text>
                <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      <SizeGuideModal visible={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={doClose}>
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}
        >
          <View
            style={{
              backgroundColor: '#000000',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '75%',
            }}
          >
            {sheetInner}
          </View>
        </View>
      </Modal>
    );
  }

  // ── NATIVE: BottomSheet — ALWAYS RENDERED ──
  // ✅ FIX 2: Added key prop to force proper mounting
  // ✅ FIX 3: Added enableDynamicSizing={false} for stability
  // ✅ FIX 4: Never render an undefined component — that throws
  //           "Element type is invalid" and is caught by the ROOT boundary,
  //           which is what wipes out the tabs.
  // The sheet is a local component now, so it no longer needs a `key` to force
  // a remount between products — remounting is exactly what used to drop the
  // open request and it also skipped the closing animation.
  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: '#000000', borderRadius: 24 }}
      handleIndicatorStyle={{
        backgroundColor: 'rgba(255,255,255,0.3)',
        width: 40,
      }}
      onChange={(sheetIndex) => {
        if (sheetIndex === -1) {
          doClose();
        }
      }}
      onClose={doClose}
    >
      {sheetInner}
    </BottomSheet>
  );
});

export default FeedProductSheet;
