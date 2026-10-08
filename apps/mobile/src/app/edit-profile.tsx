// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronRight, Camera, AlertCircle } from "lucide-react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import useUpload from "../utils/useUpload";
import useUser from "../utils/auth/useUser";
import { useAuthStore } from "../utils/auth/store";
import { useTheme } from "../utils/theme";
import { authenticatedFetch } from "../utils/authenticatedFetch";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const FIELD_CONFIG = {
  name: { label: "Name", maxLength: 30, placeholder: "Add your name" },
  username: { label: "Username", maxLength: 24, placeholder: "Add username" },
  bio: {
    label: "Bio",
    maxLength: 80,
    placeholder: "Add a bio to your profile",
    multiline: true,
  },
};

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user, refetch } = useUser();
  const { auth, setAuth } = useAuthStore();
  const [upload, { loading: uploading }] = useUpload();
  const colors = useTheme();

  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
    profileImage: null,
  });
  const [originalData, setOriginalData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const saveCompletedRef = useRef(false);

  useEffect(() => {
    if (user && !saveCompletedRef.current) {
      fetchProfile();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    try {
      const response = await authenticatedFetch("/api/profile/update");
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setProfileData(data.user);
          const initial = {
            username: data.user.username || user?.username || "",
            displayName:
              data.user.display_name || data.user.name || user?.name || "",
            bio: data.user.bio || "",
            profileImage: data.user.profile_image || null,
          };
          setFormData(initial);
          setOriginalData(initial);
          return;
        }
      }
    } catch (error) {
      console.error("Fetch profile error:", error);
    }

    // Fallback: populate from the cached user object when API fails
    if (user) {
      const fallback = {
        username: user.username || "",
        displayName: user.display_name || user.name || "",
        bio: user.bio || "",
        profileImage: user.profile_image || user.image || null,
      };
      setFormData(fallback);
      setOriginalData(fallback);
    }
  };

  const hasChanges =
    originalData &&
    (formData.displayName !== originalData.displayName ||
      formData.username !== originalData.username ||
      formData.bio !== originalData.bio ||
      formData.profileImage !== originalData.profileImage);

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const { url, error } = await upload({
        reactNativeAsset: result.assets[0],
      });
      if (error) {
        Alert.alert("Upload Failed", error);
        return;
      }
      setFormData((prev) => ({ ...prev, profileImage: url }));
    }
  };

  const openEditModal = (field) => {
    let value = "";
    if (field === "name") value = formData.displayName;
    else if (field === "username") value = formData.username;
    else if (field === "bio") value = formData.bio;

    setEditValue(value);
    setEditingField(field);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeEditModal = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setEditingField(null);
      setEditValue("");
    });
  };

  const saveFieldEdit = () => {
    if (editingField === "name") {
      setFormData((prev) => ({ ...prev, displayName: editValue }));
    } else if (editingField === "username") {
      setFormData((prev) => ({ ...prev, username: editValue.toLowerCase() }));
    } else if (editingField === "bio") {
      setFormData((prev) => ({ ...prev, bio: editValue }));
    }
    closeEditModal();
  };

  const handleSave = async () => {
    if (!hasChanges) {
      router.back();
      return;
    }

    setIsSubmitting(true);
    try {
      // Update profile (name, bio, image)
      const response = await authenticatedFetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: formData.displayName,
          bio: formData.bio,
          profileImage: formData.profileImage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      // If username changed, update separately
      const usernameChanged =
        formData.username !== (originalData?.username || "");
      if (usernameChanged && formData.username.trim().length >= 2) {
        if (profileData?.canChangeUsernameIn > 0) {
          Alert.alert(
            "Username Change Limit",
            `You can change your username again in ${profileData.canChangeUsernameIn} days.`,
          );
          setIsSubmitting(false);
          return;
        }

        const usernameRes = await authenticatedFetch(
          "/api/profile/update-username",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: formData.username }),
          },
        );
        const usernameData = await usernameRes.json();
        if (!usernameRes.ok) {
          throw new Error(usernameData.error || "Failed to update username");
        }

        // ✅ FIXED: Update auth store immediately so UI shows new username
        if (usernameData.user && auth) {
          await setAuth({
            ...auth,
            user: {
              ...auth.user,
              username: usernameData.user.username,
            },
          });
        }
      }

      // ✅ FIXED: Also update auth store with display_name, bio, and profile_image
      if (data.user && auth) {
        await setAuth({
          ...auth,
          user: {
            ...auth.user,
            display_name: data.user.display_name,
            bio: data.user.bio,
            profile_image: data.user.profile_image,
            name: data.user.name,
          },
        });
      }

      saveCompletedRef.current = true;
      await refetch();
      router.back();
    } catch (error) {
      console.error("Update profile error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldConfig = editingField ? FIELD_CONFIG[editingField] : null;

  const fields = [
    {
      id: "name",
      label: "Name",
      value: formData.displayName,
      displayValue: formData.displayName || "Add name",
      isEmpty: !formData.displayName,
    },
    {
      id: "username",
      label: "Username",
      value: formData.username,
      displayValue: formData.username
        ? `@${formData.username}`
        : "Add username",
      isEmpty: !formData.username,
      subtitle:
        profileData?.canChangeUsernameIn > 0
          ? `Can change in ${profileData.canChangeUsernameIn}d`
          : null,
    },
    {
      id: "bio",
      label: "Bio",
      value: formData.bio,
      displayValue: formData.bio || "Add a bio",
      isEmpty: !formData.bio,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />

      {/* TikTok-style header: Cancel | Title | Save */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ minWidth: 60 }}
        >
          <Text style={{ color: colors.text, fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>

        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}>
          Edit profile
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ minWidth: 60, alignItems: "flex-end" }}
        >
          <Text
            style={{
              color: hasChanges ? colors.text : colors.textTertiary,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            {isSubmitting ? "Saving" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Photo Section */}
        <TouchableOpacity
          onPress={handleImagePick}
          disabled={uploading}
          activeOpacity={0.7}
          style={{
            alignItems: "center",
            paddingVertical: 28,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ position: "relative", marginBottom: 12 }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: colors.cardBackgroundAlt,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {formData.profileImage ? (
                <Image
                  source={{ uri: formData.profileImage }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 40,
                    fontWeight: "700",
                  }}
                >
                  {(formData.displayName || user?.name || user?.email)
                    ?.charAt(0)
                    .toUpperCase() || "U"}
                </Text>
              )}
            </View>

            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: -2,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.cardBackgroundAlt,
                borderWidth: 2,
                borderColor: colors.background,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Camera size={16} color={colors.text} />
            </View>
          </View>

          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            {uploading ? "Uploading..." : "Change photo"}
          </Text>
        </TouchableOpacity>

        {/* Field Rows - TikTok style */}
        <View>
          {fields.map((field, index) => (
            <TouchableOpacity
              key={field.id}
              onPress={() => openEditModal(field.id)}
              activeOpacity={0.6}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.borderLight,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: "400",
                  width: 100,
                }}
              >
                {field.label}
              </Text>

              <View style={{ flex: 1, marginRight: 8 }}>
                <Text
                  style={{
                    color: field.isEmpty ? colors.textTertiary : colors.text,
                    fontSize: 15,
                  }}
                  numberOfLines={1}
                >
                  {field.displayValue}
                </Text>
                {field.subtitle && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    <AlertCircle size={12} color="#F59E0B" />
                    <Text style={{ color: "#F59E0B", fontSize: 11 }}>
                      {field.subtitle}
                    </Text>
                  </View>
                )}
              </View>

              <ChevronRight size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Helpful info */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 13,
              lineHeight: 18,
              textAlign: "center",
            }}
          >
            Your profile info is visible to everyone on Crestar. Changes to your
            name and bio take effect immediately.
          </Text>
        </View>
      </ScrollView>

      {/* Field Edit Modal - slides up from bottom like TikTok */}
      {editingField !== null && (
        <Modal
          visible={true}
          animationType="none"
          transparent
          onRequestClose={closeEditModal}
        >
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: colors.background,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                paddingTop: insets.top + 8,
                paddingHorizontal: 16,
                paddingBottom: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              }}
            >
              <TouchableOpacity
                onPress={closeEditModal}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ minWidth: 60 }}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>

              <Text
                style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}
              >
                {fieldConfig?.label || ""}
              </Text>

              <TouchableOpacity
                onPress={saveFieldEdit}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ minWidth: 60, alignItems: "flex-end" }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <View style={{ padding: 16 }}>
                {/* Username field with @ prefix */}
                {editingField === "username" && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderBottomWidth: 1,
                      borderBottomColor: colors.text,
                      paddingBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 17,
                        marginRight: 2,
                      }}
                    >
                      @
                    </Text>
                    <TextInput
                      value={editValue}
                      onChangeText={(v) =>
                        setEditValue(
                          v.toLowerCase().replace(/[^a-z0-9._]/g, ""),
                        )
                      }
                      placeholder={fieldConfig?.placeholder}
                      placeholderTextColor={colors.inputPlaceholder}
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={fieldConfig?.maxLength}
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontSize: 17,
                        paddingVertical: 12,
                      }}
                    />
                  </View>
                )}

                {/* Name field */}
                {editingField === "name" && (
                  <TextInput
                    value={editValue}
                    onChangeText={setEditValue}
                    placeholder={fieldConfig?.placeholder}
                    placeholderTextColor={colors.inputPlaceholder}
                    autoFocus
                    maxLength={fieldConfig?.maxLength}
                    style={{
                      color: colors.text,
                      fontSize: 17,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.text,
                      paddingVertical: 12,
                    }}
                  />
                )}

                {/* Bio field */}
                {editingField === "bio" && (
                  <TextInput
                    value={editValue}
                    onChangeText={setEditValue}
                    placeholder={fieldConfig?.placeholder}
                    placeholderTextColor={colors.inputPlaceholder}
                    autoFocus
                    maxLength={fieldConfig?.maxLength}
                    multiline
                    textAlignVertical="top"
                    style={{
                      color: colors.text,
                      fontSize: 17,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.text,
                      paddingVertical: 12,
                      minHeight: 100,
                    }}
                  />
                )}

                {/* Character count */}
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 12,
                    marginTop: 8,
                    textAlign: "right",
                  }}
                >
                  {editValue.length}/{fieldConfig?.maxLength || 0}
                </Text>

                {/* Username-specific help text */}
                {editingField === "username" && (
                  <View style={{ marginTop: 20 }}>
                    <Text
                      style={{
                        color: colors.textTertiary,
                        fontSize: 13,
                        lineHeight: 19,
                      }}
                    >
                      Usernames can contain letters, numbers, periods, and
                      underscores. Usernames can only be changed once every 30
                      days.
                    </Text>
                    {profileData?.canChangeUsernameIn > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 12,
                          backgroundColor: "rgba(245, 158, 11, 0.1)",
                          padding: 12,
                          borderRadius: 8,
                        }}
                      >
                        <AlertCircle size={16} color="#F59E0B" />
                        <Text
                          style={{
                            color: "#F59E0B",
                            fontSize: 13,
                            flex: 1,
                          }}
                        >
                          You can change your username again in{" "}
                          {profileData.canChangeUsernameIn} days
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </Modal>
      )}
    </View>
  );
}
