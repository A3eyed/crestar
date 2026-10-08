// @ts-nocheck
import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Bike,
  Car,
  User2,
  Star,
  Package,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import useAuth from "../utils/auth/useAuth";
import { useTheme } from "../utils/theme";

const VEHICLE_ICONS = {
  motorcycle: "🏍️",
  bicycle: "🚲",
  car: "🚗",
  walking: "🚶",
};

export default function DelivererRequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();
  const { isAuthenticated, signIn } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRequests();
    }
  }, [isAuthenticated]);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/deliverers/seller-requests?role=seller");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAction = async (requestId, action, delivererName) => {
    const actionLabel = action === "accept" ? "Accept" : "Decline";
    Alert.alert(
      `${actionLabel} Deliverer`,
      `${actionLabel} ${delivererName} as your deliverer?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionLabel,
          style: action === "decline" ? "destructive" : "default",
          onPress: async () => {
            setProcessingId(requestId);
            try {
              const res = await fetch("/api/deliverers/seller-requests", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId, action }),
              });
              if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed");
              }
              Alert.alert(
                "Done!",
                `Deliverer has been ${action === "accept" ? "accepted" : "declined"}.`,
              );
              fetchRequests();
            } catch (error) {
              Alert.alert("Error", error.message);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const acceptedRequests = requests.filter((r) => r.status === "accepted");
  const declinedRequests = requests.filter((r) => r.status === "declined");

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
        <User2 size={56} color={colors.textTertiary} />
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
          Sign in to view requests
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
          You need to be signed in to manage deliverer requests.
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

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
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
          Deliverer Requests
        </Text>
        {pendingRequests.length > 0 && (
          <View
            style={{
              backgroundColor: colors.accent,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>
              {pendingRequests.length}
            </Text>
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
              fetchRequests();
            }}
            tintColor={colors.text}
          />
        }
      >
        {requests.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <User2 size={48} color={colors.textTertiary} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 16,
                marginTop: 16,
              }}
            >
              No deliverer requests yet
            </Text>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 14,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Deliverers will request to partner with you to deliver your orders
            </Text>
          </View>
        )}

        {/* Pending */}
        {pendingRequests.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 12,
              }}
            >
              Pending ({pendingRequests.length})
            </Text>
            {pendingRequests.map((req) => (
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
                    borderColor: "rgba(255, 184, 0, 0.3)",
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
                        backgroundColor: "rgba(255, 184, 0, 0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>
                        {VEHICLE_ICONS[req.vehicle_type] || "🚶"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 16,
                          fontWeight: "700",
                        }}
                      >
                        {req.deliverer_name}
                      </Text>
                      <Text
                        style={{ color: colors.textTertiary, fontSize: 13 }}
                      >
                        {req.vehicle_type} • {req.total_deliveries || 0}{" "}
                        deliveries
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Star size={14} color="#FFB800" fill="#FFB800" />
                      <Text
                        style={{
                          color: "#FFB800",
                          fontSize: 15,
                          fontWeight: "700",
                        }}
                      >
                        {parseFloat(req.deliverer_rating || 5).toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  {req.message && (
                    <View
                      style={{
                        backgroundColor: colors.inputBackground,
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 14,
                          fontStyle: "italic",
                          lineHeight: 20,
                        }}
                      >
                        "{req.message}"
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      onPress={() =>
                        handleAction(req.id, "decline", req.deliverer_name)
                      }
                      disabled={processingId === req.id}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: "rgba(239, 68, 68, 0.12)",
                        borderWidth: 1,
                        borderColor: "rgba(239, 68, 68, 0.3)",
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <XCircle size={18} color={colors.error} />
                      <Text
                        style={{
                          color: colors.error,
                          fontSize: 15,
                          fontWeight: "600",
                        }}
                      >
                        Decline
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        handleAction(req.id, "accept", req.deliverer_name)
                      }
                      disabled={processingId === req.id}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: "#D4AF37",
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {processingId === req.id ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <CheckCircle2 size={18} color="#FFFFFF" />
                          <Text
                            style={{
                              color: "#FFFFFF",
                              fontSize: 15,
                              fontWeight: "700",
                            }}
                          >
                            Accept
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </BlurView>
              </View>
            ))}
          </View>
        )}

        {/* Accepted */}
        {acceptedRequests.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 12,
              }}
            >
              Your Deliverers ({acceptedRequests.length})
            </Text>
            {acceptedRequests.map((req) => (
              <View
                key={req.id}
                style={{
                  overflow: "hidden",
                  borderRadius: 12,
                  marginBottom: 10,
                }}
              >
                <BlurView
                  intensity={40}
                  tint={colors.glass.tint}
                  style={{
                    padding: 14,
                    borderWidth: 1,
                    borderColor: "rgba(212, 175, 55, 0.2)",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "rgba(212, 175, 55, 0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <CheckCircle2 size={20} color="#D4AF37" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 15,
                        fontWeight: "600",
                      }}
                    >
                      {req.deliverer_name}
                    </Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                      {VEHICLE_ICONS[req.vehicle_type] || ""} {req.vehicle_type}{" "}
                      • ⭐ {parseFloat(req.deliverer_rating || 5).toFixed(1)} •{" "}
                      {req.successful_deliveries || 0} completed
                    </Text>
                  </View>
                </BlurView>
              </View>
            ))}
          </View>
        )}

        {/* Declined */}
        {declinedRequests.length > 0 && (
          <View>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 12,
              }}
            >
              Declined
            </Text>
            {declinedRequests.map((req) => (
              <View
                key={req.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderLight,
                  opacity: 0.6,
                }}
              >
                <XCircle
                  size={18}
                  color={colors.textTertiary}
                  style={{ marginRight: 12 }}
                />
                <Text style={{ color: colors.textTertiary, fontSize: 14 }}>
                  {req.deliverer_name} — {req.vehicle_type}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
