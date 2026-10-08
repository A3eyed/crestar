// @ts-nocheck
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Shield,
  Eye,
  EyeOff,
  UserX,
  UserPlus,
  Search,
} from "lucide-react-native";
import { useState, useEffect } from "react";
import { useTheme } from "../utils/theme";
import useLocalization from "../utils/localization";
import { authenticatedFetch } from "../utils/authenticatedFetch";

export default function AccountPrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();
  const { t } = useLocalization();

  // Account privacy settings state
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [hideFromSearch, setHideFromSearch] = useState(false);
  const [allowMessages, setAllowMessages] = useState(true);

  // Blocked accounts state
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockUsername, setBlockUsername] = useState("");
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch blocked users on mount
  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch("/api/moderation/block");
      const data = await response.json();

      if (response.ok) {
        setBlockedUsers(data.blocked_users || []);
      } else {
        console.error("Failed to fetch blocked users:", data.error);
      }
    } catch (error) {
      console.error("Error fetching blocked users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!blockUsername.trim()) {
      Alert.alert(t("error"), t("enterUsername"));
      return;
    }

    try {
      setActionLoading(true);
      const response = await authenticatedFetch("/api/moderation/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: blockUsername.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(t("success"), t("blockedSuccess"));
        setBlockUsername("");
        setBlockModalVisible(false);
        fetchBlockedUsers(); // Refresh list
      } else {
        Alert.alert(t("error"), data.error || t("blockError"));
      }
    } catch (error) {
      console.error("Block user error:", error);
      Alert.alert(t("error"), t("blockError"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockUser = (username) => {
    Alert.alert(
      t("unblockUser"),
      t("unblockConfirm", { username: `@${username}` }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("unblock"),
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              const response = await authenticatedFetch(
                "/api/moderation/block",
                {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ username }),
                },
              );

              const data = await response.json();

              if (response.ok) {
                Alert.alert(t("success"), t("unblockedSuccess"));
                fetchBlockedUsers(); // Refresh list
              } else {
                Alert.alert(t("error"), data.error || t("unblockError"));
              }
            } catch (error) {
              console.error("Unblock user error:", error);
              Alert.alert(t("error"), t("unblockError"));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const showBlockUserInput = () => {
    Alert.prompt(
      t("blockUser"),
      t("enterUsername"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("block"),
          style: "destructive",
          onPress: async (username) => {
            if (!username || !username.trim()) {
              Alert.alert(t("error"), t("enterUsername"));
              return;
            }

            try {
              setActionLoading(true);
              const response = await authenticatedFetch(
                "/api/moderation/block",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ username: username.trim() }),
                },
              );

              const data = await response.json();

              if (response.ok) {
                Alert.alert(t("success"), t("blockedSuccess"));
                fetchBlockedUsers(); // Refresh list
              } else {
                Alert.alert(t("error"), data.error || t("blockError"));
              }
            } catch (error) {
              console.error("Block user error:", error);
              Alert.alert(t("error"), t("blockError"));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
      "plain-text",
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/settings");
    }
  };

  const renderBlockedUser = ({ item }) => (
    <View
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
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.cardBackgroundAlt,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
          {(item.display_name || item.username)?.charAt(0).toUpperCase() || "?"}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
          {item.display_name || item.username}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: 14 }}>
          @{item.username}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleUnblockUser(item.username)}
        disabled={actionLoading}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: colors.cardBackgroundAlt,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          {t("unblock")}
        </Text>
      </TouchableOpacity>
    </View>
  );

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
        <TouchableOpacity onPress={handleBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
          {t("privacy")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Privacy Settings Section */}
        <View style={{ marginTop: 24 }}>
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
            {t("accountPrivacySettings")}
          </Text>
          <View style={{ backgroundColor: colors.background }}>
            {/* Private Account Toggle */}
            <View
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
                {isPrivateAccount ? (
                  <EyeOff size={22} color={colors.icon} />
                ) : (
                  <Eye size={22} color={colors.icon} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "500",
                  }}
                >
                  {t("privateAccount")}
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  {t("privateAccountDesc")}
                </Text>
              </View>
              <Switch
                value={isPrivateAccount}
                onValueChange={setIsPrivateAccount}
                trackColor={{
                  false: colors.inputBackground,
                  true: colors.text,
                }}
                thumbColor={colors.background}
              />
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: colors.borderLight,
                marginLeft: 60,
              }}
            />

            {/* Hide from Search Toggle */}
            <View
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
                <Search size={22} color={colors.icon} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "500",
                  }}
                >
                  {t("hideFromSearch")}
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  {t("hideFromSearchDesc")}
                </Text>
              </View>
              <Switch
                value={hideFromSearch}
                onValueChange={setHideFromSearch}
                trackColor={{
                  false: colors.inputBackground,
                  true: colors.text,
                }}
                thumbColor={colors.background}
              />
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: colors.borderLight,
                marginLeft: 60,
              }}
            />

            {/* Allow Messages Toggle */}
            <View
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
                <Shield size={22} color={colors.icon} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "500",
                  }}
                >
                  {t("allowMessages")}
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  {t("allowMessagesDesc")}
                </Text>
              </View>
              <Switch
                value={allowMessages}
                onValueChange={setAllowMessages}
                trackColor={{
                  false: colors.inputBackground,
                  true: colors.text,
                }}
                thumbColor={colors.background}
              />
            </View>
          </View>
        </View>

        {/* Blocked Accounts Section */}
        <View style={{ marginTop: 32 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              marginHorizontal: 16,
            }}
          >
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 13,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {t("blockedAccounts")}
            </Text>
            <TouchableOpacity
              onPress={showBlockUserInput}
              disabled={actionLoading}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: colors.cardBackgroundAlt,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <UserX size={16} color={colors.text} />
              <Text
                style={{
                  color: colors.text,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {t("blockUser")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: colors.background }}>
            {loading ? (
              <View
                style={{
                  padding: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator size="large" color={colors.text} />
              </View>
            ) : blockedUsers.length === 0 ? (
              <View
                style={{
                  padding: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserPlus size={48} color={colors.textTertiary} />
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 16,
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  {t("noBlockedUsers")}
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 14,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  {t("noBlockedUsersDesc")}
                </Text>
              </View>
            ) : (
              <FlatList
                data={blockedUsers}
                renderItem={renderBlockedUser}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
