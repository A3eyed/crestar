// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  X,
  Users,
  Heart,
  ShoppingBag,
  Share2,
  Send,
  Package,
  Zap,
  BadgeCheck,
  ShoppingCart,
  ChevronUp,
  ChevronDown,
  Minus,
  Plus,
} from "lucide-react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import useAuth from "../../utils/auth/useAuth";
import useLocalization from "../../utils/localization";
import useCartStore from "../../utils/cartStore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LiveWatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, signIn } = useAuth();
  const { formatCurrency } = useLocalization();
  const { addItem } = useCartStore();

  // Session data
  const [sessionData, setSessionData] = useState(null);
  const [sessionProducts, setSessionProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Engagement
  const [viewerCount, setViewerCount] = useState(parseInt(params.viewers) || 0);
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  // Product browsing
  const [showProductList, setShowProductList] = useState(false);
  const [featuredProduct, setFeaturedProduct] = useState(null);
  const [selectedCartProduct, setSelectedCartProduct] = useState(null);
  const [cartQuantity, setCartQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      try {
        if (params.sessionId) {
          const res = await fetch(`/api/live/sessions?id=${params.sessionId}`);
          if (res.ok) {
            const data = await res.json();
            setSessionData(data.session);
            setSessionProducts(data.products || []);

            // Set currently featured product
            const featured = (data.products || []).find((p) => p.is_featured);
            if (featured) setFeaturedProduct(featured);

            // Increment viewer count
            fetch("/api/live/sessions", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "increment_viewers",
                sessionId: params.sessionId,
              }),
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error("Load session error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSession();

    // Decrement on leave
    return () => {
      if (params.sessionId) {
        fetch("/api/live/sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "decrement_viewers",
            sessionId: params.sessionId,
          }),
        }).catch(() => {});
      }
    };
  }, [params.sessionId]);

  // Poll for product updates
  useEffect(() => {
    if (!params.sessionId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/live/sessions?id=${params.sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.session?.status === "ended") {
            router.back();
            return;
          }
          setSessionProducts(data.products || []);
          const featured = (data.products || []).find((p) => p.is_featured);
          setFeaturedProduct(featured || null);
        }
      } catch (err) {
        // silent
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [params.sessionId]);

  const getProductImage = (product) => {
    const media = product.product_media || product.media;
    if (!media) return null;
    if (Array.isArray(media) && media.length > 0) return media[0];
    if (typeof media === "string") return media;
    return null;
  };

  const hostName =
    params.host ||
    sessionData?.display_name ||
    sessionData?.business_name ||
    (sessionData?.username ? `@${sessionData.username}` : "@host");

  const hostAvatar = params.avatar || sessionData?.profile_image;
  const thumbnail =
    params.thumbnail || "https://picsum.photos/400/800?random=live";

  const handleLike = () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLikeCount((prev) => prev + 1);
    setHasLiked(true);
    setTimeout(() => setHasLiked(false), 500);
  };

  const handleSendComment = () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    if (commentText.trim()) {
      setComments((prev) => [
        ...prev.slice(-8),
        { id: Date.now(), user: "you", text: commentText },
      ]);
      setCommentText("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAddToCart = async (product) => {
    if (!isAuthenticated) {
      signIn();
      return;
    }

    const productTitle = product.product_title || product.title;
    const productPrice = parseFloat(product.product_price || product.price);
    const img = getProductImage(product);

    await addItem(
      {
        id: product.product_id || product.service_id || product.id,
        name: productTitle,
        price: productPrice,
        image: img,
        seller: hostName,
      },
      cartQuantity,
    );

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
      setSelectedCartProduct(null);
      setCartQuantity(1);
    }, 1500);
  };

  const handleProductTap = (product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCartProduct(product);
    setCartQuantity(1);
    setAddedToCart(false);
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" />

      {/* Live Video Background */}
      <Image
        source={{ uri: thumbnail }}
        style={{
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          position: "absolute",
        }}
        contentFit="cover"
      />

      {/* Top Bar */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 12,
          right: 12,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Left: Close + Host */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
            flex: 1,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={iconBtnStyle}>
            <X size={20} color="#FFF" />
          </TouchableOpacity>

          {/* Host info pill */}
          <View style={{ overflow: "hidden", borderRadius: 20, flex: 1 }}>
            <BlurView
              intensity={80}
              tint="dark"
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 6,
                paddingHorizontal: 10,
                gap: 8,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
              }}
            >
              {hostAvatar ? (
                <Image
                  source={{ uri: hostAvatar }}
                  style={{ width: 30, height: 30, borderRadius: 15 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "#FFF", fontSize: 14, fontWeight: "700" }}
                  >
                    {hostName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Text
                    style={{ color: "#FFF", fontSize: 13, fontWeight: "700" }}
                    numberOfLines={1}
                  >
                    {hostName}
                  </Text>
                  {(sessionData?.is_verified || params.verified === "true") && (
                    <BadgeCheck size={14} color="#D4AF37" />
                  )}
                </View>
              </View>
            </BlurView>
          </View>

          {/* Live badge */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#000000",
              }}
            />
            <Text style={{ color: "#000000", fontSize: 11, fontWeight: "800" }}>
              LIVE
            </Text>
          </View>
        </View>

        {/* Right: Viewers + Share */}
        <View style={{ flexDirection: "row", gap: 8, marginLeft: 8 }}>
          <View style={{ overflow: "hidden", borderRadius: 14 }}>
            <BlurView
              intensity={80}
              tint="dark"
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
              }}
            >
              <Users size={13} color="#FFF" />
              <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>
                {viewerCount.toLocaleString()}
              </Text>
            </BlurView>
          </View>

          <TouchableOpacity style={iconBtnStyle}>
            <Share2 size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Comments Stream */}
      <View
        style={{
          position: "absolute",
          left: 12,
          bottom: 190,
          right: 80,
          maxHeight: 230,
        }}
      >
        {comments.slice(-5).map((comment) => (
          <View
            key={comment.id}
            style={{
              marginBottom: 5,
              overflow: "hidden",
              borderRadius: 10,
              alignSelf: "flex-start",
              maxWidth: "85%",
            }}
          >
            <BlurView
              intensity={60}
              tint="dark"
              style={{
                paddingVertical: 5,
                paddingHorizontal: 10,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <Text
                style={{ color: "#FFB800", fontSize: 11, fontWeight: "700" }}
              >
                @{comment.user}
              </Text>
              <Text style={{ color: "#FFF", fontSize: 13 }}>
                {comment.text}
              </Text>
            </BlurView>
          </View>
        ))}
      </View>

      {/* Right Action Bar */}
      <View style={{ position: "absolute", right: 12, bottom: 190, gap: 18 }}>
        <TouchableOpacity onPress={handleLike} style={{ alignItems: "center" }}>
          <View
            style={{
              ...actionBtnStyle,
              backgroundColor: hasLiked
                ? "rgba(255,255,255,0.4)"
                : "rgba(255,255,255,0.15)",
              borderColor: hasLiked ? "#FFFFFF" : "rgba(255,255,255,0.2)",
            }}
          >
            <Heart
              size={22}
              color="#FFFFFF"
              fill={hasLiked ? "#FFFFFF" : "transparent"}
            />
          </View>
          <Text style={actionLblStyle}>{likeCount.toLocaleString()}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowProductList(true)}
          style={{ alignItems: "center" }}
        >
          <View
            style={{
              ...actionBtnStyle,
              backgroundColor: "rgba(255,184,0,0.2)",
              borderColor: "#FFB800",
            }}
          >
            <ShoppingBag size={22} color="#FFB800" />
          </View>
          <Text style={actionLblStyle}>
            {sessionProducts.length > 0 ? sessionProducts.length : "Shop"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Featured Product Card */}
      {featuredProduct && !showProductList && !selectedCartProduct && (
        <View
          style={{ position: "absolute", bottom: 120, left: 12, right: 80 }}
        >
          <TouchableOpacity
            onPress={() => handleProductTap(featuredProduct)}
            style={{ overflow: "hidden", borderRadius: 14 }}
          >
            <BlurView
              intensity={90}
              tint="dark"
              style={{ padding: 10, borderWidth: 2, borderColor: "#FFB800" }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                {getProductImage(featuredProduct) ? (
                  <Image
                    source={{ uri: getProductImage(featuredProduct) }}
                    style={{ width: 56, height: 56, borderRadius: 8 }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Package size={24} color="#FFF" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      marginBottom: 3,
                    }}
                  >
                    <Zap size={11} color="#FFB800" fill="#FFB800" />
                    <Text
                      style={{
                        color: "#FFB800",
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      🔥 LIVE DEAL
                    </Text>
                  </View>
                  <Text
                    style={{ color: "#FFF", fontSize: 13, fontWeight: "600" }}
                    numberOfLines={1}
                  >
                    {featuredProduct.product_title || featuredProduct.title}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 3,
                    }}
                  >
                    <Text
                      style={{ color: "#FFF", fontSize: 16, fontWeight: "800" }}
                    >
                      {formatCurrency(
                        featuredProduct.product_price || featuredProduct.price,
                      )}
                    </Text>
                  </View>
                </View>

                {/* Quick add to cart */}
                <TouchableOpacity
                  onPress={() => handleAddToCart(featuredProduct)}
                  style={{
                    backgroundColor: "#FFFFFF",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <ShoppingCart size={14} color="#000000" />
                  <Text
                    style={{
                      color: "#000000",
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    Add
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </TouchableOpacity>
        </View>
      )}

      {/* Comment Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          position: "absolute",
          bottom: insets.bottom + 16,
          left: 12,
          right: 12,
        }}
      >
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <View style={{ flex: 1, overflow: "hidden", borderRadius: 22 }}>
            <BlurView
              intensity={80}
              tint="dark"
              style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" }}
            >
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Say something..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  color: "#FFF",
                  fontSize: 14,
                }}
                onSubmitEditing={handleSendComment}
                returnKeyType="send"
              />
            </BlurView>
          </View>
          <TouchableOpacity
            onPress={handleSendComment}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: commentText.trim()
                ? "#FFFFFF"
                : "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Send
              size={18}
              color={commentText.trim() ? "#000000" : "#FFFFFF"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Product List Modal (TikTok-style bottom sheet) */}
      {showProductList && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(0,0,0,0.95)",
            paddingTop: 14,
            paddingBottom: insets.bottom + 16,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: SCREEN_HEIGHT * 0.6,
          }}
        >
          {/* Handle bar */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.3)",
              alignSelf: "center",
              marginBottom: 12,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <ShoppingBag size={20} color="#FFB800" />
              <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "700" }}>
                Live Products
              </Text>
              <View
                style={{
                  backgroundColor: "rgba(255,184,0,0.2)",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{ color: "#FFB800", fontSize: 12, fontWeight: "700" }}
                >
                  {sessionProducts.length}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowProductList(false)}>
              <X size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {sessionProducts.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Package size={48} color="rgba(255,255,255,0.2)" />
              <Text
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 16,
                  marginTop: 16,
                }}
              >
                No products yet
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 14,
                  marginTop: 8,
                }}
              >
                The host hasn't featured any products
              </Text>
            </View>
          ) : (
            <FlatList
              data={sessionProducts}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item, index }) => {
                const img = getProductImage(item);
                const title = item.product_title || item.title;
                const price = item.product_price || item.price;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setShowProductList(false);
                      handleProductTap(item);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 12,
                      marginBottom: 8,
                      backgroundColor: item.is_featured
                        ? "rgba(255,184,0,0.08)"
                        : "rgba(255,255,255,0.04)",
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: item.is_featured
                        ? "rgba(255,184,0,0.3)"
                        : "rgba(255,255,255,0.08)",
                    }}
                  >
                    {/* Index badge */}
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: item.is_featured
                          ? "#FFB800"
                          : "rgba(255,255,255,0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: item.is_featured ? "#000" : "#FFF",
                          fontSize: 11,
                          fontWeight: "800",
                        }}
                      >
                        {index + 1}
                      </Text>
                    </View>

                    {img ? (
                      <Image
                        source={{ uri: img }}
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 10,
                          marginRight: 12,
                        }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 10,
                          marginRight: 12,
                          backgroundColor: "rgba(255,255,255,0.08)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Package size={22} color="rgba(255,255,255,0.3)" />
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      {item.is_featured && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginBottom: 3,
                          }}
                        >
                          <Zap size={10} color="#FFB800" fill="#FFB800" />
                          <Text
                            style={{
                              color: "#FFB800",
                              fontSize: 10,
                              fontWeight: "700",
                            }}
                          >
                            FEATURED
                          </Text>
                        </View>
                      )}
                      <Text
                        style={{
                          color: "#FFF",
                          fontSize: 14,
                          fontWeight: "600",
                          marginBottom: 3,
                        }}
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 16,
                          fontWeight: "800",
                        }}
                      >
                        {formatCurrency(price)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        setShowProductList(false);
                        handleProductTap(item);
                      }}
                      style={{
                        backgroundColor: "#FFFFFF",
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <ShoppingCart size={14} color="#000000" />
                      <Text
                        style={{
                          color: "#000000",
                          fontSize: 13,
                          fontWeight: "700",
                        }}
                      >
                        Buy
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}

      {/* Quick Add to Cart Modal */}
      {selectedCartProduct && !showProductList && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(0,0,0,0.95)",
            paddingTop: 14,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 16,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.3)",
              alignSelf: "center",
              marginBottom: 14,
            }}
          />

          {/* Product info */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            {getProductImage(selectedCartProduct) ? (
              <Image
                source={{ uri: getProductImage(selectedCartProduct) }}
                style={{ width: 80, height: 80, borderRadius: 12 }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Package size={32} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text
                style={{
                  color: "#FFF",
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: 4,
                }}
                numberOfLines={2}
              >
                {selectedCartProduct.product_title || selectedCartProduct.title}
              </Text>
              <Text
                style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800" }}
              >
                {formatCurrency(
                  selectedCartProduct.product_price ||
                    selectedCartProduct.price,
                )}
              </Text>
              {selectedCartProduct.stock_quantity != null && (
                <Text
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {selectedCartProduct.stock_quantity} in stock
                </Text>
              )}
            </View>

            <TouchableOpacity onPress={() => setSelectedCartProduct(null)}>
              <X size={22} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          {/* Quantity */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 15 }}>
              Quantity
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <TouchableOpacity
                onPress={() => setCartQuantity(Math.max(1, cartQuantity - 1))}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Minus size={16} color="#FFF" />
              </TouchableOpacity>
              <Text
                style={{
                  color: "#FFF",
                  fontSize: 18,
                  fontWeight: "700",
                  minWidth: 28,
                  textAlign: "center",
                }}
              >
                {cartQuantity}
              </Text>
              <TouchableOpacity
                onPress={() => setCartQuantity(cartQuantity + 1)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => handleAddToCart(selectedCartProduct)}
              style={{
                flex: 1,
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: "center",
                backgroundColor: addedToCart
                  ? "rgba(212,175,55,0.2)"
                  : "rgba(255,255,255,0.1)",
                borderWidth: 1.5,
                borderColor: addedToCart ? "#D4AF37" : "#FFFFFF",
                flexDirection: "row",
                justifyContent: "center",
                gap: 7,
              }}
            >
              {addedToCart ? (
                <Text
                  style={{ color: "#D4AF37", fontSize: 15, fontWeight: "700" }}
                >
                  ✓ Added!
                </Text>
              ) : (
                <>
                  <ShoppingCart size={17} color="#FFFFFF" />
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    Add to Cart
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                handleAddToCart(selectedCartProduct);
                setTimeout(() => {
                  setSelectedCartProduct(null);
                  router.push("/checkout");
                }, 300);
              }}
              style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <ShoppingBag size={17} color="#000000" />
              <Text
                style={{ color: "#000000", fontSize: 15, fontWeight: "700" }}
              >
                Buy Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const iconBtnStyle = {
  width: 38,
  height: 38,
  borderRadius: 19,
  backgroundColor: "rgba(0,0,0,0.5)",
  alignItems: "center",
  justifyContent: "center",
};

const actionBtnStyle = {
  width: 46,
  height: 46,
  borderRadius: 23,
  backgroundColor: "rgba(255,255,255,0.15)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.2)",
  alignItems: "center",
  justifyContent: "center",
};

const actionLblStyle = {
  color: "#FFF",
  fontSize: 11,
  fontWeight: "600",
  marginTop: 3,
};
