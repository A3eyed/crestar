// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { ChevronRight, ShoppingBag, X } from "lucide-react-native";
import CurrencyPrice from "@/components/CurrencyPrice";
import {
  getTagCurrency,
  getTagId,
  getTagImage,
  getTagPrice,
  getTagStock,
  getTagTitle,
  getTaggedItems,
  hasSeenProductAnchor,
  markProductAnchorSeen,
  normalizeTaggedProduct,
} from "@/utils/taggedProducts";

const BRAND = "#D4AF37";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const ENTER_DELAY_FIRST_VIEW = 1100;
const ENTER_DELAY_AFTER_SEEN = 350;
const EXPANDED_DURATION = 5000;

function readExplicitStock(tag) {
  if (!tag || typeof tag !== "object") return null;
  const candidates = [
    tag.stockQuantity,
    tag.stock_quantity,
    tag.stock,
    tag.availableStock,
    tag.available_stock,
    tag.quantityAvailable,
    tag.quantity_available,
    tag.product?.stockQuantity,
    tag.product?.stock_quantity,
    tag.product?.stock,
  ];
  for (const value of candidates) {
    if (value === 0 || value === "0") return 0;
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  const fromHelper = getTagStock(tag);
  if (fromHelper === 0) {
    const hasField = candidates.some((value) => value !== undefined);
    return hasField ? 0 : null;
  }
  return fromHelper ?? null;
}

function isExplicitlySoldOut(tag) {
  return readExplicitStock(tag) === 0;
}

export default function TaggedProductAnchor({
  video,
  isActive = true,
  onProductPress: onProductPressProp,
  style,
}) {
  const items = useMemo(() => getTaggedItems(video), [video]);
  const count = items.length;
  const videoKey = video?.id ? String(video.id) : null;
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [showList, setShowList] = useState(false);
  const [labelWidth, setLabelWidth] = useState(0);
  const enter = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const timers = useRef([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  const collapseLabel = useCallback(() => {
    setCollapsed(true);
    Animated.timing(reveal, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [reveal]);

  const expandLabel = useCallback(() => {
    setCollapsed(false);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [reveal]);

  useEffect(() => {
    clearTimers();
    if (!count || !isActive) {
      Animated.timing(enter, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
      reveal.setValue(0);
      setCollapsed(true);
      return () => clearTimers();
    }
    const alreadySeen = hasSeenProductAnchor(videoKey);
    const timer = setTimeout(
      () => {
        setMounted(true);
        Animated.spring(enter, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }).start();
        if (!alreadySeen) {
          expandLabel();
          timers.current.push(
            setTimeout(() => collapseLabel(), EXPANDED_DURATION)
          );
        }
      },
      alreadySeen ? ENTER_DELAY_AFTER_SEEN : ENTER_DELAY_FIRST_VIEW
    );
    timers.current.push(timer);
    return () => clearTimers();
  }, [
    count,
    isActive,
    videoKey,
    enter,
    reveal,
    expandLabel,
    collapseLabel,
    clearTimers,
  ]);

  useEffect(() => {
    if (!mounted || !collapsed) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2800),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 420,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mounted, collapsed, pulse]);

  const onProductPress = useCallback(
    (tag) => {
      const product = tag && tag.id ? tag : normalizeTaggedProduct(tag, video);
      if (showList) {
        setShowList(false);
        setTimeout(
          () => onProductPressProp?.(product),
          Platform.OS === "android" ? 120 : 300
        );
        return;
      }
      onProductPressProp?.(product);
    },
    [onProductPressProp, showList, video]
  );

  const handleAnchorPress = useCallback(() => {
    clearTimers();
    markProductAnchorSeen(videoKey);
    if (count > 1) {
      collapseLabel();
      setShowList(true);
      return;
    }
    onProductPress(items[0]);
  }, [clearTimers, collapseLabel, count, items, onProductPress, videoKey]);

  const handleListSelect = useCallback(
    (tag) => {
      setShowList(false);
      setTimeout(() => onProductPress(tag), 260);
    },
    [onProductPress]
  );

  if (!count || !mounted) return null;

  const primary = items[0];
  const primaryTitle =
    count > 1 ? `${count} products in this video` : getTagTitle(primary);
  const primaryImage = getTagImage(primary, video);
  const primaryPrice = getTagPrice(primary);
  const primaryCurrency = getTagCurrency(primary);
  const isSoldOut = count === 1 && isExplicitlySoldOut(primary);

  return (
    <>
      <Animated.View
        pointerEvents="box-none"
        style={[
          {
            alignSelf: "flex-start",
            opacity: enter,
            transform: [
              {
                translateY: enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.045],
                }),
              },
            ],
          },
          style,
        ]}
      >
        <Pressable
          onPress={handleAnchorPress}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            maxWidth: 270,
            padding: 4,
            borderRadius: 12,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.16)",
            backgroundColor: pressed ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.58)",
          })}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              overflow: "hidden",
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {primaryImage ? (
              <Image
                source={{ uri: primaryImage }}
                style={{
                  width: "100%",
                  height: "100%",
                  opacity: isSoldOut ? 0.5 : 1,
                }}
                contentFit="cover"
                transition={120}
              />
            ) : (
              <ShoppingBag size={16} color={BRAND} />
            )}
            {count > 1 && (
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  paddingHorizontal: 4,
                  backgroundColor: BRAND,
                  borderTopLeftRadius: 6,
                }}
              >
                <Text
                  style={{ color: "#000000", fontSize: 9, fontWeight: "800" }}
                >
                  {count}
                </Text>
              </View>
            )}
          </View>
          <Animated.View
            style={{
              overflow: "hidden",
              opacity: reveal,
              width: labelWidth
                ? reveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, labelWidth],
                  })
                : undefined,
            }}
          >
            <View
              onLayout={(e) => {
                const w = Math.ceil(e.nativeEvent.layout.width);
                if (w > 0 && Math.abs(w - labelWidth) > 1) setLabelWidth(w);
              }}
              style={[
                {
                  flexDirection: "row",
                  alignItems: "center",
                  paddingLeft: 10,
                  paddingRight: 4,
                },
                labelWidth ? { width: labelWidth } : null,
              ]}
            >
              <View style={{ maxWidth: 160 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: "#FFFFFF",
                    fontSize: 12.5,
                    fontWeight: "700",
                  }}
                >
                  {primaryTitle}
                </Text>
                {count > 1 ? (
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 11,
                      marginTop: 1,
                    }}
                  >
                    Tap to view all
                  </Text>
                ) : isSoldOut ? (
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 11,
                      fontWeight: "700",
                      marginTop: 1,
                    }}
                  >
                    Sold out
                  </Text>
                ) : primaryPrice !== null ? (
                  <CurrencyPrice
                    price={primaryPrice}
                    originalCurrency={primaryCurrency}
                    size="small"
                    showOriginal={false}
                    style={{ marginTop: 1 }}
                    textStyle={{
                      color: BRAND,
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  />
                ) : (
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 11,
                      marginTop: 1,
                    }}
                  >
                    Tap to shop
                  </Text>
                )}
              </View>
              <ChevronRight size={15} color="rgba(255,255,255,0.75)" />
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>

      <Modal
        visible={showList}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowList(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}
          onPress={() => setShowList(false)}
        />
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: SCREEN_HEIGHT * 0.62,
            backgroundColor: "#0B0B0B",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            paddingBottom: 28,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.3)",
              marginTop: 10,
            }}
          />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 12,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
              Products in this video
            </Text>
            <TouchableOpacity
              onPress={() => setShowList(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.1)",
              }}
            >
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
          >
            {items.map((tag, index) => {
              const image = getTagImage(tag, video);
              const price = getTagPrice(tag);
              const soldOut = isExplicitlySoldOut(tag);
              return (
                <TouchableOpacity
                  key={getTagId(tag) || `tag-${index}`}
                  activeOpacity={0.85}
                  onPress={() => handleListSelect(tag)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 10,
                    borderRadius: 16,
                    marginBottom: 10,
                    backgroundColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      overflow: "hidden",
                      backgroundColor: "rgba(255,255,255,0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {image ? (
                      <Image
                        source={{ uri: image }}
                        style={{
                          width: "100%",
                          height: "100%",
                          opacity: soldOut ? 0.5 : 1,
                        }}
                        contentFit="cover"
                        transition={120}
                      />
                    ) : (
                      <ShoppingBag size={20} color={BRAND} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: "#FFFFFF",
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      {getTagTitle(tag)}
                    </Text>
                    {soldOut ? (
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.55)",
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        Sold out
                      </Text>
                    ) : price !== null ? (
                      <CurrencyPrice
                        price={price}
                        originalCurrency={getTagCurrency(tag)}
                        size="small"
                        showOriginal={false}
                        style={{ marginTop: 4 }}
                        textStyle={{
                          color: BRAND,
                          fontSize: 13,
                          fontWeight: "800",
                        }}
                      />
                    ) : null}
                  </View>
                  <ChevronRight size={18} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}