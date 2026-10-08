// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { UserPlus } from "lucide-react-native";
import { VerifiedUsername } from "@/components/VerifiedBadge";
import useLocalization from "@/utils/localization";

export function ProfileInfo({
  user,
  username,
  displayName,
  stats,
  isSeller,
  colors,
  onEditProfile,
  onShareProfile,
  onWallet,
}) {
  const { t } = useLocalization();

  return (
    <View
      style={{ paddingHorizontal: 16, marginBottom: 20, alignItems: "center" }}
    >
      {/* Avatar */}
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: colors.cardBackgroundAlt,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        {user?.profile_image ? (
          <Image
            source={{ uri: user.profile_image }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <Text style={{ color: colors.text, fontSize: 40, fontWeight: "700" }}>
            {(displayName || user?.email)?.charAt(0).toUpperCase() || "U"}
          </Text>
        )}
      </View>

      {/* @username */}
      <View style={{ marginBottom: 16 }}>
        <VerifiedUsername
          username={username}
          isVerified={user?.is_verified}
          usernameStyle={{ color: colors.textSecondary, fontSize: 14 }}
          badgeSize={14}
        />
      </View>

      {/* Stats Row */}
      <View style={{ flexDirection: "row", gap: 28, marginBottom: 14 }}>
        {stats.map((stat, index) => (
          <TouchableOpacity key={index} style={{ alignItems: "center" }}>
            <Text
              style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}
            >
              {stat.value}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {stat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bio */}
      {user?.bio && user.bio !== "✨ Content Creator" ? (
        <Text
          style={{
            color: colors.text,
            fontSize: 14,
            marginBottom: 14,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {user.bio}
        </Text>
      ) : null}

      {!user?.bio || user.bio === "✨ Content Creator" ? (
        <TouchableOpacity onPress={onEditProfile} style={{ marginBottom: 14 }}>
          <Text style={{ color: colors.textTertiary, fontSize: 14 }}>
            {t("edit")} bio
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Action Buttons */}
      <View style={{ flexDirection: "row", gap: 6, width: "100%" }}>
        <TouchableOpacity
          onPress={onEditProfile}
          style={{
            flex: 1,
            backgroundColor: colors.cardBackgroundAlt,
            borderRadius: 4,
            paddingVertical: 11,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
            {t("editProfile")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onShareProfile}
          style={{
            flex: 1,
            backgroundColor: colors.cardBackgroundAlt,
            borderRadius: 4,
            paddingVertical: 11,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
            {t("shareProfile")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onWallet}
          style={{
            width: 44,
            backgroundColor: colors.cardBackgroundAlt,
            borderRadius: 4,
            paddingVertical: 11,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <UserPlus size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
