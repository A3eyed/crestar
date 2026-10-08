// @ts-nocheck
import { Text } from "react-native";
import { useTheme } from "@/utils/theme";

export function ProfileBio({ profile, userType }) {
  const { isMonetized } = userType;
  const colors = useTheme();

  if (profile.bio && profile.bio !== "✨ Content Creator") {
    return (
      <Text
        style={{
          color: colors.text,
          fontSize: 15,
          textAlign: "center",
          marginBottom: 20,
          lineHeight: 22,
        }}
      >
        {profile.bio}
      </Text>
    );
  }

  if (!profile.bio && !isMonetized) {
    return (
      <Text
        style={{
          color: colors.textTertiary,
          fontSize: 14,
          textAlign: "center",
          marginBottom: 20,
          fontStyle: "italic",
        }}
      >
        This user hasn't added a bio yet
      </Text>
    );
  }

  return null;
}
