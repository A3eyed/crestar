// @ts-nocheck
import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Search,
  Store,
  MapPin,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  MessageCircle,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import useAuth from "../utils/auth/useAuth";
import { useTheme } from "../utils/theme";

export default function BrowseSellersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();
  const { isAuthenticated, signIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("available");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableSellers, setAvailableSellers] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [sendingRequest, setSendingRequest] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const response = await fetch(
        "/api/deliverers/seller-requests?role=deliverer",
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableSellers(data.availableSellers || []);
        setMyRequests(data.myRequests || []);
      }
    } catch (error) {
      console.error("Failed to fetch sellers:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSendRequest = async (sellerUserId, sellerName) => {
    setSendingRequest(sellerUserId);
    try {
      const response = await fetch("/api/deliverers/seller-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerUserId,
          message: `Hi! I'd like to deliver for ${sellerName}.`,
        }),
      });
      if (!response.ok) {
        const e = await response.json();
        throw new Error(e.error || "Failed");
      }
      Alert.alert(
        "Request Sent!",
        `Your request to deliver for ${sellerName} has been sent.`,
      );
      fetchData();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSendingRequest(null);
    }
  };

  const filteredSellers = availableSellers.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      (s.business_name || s.full_name || "").toLowerCase().includes(q) ||
      (s.city || "").toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    const styles = {
      pending: {
        bg: "rgba(255, 184, 0, 0.15)",
        color: "#FFB800",
        icon: Clock,
        label: "Pending",
      },
      accepted: {
        bg: "rgba(212, 175, 55, 0.15)",
        color: "#D4AF37",
        icon: CheckCircle2,
        label: "Accepted",
      },
      declined: {
        bg: "rgba(239, 68, 68, 0.15)",
        color: colors.error,
        icon: XCircle,
        label: "Declined",
      },
    };
    return styles[status] || styles.pending;
  };

  if (!isAuthenticated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <StatusBar style={colors.statusBar} />
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: "absolute",
            top: insets.top + 12,
            left: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.inputBackground,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Store size={56} color={colors.textTertiary} />
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: "700",
            marginTop: 20,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Sign in to browse sellers
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            textAlign: "center",
            marginBottom: 28,
            lineHeight: 22,
          }}
        >
          You need to be signed in to find sellers to deliver for.
        </Text>
        <TouchableOpacity
          onPress={() => signIn()}
          style={{
            backgroundColor: "#111827",
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 40,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
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
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StatusBar style={colors.statusBar} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />
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
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
            Find Sellers
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          {[
            {
              id: "available",
              label: "Available",
              count: filteredSellers.length,
            },
            { id: "requests", label: "My Requests", count: myRequests.length },
          ].map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor:
                  tab === t.id ? colors.accent : colors.inputBackground,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Text
                style={{
                  color: tab === t.id ? "#FFFFFF" : colors.text,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {t.label}
              </Text>
              <View
                style={{
                  backgroundColor:
                    tab === t.id ? "rgba(255,255,255,0.3)" : colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    color: tab === t.id ? "#FFFFFF" : colors.textSecondary,
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  {t.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {tab === "available" && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.inputBackground,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: colors.inputBorder,
            }}
          >
            <Search size={18} color={colors.iconSecondary} />
            <TextInput
              placeholder="Search sellers..."
              placeholderTextColor={colors.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                flex: 1,
                marginLeft: 8,
                color: colors.text,
                fontSize: 15,
              }}
            />
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor={colors.text}
          />
        }
      >
        {tab === "available" ? (
          filteredSellers.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Store size={48} color={colors.textTertiary} />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 16,
                  marginTop: 16,
                }}
              >
                No sellers available right now
              </Text>
            </View>
          ) : (
            filteredSellers.map((seller) => (
              <View
                key={seller.user_id}
                style={{
                  overflow: "hidden",
                  borderRadius: 16,
                  marginBottom: 12,
                }}
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
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: "#D4AF37",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Store size={24} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 16,
                          fontWeight: "700",
                        }}
                      >
                        {seller.business_name || seller.full_name}
                      </Text>
                      {seller.city && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 4,
                          }}
                        >
                          <MapPin size={12} color={colors.textTertiary} />
                          <Text
                            style={{ color: colors.textTertiary, fontSize: 12 }}
                          >
                            {seller.city}, {seller.region}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View
                    style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Package size={14} color={colors.textSecondary} />
                      <Text
                        style={{ color: colors.textSecondary, fontSize: 13 }}
                      >
                        {seller.product_count} products
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <MapPin size={14} color={colors.textSecondary} />
                      <Text
                        style={{ color: colors.textSecondary, fontSize: 13 }}
                      >
                        {seller.delivery_zone_count} zones
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      handleSendRequest(
                        seller.user_id,
                        seller.business_name || seller.full_name,
                      )
                    }
                    disabled={sendingRequest === seller.user_id}
                    style={{
                      backgroundColor: colors.accent,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {sendingRequest === seller.user_id ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Send size={16} color="#FFFFFF" />
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 15,
                            fontWeight: "700",
                          }}
                        >
                          Request to Deliver
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </BlurView>
              </View>
            ))
          )
        ) : myRequests.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <MessageCircle size={48} color={colors.textTertiary} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 16,
                marginTop: 16,
              }}
            >
              No requests sent yet
            </Text>
          </View>
        ) : (
          myRequests.map((req) => {
            const badge = getStatusBadge(req.status);
            const BadgeIcon = badge.icon;
            return (
              <View
                key={req.id}
                style={{
                  overflow: "hidden",
                  borderRadius: 16,
                  marginBottom: 12,
                }}
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
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      {req.business_name || req.seller_name}
                    </Text>
                    <View
                      style={{
                        backgroundColor: badge.bg,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <BadgeIcon size={12} color={badge.color} />
                      <Text
                        style={{
                          color: badge.color,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {badge.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
                    {req.seller_type === "food_beverage"
                      ? "🍽️ Food & Beverage"
                      : "📦 Physical Goods"}
                    {req.city ? ` • ${req.city}` : ""}
                  </Text>
                </BlurView>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
