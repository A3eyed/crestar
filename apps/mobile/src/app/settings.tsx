// @ts-nocheck
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
  Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ChevronRight,
  Globe,
  Moon,
  Sun,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  User,
  Info,
  FileText,
  Trash2,
  DollarSign,
  Wallet,
  ShoppingBag,
  Share2,
  TrendingUp,
  MessageCircle,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import useLocalization from "../utils/localization";
import { AVAILABLE_LANGUAGES } from "../data/translations";
import useStore from "../utils/store";
import useAuth from "../utils/auth/useAuth";
import useUser from "../utils/auth/useUser";
import { useTheme } from "../utils/theme";
import { authenticatedFetch } from "../utils/authenticatedFetch";

const SUPPORT_WHATSAPP = "233543799308";
const SUPPORT_WHATSAPP_DISPLAY = "+233 54 379 9308";
const SUPPORT_WEBSITE = "https://crestarhq.com/support";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, currency, currencySymbol, t } = useLocalization();
  const { theme, setTheme } = useStore();
  const { signOut } = useAuth();
  const { data: user } = useUser();
  const colors = useTheme();
  const currentLanguageName =
    AVAILABLE_LANGUAGES.find((l) => l.code === language)?.nativeName ||
    "English";

  /**
   * Always leave the settings tree to profile.
   * history.back() can re-enter account-privacy after a privacy → settings
   * navigation and create a settings ↔ privacy loop.
   */
  const handleBack = () => {
    router.replace("/(tabs)/profile");
  };

  const handleLogout = () => {
    Alert.alert(t("logout"), t("logoutConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("logout"),
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t("deleteAccount"), t("deleteAccountConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("deleteMyAccount"),
        style: "destructive",
        onPress: async () => {
          try {
            const response = await authenticatedFetch("/api/account/delete", {
              method: "DELETE",
            });
            const data = await response.json();
            if (!response.ok) {
              if (data.code === "HAS_BALANCE") {
                const formattedBalance = `${currencySymbol}${parseFloat(
                  data.balance || 0
                ).toFixed(2)}`;
                Alert.alert(
                  t("balanceRemaining"),
                  t("balanceRemainingMsg", { amount: formattedBalance })
                );
              } else if (data.code === "HAS_PENDING_ORDERS") {
                Alert.alert(
                  t("pendingOrders"),
                  t("pendingOrdersMsg", { count: data.count })
                );
              } else {
                Alert.alert(
                  t("errorOccurred"),
                  data.error || t("couldNotDelete")
                );
              }
              return;
            }
            Alert.alert(t("deleteAccount"), t("accountDeleted"), [
              {
                text: t("ok"),
                onPress: async () => {
                  await signOut();
                  router.replace("/");
                },
              },
            ]);
          } catch (err) {
            console.error("Delete account error:", err);
            Alert.alert(t("errorOccurred"), t("somethingWentWrong"));
          }
        },
      },
    ]);
  };

  const handleWhatsAppSupport = () => {
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
      "Hi Crestar, I need help with the app."
    )}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("WhatsApp support", SUPPORT_WHATSAPP_DISPLAY);
    });
  };

  const handleOpenSupportSite = () => {
    Linking.openURL(SUPPORT_WEBSITE).catch(() => {
      Alert.alert(t("contactUs"), SUPPORT_WEBSITE);
    });
  };

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleShareProfile = async () => {
    try {
      const username = user?.username || user?.email?.split("@")[0] || "user";
      await Share.share({
        message: `Check out @${username} on Crestar! https://crestarhq.com/seller/${
          user?.id || username
        }`,
      });
    } catch (e) {}
  };

  const settingsSections = [
    {
      title: "Account",
      items: [
        {
          icon: User,
          label: "Manage account",
          subtitle: "Username, name, bio, photo",
          onPress: () => router.push("/edit-profile"),
        },
        {
          icon: Wallet,
          label: "Balance",
          subtitle: "Wallet, withdrawals & transactions",
          onPress: () => router.push("/wallet"),
        },
        {
          icon: ShoppingBag,
          label: "Orders",
          subtitle: "Your order history",
          onPress: () => router.push("/order-history"),
        },
        {
          icon: TrendingUp,
          label: "Creator & seller tools",
          subtitle: "Monetization Center",
          onPress: () => router.push("/monetization-center"),
        },
        { icon: Share2, label: "Share profile", onPress: handleShareProfile },
      ],
    },
    {
      title: t("contentAndDisplay"),
      items: [
        {
          icon: theme === "dark" ? Moon : Sun,
          label: t("darkMode"),
          type: "switch",
          value: theme === "dark",
          onToggle: handleThemeToggle,
        },
        {
          icon: Globe,
          label: t("language"),
          subtitle: currentLanguageName,
          onPress: () => router.push("/settings/language"),
        },
        {
          icon: DollarSign,
          label: t("currency"),
          subtitle: `${currency} (${currencySymbol})`,
          onPress: () => router.push("/settings/currency"),
        },
      ],
    },
    {
      title: t("privacyAndSafety"),
      items: [
        {
          icon: Shield,
          label: t("privacy"),
          subtitle: t("accountPrivacy"),
          onPress: () => router.push("/account-privacy"),
        },
        {
          icon: Bell,
          label: t("pushNotifications"),
          subtitle: t("manageNotifications"),
          onPress: () =>
            Alert.alert(t("comingSoon"), t("notificationComingSoon")),
        },
      ],
    },
    {
      title: t("supportAndAbout"),
      items: [
        {
          icon: MessageCircle,
          label: "WhatsApp support",
          subtitle: SUPPORT_WHATSAPP_DISPLAY,
          onPress: handleWhatsAppSupport,
        },
        {
          icon: HelpCircle,
          label: t("reportProblem"),
          onPress: () => router.push("/support-chat"),
        },
        {
          icon: FileText,
          label: t("termsOfService"),
          onPress: () => router.push("/terms"),
        },
        {
          icon: FileText,
          label: t("privacyPolicy"),
          onPress: () => router.push("/privacy"),
        },
        {
          icon: Info,
          label: t("about"),
          subtitle: "Crestar v1.0.0",
          onPress: () => {},
        },
      ],
    },
  ];

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
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        <TouchableOpacity onPress={handleBack} accessibilityRole="button">
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
          {t("settingsAndPrivacy")}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.push("/edit-profile")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.cardBackgroundAlt,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Text
              style={{ color: colors.text, fontSize: 28, fontWeight: "700" }}
            >
              {(user?.display_name || user?.name || user?.email)
                ?.charAt(0)
                .toUpperCase() || "U"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: "700",
                marginBottom: 2,
              }}
            >
              {user?.display_name || user?.name || "User"}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: 14 }}>
              @{user?.username || user?.email?.split("@")[0] || "user"}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textTertiary} />
        </TouchableOpacity>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={{ marginTop: 24 }}>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 13,
                fontWeight: "600",
                marginBottom: 8,
                marginLeft: 16,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {section.title}
            </Text>
            <View style={{ backgroundColor: colors.background }}>
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex}>
                  <TouchableOpacity
                    onPress={item.onPress}
                    disabled={item.type === "switch"}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <item.icon size={22} color={colors.icon} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 16,
                          fontWeight: "500",
                        }}
                      >
                        {item.label}
                      </Text>
                      {item.subtitle && (
                        <Text
                          style={{
                            color: colors.textTertiary,
                            fontSize: 13,
                            marginTop: 2,
                          }}
                        >
                          {item.subtitle}
                        </Text>
                      )}
                    </View>
                    {item.type === "switch" ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{
                          false: colors.inputBackground,
                          true: colors.text,
                        }}
                        thumbColor={colors.background}
                      />
                    ) : (
                      <ChevronRight size={20} color={colors.textTertiary} />
                    )}
                  </TouchableOpacity>
                  {itemIndex < section.items.length - 1 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: colors.borderLight,
                        marginLeft: 60,
                      }}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 14,
              borderRadius: 8,
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.3)",
            }}
          >
            <LogOut size={20} color={colors.error} />
            <Text
              style={{
                color: colors.error,
                fontSize: 16,
                fontWeight: "600",
                marginLeft: 8,
              }}
            >
              {t("logout")}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 12, paddingHorizontal: 16 }}>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 14,
              borderRadius: 8,
              backgroundColor: "transparent",
            }}
          >
            <Trash2 size={18} color={colors.textTertiary} />
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 15,
                fontWeight: "500",
                marginLeft: 8,
              }}
            >
              {t("deleteAccount")}
            </Text>
          </TouchableOpacity>
        </View>
        <View
          style={{ marginTop: 20, paddingHorizontal: 16, alignItems: "center" }}
        >
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 13,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Need a hand? Message Crestar Support on WhatsApp.
          </Text>
          <TouchableOpacity
            onPress={handleWhatsAppSupport}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.cardBackground,
            }}
          >
            <MessageCircle size={16} color="#25D366" />
            <Text style={{ color: "#25D366", fontSize: 14, fontWeight: "600" }}>
              {SUPPORT_WHATSAPP_DISPLAY}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpenSupportSite}
            style={{ marginTop: 10 }}
          >
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 13,
                textDecorationLine: "underline",
              }}
            >
              crestarhq.com/support
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
