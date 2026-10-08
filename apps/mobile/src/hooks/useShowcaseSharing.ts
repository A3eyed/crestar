// @ts-nocheck
import { Share, Alert, Clipboard } from "react-native";

export function useShowcaseSharing(username) {
  const showcaseLink = `https://crestarhq.com/@${username}/showcase`;

  const handleShareShowcase = async () => {
    try {
      await Share.share({
        message: `🛍️ Shop my picks on Crestar!\n\n${showcaseLink}`,
        url: showcaseLink,
        title: `@${username}'s Showcase`,
      });
    } catch (err) {
      console.error("Share error:", err);
    }
  };

  const handleCopyLink = async () => {
    try {
      Clipboard.setString(showcaseLink);
      Alert.alert("✅ Copied!", "Your showcase link has been copied.");
    } catch (err) {
      Alert.alert("Copy your link", showcaseLink);
    }
  };

  return {
    showcaseLink,
    handleShareShowcase,
    handleCopyLink,
  };
}