// @ts-nocheck
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  FlatList,
  Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Shield,
  Users,
  Truck,
  Check,
  Ban,
  Search,
  ShieldCheck,
  Flag,
  ChevronRight,
  Utensils,
  X,
  MapPin,
  Calendar,
  Phone,
  Car,
  Zap,
} from "lucide-react-native";
import useUser from "@/utils/auth/useUser";
import { useTheme } from "@/utils/theme";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

const BRAND = "#D4AF37";
const SUPPORT_WHATSAPP = "https://wa.me/233543799308";

function safeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString()
    : "No date";
}

function AdminModuleCard({
  title,
  subtitle,
  icon: Icon,
  color,
  pendingCount,
  onPress,
  colors,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: `${color}15`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 16,
        }}
      >
        <Icon size={24} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
          {subtitle}
        </Text>
      </View>
      {pendingCount > 0 ? (
        <View
          style={{
            backgroundColor: "#EF4444",
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginRight: 8,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>
            {pendingCount}
          </Text>
        </View>
      ) : null}
      <ChevronRight size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function ManagementCard({ item, module, onAction, colors, moduleColor }) {
  if (module === "verification") {
    return (
      <View
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
          @{item.username}
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
          {item.email}
        </Text>
        <TouchableOpacity
          onPress={() =>
            onAction(item.id, item.is_verified ? "unverify" : "verify")
          }
          style={{
            backgroundColor: item.is_verified ? "#EF4444" : BRAND,
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: item.is_verified ? "#FFFFFF" : "#000000",
              fontWeight: "700",
            }}
          >
            {item.is_verified ? "Remove verification" : "Grant verification"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (module === "moderation") {
    return (
      <View
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
          {item.category || item.type || "Report"}
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
          {item.description || item.message_text || "No details"}
        </Text>
        <Text style={{ color: colors.textTertiary, marginVertical: 8 }}>
          {safeDate(item.submitted_at || item.created_at)}
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => onAction(item.id, "resolve", "Resolved by admin")}
            style={{
              flex: 1,
              backgroundColor: BRAND,
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#000000", fontWeight: "700" }}>Resolve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onAction(item.id, "dismiss", "Dismissed by admin")}
            style={{
              flex: 1,
              backgroundColor: "#6B7280",
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const docs = [
    ["ID card", item.ghana_card_photo],
    ["Permit", item.business_permit_photo],
    ["Vehicle", item.vehicle_photo],
  ].filter(([, url]) => url);

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
        {item.business_name || item.full_name || "Unnamed"}
      </Text>
      <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
        @{item.username} · {item.email}
      </Text>
      {item.phone_number ? (
        <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
          <Phone size={12} color={colors.textTertiary} /> {item.phone_number}
        </Text>
      ) : null}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}
      >
        <MapPin size={14} color={colors.textTertiary} />
        <Text style={{ color: colors.textSecondary, marginLeft: 8 }}>
          {[item.city, item.region, item.country || "Ghana"]
            .filter(Boolean)
            .join(", ")}
        </Text>
      </View>
      {item.vehicle_type ? (
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}
        >
          <Car size={14} color={colors.textTertiary} />
          <Text style={{ color: colors.textSecondary, marginLeft: 8 }}>
            {item.vehicle_type}
          </Text>
        </View>
      ) : null}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}
      >
        <Calendar size={14} color={colors.textTertiary} />
        <Text style={{ color: colors.textSecondary, marginLeft: 8 }}>
          {safeDate(item.created_at)}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginVertical: 12,
          flexWrap: "wrap",
        }}
      >
        {docs.map(([label, url]) => (
          <TouchableOpacity
            key={label}
            onPress={() =>
              Linking.openURL(url).catch(() =>
                Alert.alert("Could not open document")
              )
            }
            style={{
              backgroundColor: colors.cardBackgroundAlt,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: BRAND, fontSize: 12 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Approve", "Approve this application?", [
              { text: "Cancel", style: "cancel" },
              { text: "Approve", onPress: () => onAction(item.id, "approve") },
            ])
          }
          style={{
            flex: 1,
            backgroundColor: BRAND,
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          <Check size={16} color="#000000" />
          <Text style={{ color: "#000000", fontWeight: "700", marginLeft: 6 }}>
            Approve
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Reject", "Why?", [
              {
                text: "Invalid documents",
                onPress: () => onAction(item.id, "reject", "Invalid documents"),
              },
              {
                text: "Incomplete",
                onPress: () =>
                  onAction(item.id, "reject", "Incomplete information"),
              },
              { text: "Cancel", style: "cancel" },
            ])
          }
          style={{
            flex: 1,
            backgroundColor: "#EF4444",
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          <Ban size={16} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: 6 }}>
            Reject
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ManagementModuleView({ module, onBack, onRefresh, colors, insets }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const loadModuleData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = {
        sellers: "/api/admin/sellers?status=pending",
        foodhubs: "/api/admin/business-centers?status=pending&type=foodhub",
        deliverers: "/api/admin/deliverers?status=pending",
        verification: "/api/admin/users/search",
        moderation: "/api/admin/reports?status=pending",
      }[module];
      const response = await authenticatedFetch(endpoint);
      if (!response.ok) return;
      const result = await response.json();
      const rows =
        result.sellers ||
        result.centers ||
        result.deliverers ||
        result.users ||
        result.reports ||
        result.messages ||
        [];
      setData(
        module === "foodhubs"
          ? rows.filter(
              (row) => !row.center_type || row.center_type === "foodhub"
            )
          : rows
      );
    } catch (error) {
      console.error("Failed to load module data:", error);
    } finally {
      setLoading(false);
    }
  }, [module]);

  useEffect(() => {
    loadModuleData();
  }, [loadModuleData]);

  const filtered = data.filter((item) => {
    const haystack = [
      item.business_name,
      item.full_name,
      item.username,
      item.email,
      item.description,
    ]
      .join(" ")
      .toLowerCase();
    return !searchQuery || haystack.includes(searchQuery.toLowerCase());
  });

  const handleAction = async (itemId, action, reason) => {
    const endpoint = {
      sellers: "/api/admin/sellers",
      foodhubs: "/api/admin/business-centers",
      deliverers: "/api/admin/deliverers",
      verification: "/api/admin/verification",
      moderation: "/api/admin/reports",
    }[module];
    const payload =
      module === "verification"
        ? { userId: itemId, verified: action === "verify" }
        : module === "moderation"
        ? {
            reportId: itemId,
            action: "update_status",
            newStatus: action === "dismiss" ? "dismissed" : "resolved",
            adminNotes: reason || null,
          }
        : module === "foodhubs"
        ? { centerId: itemId, action, reason }
        : module === "deliverers"
        ? { delivererId: itemId, action, reason }
        : { sellerId: itemId, action, reason };
    const response = await authenticatedFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return Alert.alert("Error", "Failed to complete action");
    loadModuleData();
    onRefresh();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={onBack}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "700",
              marginLeft: 16,
            }}
          >
            {module}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.inputBackground,
            borderRadius: 12,
            paddingHorizontal: 12,
            marginTop: 12,
          }}
        >
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor={colors.inputPlaceholder}
            style={{
              flex: 1,
              color: colors.text,
              paddingVertical: 12,
              paddingHorizontal: 8,
            }}
          />
        </View>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.text} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 100,
          }}
          renderItem={({ item }) => (
            <ManagementCard
              item={item}
              module={module}
              onAction={handleAction}
              colors={colors}
              moduleColor={BRAND}
            />
          )}
          ListEmptyComponent={
            <Text
              style={{
                color: colors.textSecondary,
                textAlign: "center",
                marginTop: 40,
              }}
            >
              No pending items
            </Text>
          }
        />
      )}
    </View>
  );
}

export default function AdminDashboardNative() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user, loading } = useUser();
  const colors = useTheme();
  const [selectedModule, setSelectedModule] = useState(null);
  const [pendingCounts, setPendingCounts] = useState({
    sellers: 0,
    foodhubs: 0,
    deliverers: 0,
    reports: 0,
  });
  const [migrating, setMigrating] = useState(false);
  const isAdmin = ["admin", "owner", "moderator"].includes(user?.role);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace("/(tabs)");
  }, [loading, user, isAdmin, router]);

  const loadPendingCounts = useCallback(async () => {
    try {
      const [sellersRes, deliverersRes, centersRes, reportsRes] =
        await Promise.all([
          authenticatedFetch("/api/admin/sellers?status=pending"),
          authenticatedFetch("/api/admin/deliverers?status=pending"),
          authenticatedFetch("/api/admin/business-centers?status=pending"),
          authenticatedFetch("/api/admin/reports?status=pending"),
        ]);
      const sellersData = sellersRes.ok ? await sellersRes.json() : {};
      const deliverersData = deliverersRes.ok ? await deliverersRes.json() : {};
      const centersData = centersRes.ok ? await centersRes.json() : {};
      const reportsData = reportsRes.ok ? await reportsRes.json() : {};
      setPendingCounts({
        sellers: sellersData.stats?.pending || sellersData.sellers?.length || 0,
        foodhubs: (centersData.centers || []).filter(
          (center) => center.center_type === "foodhub"
        ).length,
        deliverers:
          deliverersData.stats?.pending ||
          deliverersData.deliverers?.length ||
          0,
        reports: reportsData.reports?.length || reportsData.stats?.unread || 0,
      });
    } catch (error) {
      console.error("Failed to load pending counts:", error);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin) loadPendingCounts();
  }, [user, isAdmin, loadPendingCounts]);

  if (loading || !user || !isAdmin) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }
  if (selectedModule)
    return (
      <ManagementModuleView
        module={selectedModule}
        onBack={() => setSelectedModule(null)}
        onRefresh={loadPendingCounts}
        colors={colors}
        insets={insets}
      />
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              color: colors.text,
              fontSize: 20,
              fontWeight: "700",
              marginLeft: 16,
            }}
          >
            Admin Control Center
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 100,
        }}
      >
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Shield size={24} color={BRAND} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
            @{user.username}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => Linking.openURL(SUPPORT_WHATSAPP)}
          style={{
            backgroundColor: "#25D366",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
            User support on WhatsApp
          </Text>
          <Text style={{ color: "#FFFFFF", marginTop: 4 }}>
            +233 54 379 9308
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={migrating}
          onPress={() =>
            Alert.alert(
              "Migrate usernames",
              "Set usernames from email for users who have none?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Migrate",
                  onPress: async () => {
                    setMigrating(true);
                    await authenticatedFetch("/api/admin/migrate-usernames", {
                      method: "POST",
                    }).catch(() => {});
                    setMigrating(false);
                  },
                },
              ]
            )
          }
          style={{
            backgroundColor: BRAND,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Zap size={24} color="#000000" />
          <Text style={{ color: "#000000", fontWeight: "700", marginLeft: 12 }}>
            {migrating ? "Migrating..." : "Migrate usernames"}
          </Text>
        </TouchableOpacity>
        <AdminModuleCard
          title="General Sellers"
          subtitle="Physical goods and merchandise"
          icon={Users}
          color={BRAND}
          pendingCount={pendingCounts.sellers}
          onPress={() => setSelectedModule("sellers")}
          colors={colors}
        />
        <AdminModuleCard
          title="Food & Drink Hubs"
          subtitle="Restaurant and drink applications"
          icon={Utensils}
          color={BRAND}
          pendingCount={pendingCounts.foodhubs}
          onPress={() => setSelectedModule("foodhubs")}
          colors={colors}
        />
        <AdminModuleCard
          title="Deliverer Personnel"
          subtitle="Delivery applications"
          icon={Truck}
          color={BRAND}
          pendingCount={pendingCounts.deliverers}
          onPress={() => setSelectedModule("deliverers")}
          colors={colors}
        />
        <AdminModuleCard
          title="Verification Hub"
          subtitle="Blue-check status"
          icon={ShieldCheck}
          color={BRAND}
          pendingCount={0}
          onPress={() => setSelectedModule("verification")}
          colors={colors}
        />
        <AdminModuleCard
          title="Content Moderation"
          subtitle="Reports and disputes"
          icon={Flag}
          color="#EF4444"
          pendingCount={pendingCounts.reports}
          onPress={() => setSelectedModule("moderation")}
          colors={colors}
        />
      </ScrollView>
    </View>
  );
}