// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Alert,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import {
  X,
  Users,
  Heart,
  MessageCircle,
  Tag,
  ShoppingBag,
  Gift,
  Zap,
  FlipHorizontal,
  Package,
  Clock,
  Pin,
} from "lucide-react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import useLocalization from "../../utils/localization";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LiveHostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const { formatCurrency } = useLocalization();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState("front");

  // Live state
  const [isLive, setIsLive] = useState(false);
  const [liveSession, setLiveSession] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [liveTitle, setLiveTitle] = useState("");
  const [liveDuration, setLiveDuration] = useState(0);

  // Products
  const [showcaseProducts, setShowcaseProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [featuredProduct, setFeaturedProduct] = useState(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [pinnedProducts, setPinnedProducts] = useState([]);

  // Comments (simulated)
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Load showcase products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch("/api/live/showcase-products");
        if (res.ok) {
          const data = await res.json();
          setShowcaseProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  // Simulate viewer count
  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setViewerCount((prev) =>
          Math.min(prev + Math.floor(Math.random() * 5), 99999),
        );
        setLikeCount((prev) => prev + Math.floor(Math.random() * 3));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  // Live duration timer
  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setLiveDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  // Simulate incoming comments
  useEffect(() => {
    if (isLive) {
      const mockComments = [
        { user: "sarah_m", text: "This looks amazing! 😍" },
        { user: "mike_tech", text: "What's the price?" },
        { user: "emma_style", text: "I want one!" },
        { user: "john_d", text: "Do you ship internationally?" },
        { user: "lisa_b", text: "Best price I've seen! 🔥" },
        { user: "alex_k", text: "How long does shipping take?" },
        { user: "rachel_m", text: "Added to cart! 🛒" },
        { user: "david_w", text: "Is there a discount code?" },
        { user: "nina_f", text: "Show us the back side!" },
        { user: "omar_j", text: "Joined! 👋" },
      ];

      let index = 0;
      const interval = setInterval(() => {
        const comment = mockComments[index % mockComments.length];
        setComments((prev) => [
          ...prev.slice(-8),
          { id: Date.now() + index, ...comment },
        ]);
        index++;
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [isLive]);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const getProductImage = (product) => {
    if (!product.media) return null;
    if (Array.isArray(product.media) && product.media.length > 0)
      return product.media[0];
    if (typeof product.media === "string") return product.media;
    return null;
  };

  const handleGoLive = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const res = await fetch("/api/live/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: liveTitle || "Live Shopping" }),
      });

      if (!res.ok) {
        const data = await res.json();
        Alert.alert("Can't Go Live", data.error || "Something went wrong");
        return;
      }

      const data = await res.json();
      setLiveSession(data.session);
      setIsLive(true);
      setViewerCount(1);
    } catch (err) {
      console.error("Go live error:", err);
      Alert.alert("Error", "Failed to start live session");
    }
  };

  const handleEndLive = () => {
    Alert.alert(
      "End Live Session",
      `You had ${viewerCount.toLocaleString()} viewers and ${likeCount.toLocaleString()} likes. Great job!`,
      [
        { text: "Keep Going", style: "cancel" },
        {
          text: "End Session",
          style: "destructive",
          onPress: async () => {
            try {
              if (liveSession?.id) {
                await fetch("/api/live/sessions", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "end",
                    sessionId: liveSession.id,
                  }),
                });
              }
            } catch (err) {
              console.error("End live error:", err);
            }
            router.back();
          },
        },
      ],
    );
  };

  const handleFeatureProduct = async (product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeaturedProduct(product);
    setShowProductPicker(false);

    // Pin product for viewers
    setPinnedProducts((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (!exists) return [...prev, product].slice(-5);
      return prev;
    });

    // Update server
    if (liveSession?.id) {
      try {
        await fetch("/api/live/sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "feature_product",
            sessionId: liveSession.id,
            productId: product.item_type === "product" ? product.id : undefined,
            serviceId: product.item_type === "service" ? product.id : undefined,
          }),
        });
      } catch (err) {
        console.error("Feature product error:", err);
      }
    }
  };

  const handleUnfeatureProduct = async () => {
    setFeaturedProduct(null);
    if (liveSession?.id) {
      try {
        await fetch("/api/live/sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "unfeature_product",
            sessionId: liveSession.id,
          }),
        });
      } catch (err) {
        console.error("Unfeature product error:", err);
      }
    }
  };

  // Permission screen
  if (!permission?.granted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <StatusBar style="light" />
        <Text
          style={{
            color: "#FFF",
            fontSize: 18,
            fontWeight: "700",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Camera Access Required
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 15,
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          We need camera access to start your live shopping session
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: "#FFFFFF",
            paddingVertical: 14,
            paddingHorizontal: 32,
            borderRadius: 24,
          }}
        >
          <Text style={{ color: "#000000", fontSize: 16, fontWeight: "700" }}>
            Grant Permission
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Pre-live setup screen
  if (!isLive) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <StatusBar style="light" />
        <CameraView
          ref={cameraRef}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          facing={facing}
        >
          {/* Dark overlay */}
          <View
            style={{ ...styleAbsoluteFill, backgroundColor: "rgba(0,0,0,0.4)" }}
          />

          {/* Top bar */}
          <View
            style={{
              position: "absolute",
              top: insets.top + 12,
              left: 16,
              right: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={iconButtonStyle}
            >
              <X size={24} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                setFacing((c) => (c === "front" ? "back" : "front"))
              }
              style={iconButtonStyle}
            >
              <FlipHorizontal size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Center content */}
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 32,
            }}
          >
            <View
              style={{
                overflow: "hidden",
                borderRadius: 16,
                width: "100%",
                marginBottom: 24,
              }}
            >
              <BlurView
                intensity={80}
                tint="dark"
                style={{
                  padding: 20,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.15)",
                }}
              >
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 22,
                    fontWeight: "800",
                    textAlign: "center",
                    marginBottom: 16,
                  }}
                >
                  Go Live Shopping
                </Text>

                <TextInput
                  value={liveTitle}
                  onChangeText={setLiveTitle}
                  placeholder="Give your live a title..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: "#FFF",
                    fontSize: 16,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.15)",
                    marginBottom: 16,
                  }}
                />

                {/* Product count */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <Package size={18} color="rgba(255,255,255,0.6)" />
                  <Text
                    style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}
                  >
                    {loadingProducts
                      ? "Loading products..."
                      : `${showcaseProducts.length} products ready to showcase`}
                  </Text>
                </View>

                {showcaseProducts.length === 0 && !loadingProducts && (
                  <Text
                    style={{
                      color: "#FFB800",
                      fontSize: 13,
                      marginTop: 8,
                      lineHeight: 18,
                    }}
                  >
                    💡 Add products to your shop or showcase first so you can
                    feature them during your live!
                  </Text>
                )}
              </BlurView>
            </View>
          </View>

          {/* Go Live button */}
          <View
            style={{
              position: "absolute",
              bottom: insets.bottom + 30,
              left: 0,
              right: 0,
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              onPress={handleGoLive}
              style={{
                backgroundColor: "#FFFFFF",
                paddingVertical: 18,
                paddingHorizontal: 64,
                borderRadius: 30,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                shadowColor: "#FFFFFF",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#000000",
                }}
              />
              <Text
                style={{ color: "#000000", fontSize: 20, fontWeight: "800" }}
              >
                Go Live
              </Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  // Live broadcasting screen
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" />

      <CameraView
        ref={cameraRef}
        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        facing={facing}
      >
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
          {/* Left side: Live badge + duration + viewers */}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: "#000000",
                }}
              />
              <Text
                style={{ color: "#000000", fontSize: 13, fontWeight: "800" }}
              >
                LIVE
              </Text>
            </View>

            <View style={{ overflow: "hidden", borderRadius: 14 }}>
              <BlurView
                intensity={80}
                tint="dark"
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.15)",
                }}
              >
                <Text
                  style={{ color: "#FFF", fontSize: 13, fontWeight: "600" }}
                >
                  {formatDuration(liveDuration)}
                </Text>
              </BlurView>
            </View>

            <View style={{ overflow: "hidden", borderRadius: 14 }}>
              <BlurView
                intensity={80}
                tint="dark"
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.15)",
                }}
              >
                <Users size={14} color="#FFF" />
                <Text
                  style={{ color: "#FFF", fontSize: 13, fontWeight: "700" }}
                >
                  {viewerCount.toLocaleString()}
                </Text>
              </BlurView>
            </View>
          </View>

          {/* Right: End + Flip */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() =>
                setFacing((c) => (c === "front" ? "back" : "front"))
              }
              style={iconButtonStyle}
            >
              <FlipHorizontal size={20} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleEndLive}
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.3)",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}
              >
                End
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments stream */}
        <View
          style={{
            position: "absolute",
            left: 12,
            bottom: 200,
            right: 90,
            maxHeight: 220,
          }}
        >
          {comments.slice(-5).map((comment) => (
            <View
              key={comment.id}
              style={{
                marginBottom: 6,
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
                  paddingVertical: 6,
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

        {/* Right action bar */}
        <View style={{ position: "absolute", right: 12, bottom: 180, gap: 18 }}>
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                ...actionButtonStyle,
                backgroundColor: "rgba(255,255,255,0.2)",
                borderColor: "rgba(255,255,255,0.4)",
              }}
            >
              <Heart size={22} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <Text style={actionLabelStyle}>{likeCount}</Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowProductPicker(true)}
            style={{ alignItems: "center" }}
          >
            <View style={actionButtonStyle}>
              <ShoppingBag size={22} color="#FFF" />
            </View>
            <Text style={actionLabelStyle}>Products</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (featuredProduct) {
                handleUnfeatureProduct();
              } else {
                setShowProductPicker(true);
              }
            }}
            style={{ alignItems: "center" }}
          >
            <View
              style={{
                ...actionButtonStyle,
                backgroundColor: featuredProduct
                  ? "rgba(255, 184, 0, 0.3)"
                  : "rgba(255,255,255,0.15)",
                borderColor: featuredProduct
                  ? "#FFB800"
                  : "rgba(255,255,255,0.2)",
              }}
            >
              <Pin
                size={22}
                color={featuredProduct ? "#FFB800" : "#FFF"}
                fill={featuredProduct ? "#FFB800" : "transparent"}
              />
            </View>
            <Text style={actionLabelStyle}>
              {featuredProduct ? "Unpin" : "Pin"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Featured product card */}
        {featuredProduct && (
          <View
            style={{ position: "absolute", bottom: 120, left: 12, right: 90 }}
          >
            <TouchableOpacity
              onPress={() => setShowProductPicker(true)}
              style={{ overflow: "hidden", borderRadius: 14 }}
            >
              <BlurView
                intensity={90}
                tint="dark"
                style={{ padding: 10, borderWidth: 2, borderColor: "#FFB800" }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
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
                      <Zap size={12} color="#FFB800" fill="#FFB800" />
                      <Text
                        style={{
                          color: "#FFB800",
                          fontSize: 10,
                          fontWeight: "700",
                        }}
                      >
                        FEATURED NOW
                      </Text>
                    </View>
                    <Text
                      style={{ color: "#FFF", fontSize: 13, fontWeight: "600" }}
                      numberOfLines={1}
                    >
                      {featuredProduct.title}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 3,
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFF",
                          fontSize: 16,
                          fontWeight: "800",
                        }}
                      >
                        {formatCurrency(featuredProduct.price)}
                      </Text>
                      {featuredProduct.stock_quantity != null && (
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: 11,
                          }}
                        >
                          {featuredProduct.stock_quantity} in stock
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom: Pinned products strip */}
        {pinnedProducts.length > 0 && !showProductPicker && (
          <View
            style={{
              position: "absolute",
              bottom: insets.bottom + 16,
              left: 0,
              right: 0,
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
            >
              {pinnedProducts.map((product) => {
                const img = getProductImage(product);
                const isActive = featuredProduct?.id === product.id;
                return (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() => handleFeatureProduct(product)}
                    style={{
                      width: 70,
                      alignItems: "center",
                      opacity: isActive ? 1 : 0.7,
                      marginRight: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        overflow: "hidden",
                        borderWidth: isActive ? 2 : 1,
                        borderColor: isActive
                          ? "#FFB800"
                          : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {img ? (
                        <Image
                          source={{ uri: img }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: "100%",
                            height: "100%",
                            backgroundColor: "rgba(255,255,255,0.1)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Package size={20} color="#FFF" />
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        color: "#FFF",
                        fontSize: 9,
                        fontWeight: "600",
                        marginTop: 4,
                        textAlign: "center",
                      }}
                      numberOfLines={1}
                    >
                      {formatCurrency(product.price)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Product Picker Modal */}
        {showProductPicker && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "rgba(0,0,0,0.95)",
              paddingTop: 16,
              paddingBottom: insets.bottom + 16,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: SCREEN_HEIGHT * 0.55,
            }}
          >
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
              <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "700" }}>
                {showcaseProducts.length} Products
              </Text>
              <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {loadingProducts ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            ) : showcaseProducts.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <Package size={48} color="rgba(255,255,255,0.2)" />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 16,
                    marginTop: 16,
                    textAlign: "center",
                  }}
                >
                  No products available
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 14,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  Add products to your shop or showcase to feature them
                </Text>
              </View>
            ) : (
              <FlatList
                data={showcaseProducts}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => {
                  const img = getProductImage(item);
                  const isCurrentlyFeatured = featuredProduct?.id === item.id;
                  return (
                    <TouchableOpacity
                      onPress={() => handleFeatureProduct(item)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 12,
                        marginBottom: 8,
                        backgroundColor: isCurrentlyFeatured
                          ? "rgba(255, 184, 0, 0.1)"
                          : "rgba(255,255,255,0.04)",
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: isCurrentlyFeatured
                          ? "#FFB800"
                          : "rgba(255,255,255,0.08)",
                      }}
                    >
                      {img ? (
                        <Image
                          source={{ uri: img }}
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 10,
                            marginRight: 12,
                          }}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 10,
                            marginRight: 12,
                            backgroundColor: "rgba(255,255,255,0.08)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Package size={24} color="rgba(255,255,255,0.3)" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: "#FFF",
                            fontSize: 15,
                            fontWeight: "600",
                            marginBottom: 4,
                          }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={{
                            color: "#FFF",
                            fontSize: 17,
                            fontWeight: "800",
                          }}
                        >
                          {formatCurrency(item.price)}
                        </Text>
                        {item.stock_quantity != null && (
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.4)",
                              fontSize: 12,
                              marginTop: 2,
                            }}
                          >
                            {item.stock_quantity} in stock
                          </Text>
                        )}
                        {item.seller_name && (
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.4)",
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            by {item.seller_name}
                          </Text>
                        )}
                      </View>

                      {isCurrentlyFeatured ? (
                        <View
                          style={{
                            backgroundColor: "#FFB800",
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 14,
                          }}
                        >
                          <Text
                            style={{
                              color: "#000",
                              fontSize: 12,
                              fontWeight: "700",
                            }}
                          >
                            Featured
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={{
                            backgroundColor: "rgba(255,255,255,0.15)",
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.4)",
                          }}
                        >
                          <Text
                            style={{
                              color: "#FFFFFF",
                              fontSize: 12,
                              fontWeight: "700",
                            }}
                          >
                            Feature
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        )}
      </CameraView>
    </View>
  );
}

const styleAbsoluteFill = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const iconButtonStyle = {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: "rgba(0,0,0,0.5)",
  alignItems: "center",
  justifyContent: "center",
};

const actionButtonStyle = {
  width: 46,
  height: 46,
  borderRadius: 23,
  backgroundColor: "rgba(255,255,255,0.15)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.2)",
  alignItems: "center",
  justifyContent: "center",
};

const actionLabelStyle = {
  color: "#FFF",
  fontSize: 10,
  fontWeight: "600",
  marginTop: 3,
};
