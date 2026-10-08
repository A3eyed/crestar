// @ts-nocheck
import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  FlatList,
  Dimensions,
  Text,
  TouchableOpacity,
  AppState,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useIsFocused } from "expo-router";
import { RefreshCw, Video } from "lucide-react-native";
import useLocalization from "@/utils/localization";
import FeedProductSheet from "@/components/FeedProductSheet";
import { useLiveSessions } from "@/hooks/useLiveSessions";
import { useSearch } from "@/hooks/useSearch";
import useBootStore from "@/utils/bootStore";
import { VideoItem } from "@/components/FeedScreen/VideoItem";
import { TopBar } from "@/components/FeedScreen/TopBar";
import { LiveSessionsBanner } from "@/components/FeedScreen/LiveSessionsBanner";
import { SearchModal } from "@/components/FeedScreen/SearchModal";
import SafeBoundary from "@/components/SafeBoundary";
import { getProductImage } from "@/utils/feedHelpers";
import { getTaggedItems, normalizeTaggedProduct } from "@/utils/taggedProducts";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isFocused = useIsFocused();
  const { formatCurrency, t } = useLocalization();
  const [activeIndex, setActiveIndex] = useState(0);
  const [appActive, setAppActive] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sheetProducts, setSheetProducts] = useState([]);
  const productSheetRef = useRef(null);
  const flatListRef = useRef(null);
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const hasLoadedOnce = useRef(false);
  const { liveSessions } = useLiveSessions();
  const {
    searchQuery,
    searchResults,
    searching,
    searchTab,
    setSearchTab,
    handleSearch,
    clearSearch,
  } = useSearch();
  const markFeedReady = useBootStore((state) => state.markFeedReady);
  const feedVisible = isFocused && appActive && !showSearch && !selectedProduct;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) =>
      setAppActive(state === "active")
    );
    return () => sub.remove();
  }, []);

  const fetchFeed = useCallback(
    async function run(retryCount = 0) {
      try {
        if (retryCount === 0) {
          setLoading(true);
          setFeedError(false);
        }
        const { useAuthStore } = require("@/utils/auth/store");
        const { auth } = useAuthStore.getState();
        const headers = auth?.jwt
          ? { Authorization: `Bearer ${auth.jwt}` }
          : {};
        const response = await fetch(
          `/api/feed?limit=20&offset=0&_t=${Date.now()}`,
          { headers }
        );
        if (!response.ok)
          throw new Error(`Feed API returned ${response.status}`);
        const data = await response.json();
        setFeedItems(data.feedItems || []);
        setFeedError(false);
        markFeedReady();
      } catch (err) {
        if (retryCount < 2) {
          setTimeout(() => run(retryCount + 1), (retryCount + 1) * 1500);
          return;
        }
        setFeedItems([]);
        setFeedError(true);
        markFeedReady();
      } finally {
        hasLoadedOnce.current = true;
        setLoading(false);
      }
    },
    [markFeedReady]
  );

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index || 0);
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const handleProductPress = (product, video) => {
    const source = video || feedItems[activeIndex];
    const products = getTaggedItems(source).map((tag) =>
      normalizeTaggedProduct(tag, source)
    );
    const chosen = product?.id ? product : products[0];
    if (!chosen?.id) return;
    setSheetProducts(products.length ? products : [chosen]);
    setSelectedProduct(chosen);
    setTimeout(() => productSheetRef.current?.snapToIndex?.(0), 40);
  };

  const handleSessionPress = (session) => {
    router.push({
      pathname: "/live/watch",
      params: {
        sessionId: session.id,
        host: session.display_name || session.business_name || session.username,
        avatar: session.profile_image || "",
        thumbnail: session.thumbnail || "",
        viewers: session.viewer_count?.toString() || "0",
        verified: session.is_verified ? "true" : "false",
      },
    });
  };

  if (loading && !hasLoadedOnce.current)
    return (
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <StatusBar style="light" />
      </View>
    );

  if (feedItems.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <StatusBar style="light" />
        <TopBar
          insets={insets}
          onSearchPress={() => setShowSearch(true)}
          liveSessions={liveSessions}
          onLivePress={() =>
            liveSessions?.[0] && handleSessionPress(liveSessions[0])
          }
        />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <Video size={56} color="rgba(255,255,255,0.2)" />
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 18,
              fontWeight: "700",
              marginTop: 20,
            }}
          >
            {feedError ? t("somethingWentWrong") : t("noVideosYet")}
          </Text>
          <TouchableOpacity
            onPress={() => fetchFeed(0)}
            style={{
              marginTop: 28,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(255,255,255,0.1)",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>
              {t("refresh")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" />
      <TopBar
        insets={insets}
        onSearchPress={() => setShowSearch(true)}
        liveSessions={liveSessions}
        onLivePress={() =>
          liveSessions?.[0] && handleSessionPress(liveSessions[0])
        }
      />
      <LiveSessionsBanner
        insets={insets}
        liveSessions={liveSessions}
        onSessionPress={handleSessionPress}
      />
      <SearchModal
        visible={showSearch}
        insets={insets}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        onClose={() => {
          setShowSearch(false);
          clearSearch();
        }}
        searching={searching}
        searchResults={searchResults}
        searchTab={searchTab}
        onTabChange={(tabId) => {
          setSearchTab(tabId);
          if (searchQuery.trim()) handleSearch(searchQuery);
        }}
        onUserPress={(userId) => {
          setShowSearch(false);
          router.push(`/seller/${userId}`);
        }}
        onProductPress={(productId) => {
          setShowSearch(false);
          router.push(`/product/${productId}`);
        }}
        formatCurrency={formatCurrency}
        getProductImage={getProductImage}
      />
      <FlatList
        ref={flatListRef}
        data={feedItems}
        renderItem={({ item, index }) => (
          <SafeBoundary name={`VideoItem:${item?.id}`}>
            <VideoItem
              item={item}
              isActive={feedVisible && index === activeIndex}
              onProductPress={(product) => handleProductPress(product, item)}
            />
          </SafeBoundary>
        )}
        keyExtractor={(item, index) => String(item.id || index)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        onRefresh={() => fetchFeed(0)}
        refreshing={loading}
      />
      <SafeBoundary name="FeedProductSheet">
        <FeedProductSheet
          ref={productSheetRef}
          product={selectedProduct}
          products={sheetProducts}
          onSelectProduct={setSelectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      </SafeBoundary>
    </View>
  );
}