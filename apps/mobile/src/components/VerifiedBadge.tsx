// @ts-nocheck
import { View, Text } from "react-native";
import { useTheme } from "@/utils/theme";

/**
 * Verified Badge Component - Universal "Crestar Gold Badge"
 *
 * Displays a gold verification badge (like Twitter/X but gold)
 * with a white checkmark inside a gold filled circle.
 *
 * @param {boolean} isVerified - Whether the user is verified
 * @param {number} size - Size of the badge (default: 16)
 * @param {object} style - Additional styles
 */
function VerifiedBadge({ isVerified, size = 16, color, style }) {
  const colors = useTheme();

  if (!isVerified) {
    return null;
  }

  const badgeColor = color || "#FFD700";
  const checkSize = Math.round(size * 0.55);

  return (
    <View
      style={[
        {
          marginLeft: 4,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: badgeColor,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: checkSize,
          fontWeight: "900",
          lineHeight: checkSize + 2,
          textAlign: "center",
          includeFontPadding: false,
        }}
      >
        ✓
      </Text>
    </View>
  );
}

export default VerifiedBadge;

/**
 * Verified Username Component - Username with embedded badge
 *
 * Combines username display with verification badge in a single component
 * for consistent spacing and alignment.
 *
 * @param {string} username - The username to display
 * @param {boolean} isVerified - Whether the user is verified
 * @param {object} usernameStyle - Styling for the username text
 * @param {number} badgeSize - Size of the verification badge
 * @param {string} badgeColor - Color of the verification badge
 */
export function VerifiedUsername({
  username,
  isVerified,
  usernameStyle,
  badgeSize = 16,
  badgeColor,
  showAt = true,
}) {
  const colors = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={[{ color: colors.text, fontSize: 16 }, usernameStyle]}>
        {showAt ? "@" : ""}
        {username}
      </Text>
      <VerifiedBadge
        isVerified={isVerified}
        size={badgeSize}
        color={badgeColor}
      />
    </View>
  );
}

/**
 * Verified Display Name Component - Display name with embedded badge
 *
 * For use in contexts where the display name (not username) is shown
 * with verification status.
 *
 * @param {string} displayName - The display name to show
 * @param {boolean} isVerified - Whether the user is verified
 * @param {object} nameStyle - Styling for the display name text
 * @param {number} badgeSize - Size of the verification badge
 * @param {string} badgeColor - Color of the verification badge
 */
export function VerifiedDisplayName({
  displayName,
  isVerified,
  nameStyle,
  badgeSize = 16,
  badgeColor,
}) {
  const colors = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text
        style={[
          { color: colors.text, fontSize: 16, fontWeight: "600" },
          nameStyle,
        ]}
      >
        {displayName}
      </Text>
      <VerifiedBadge
        isVerified={isVerified}
        size={badgeSize}
        color={badgeColor}
      />
    </View>
  );
}
