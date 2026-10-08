// @ts-nocheck
import { useState, useCallback } from "react";
import { View, ScrollView, Share } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import useAuth from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import useLocalization from "@/utils/localization";
import { useTheme } from "@/utils/theme";
import { useProfileData } from "@/hooks/useProfileData";
import { useDrawer } from "@/hooks/useDrawer";
import { GuestView } from "@/components/ProfileScreen/GuestView";
import { LoadingView } from "@/components/ProfileScreen/LoadingView";
import { ProfileHeader } from "@/components/ProfileScreen/ProfileHeader";
import { ProfileInfo } from "@/components/ProfileScreen/ProfileInfo";
import { ProfileTabs } from "@/components/ProfileScreen/ProfileTabs";
import { PostsTab } from "@/components/ProfileScreen/TabContent/PostsTab";
import { ShopTab } from "@/components/ProfileScreen/TabContent/ShopTab";
import { PrivateTab } from "@/components/ProfileScreen/TabContent/PrivateTab";
import { LikesTab } from "@/components/ProfileScreen/TabContent/LikesTab";
import { SavedTab } from "@/components/ProfileScreen/TabContent/SavedTab";
import { ProfileDrawer } from "@/components/ProfileScreen/ProfileDrawer";
import {
  buildProfileTabs,
  buildDrawerItems,
  getUserStats,
  getUsername,
  getDisplayName,
} from "@/utils/profileHelpers";
import { useAuthStore } from "@/utils/auth/store";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { data: user, loading: userLoading, refetch: refetchUser } = useUser();
  const { formatCurrency, t } = useLocalization();
  const colors = useTheme();
  const [selectedTab, setSelectedTab] = useState("posts");
  const {
    isSeller,
    isCreator,
    isDeliverer,
    sellerProducts,
    loadingProducts,
    refetch: refetchProfileData,
  } = useProfileData(isAuthenticated, user?.id);
  const { showDrawer, drawerAnim, openDrawer, closeDrawer, DRAWER_WIDTH } =
    useDrawer();

  useFocusEffect(
    useCallback(() => {
      const { auth } = useAuthStore.getState();
      if (isReady && auth?.jwt) {
        refetchUser();
        refetchProfileData();
      }
    }, [isReady, refetchUser, refetchProfileData])
  );

  const username = getUsername(user);
  const displayName = getDisplayName(user);
  const stats = getUserStats(user, t);
  const tabs = buildProfileTabs(isSeller, user);
  const drawerItems = [
    ...buildDrawerItems(
      isSeller,
      isCreator,
      isDeliverer,
      user,
      router,
      closeDrawer,
      t
    ),
    {
      id: "settings",
      label: "Settings and privacy",
      onPress: () => {
        closeDrawer();
        router.push("/settings");
      },
    },
  ];

  if (!isReady || (isAuthenticated && userLoading && !user)) {
    return <LoadingView colors={colors} />;
  }
  if (isReady && isAuthenticated === false) {
    return <GuestView colors={colors} />;
  }
  if (!user) {
    return <LoadingView colors={colors} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          colors={colors}
          onPlusPress={() => router.push("/(tabs)/create")}
          onMenuPress={openDrawer}
        />
        <ProfileInfo
          user={user}
          username={username}
          displayName={displayName}
          stats={stats}
          isSeller={isSeller}
          colors={colors}
          onEditProfile={() => router.push("/edit-profile")}
          onShareProfile={() =>
            Share.share({
              message: `https://crestarhq.com/@${username}`,
              url: `https://crestarhq.com/@${username}`,
            })
          }
          onWallet={() => router.push("/wallet")}
          onFollowersPress={() =>
            router.push({
              pathname: "/connections",
              params: { userId: user.id, tab: "followers" },
            })
          }
          onFollowingPress={() =>
            router.push({
              pathname: "/connections",
              params: { userId: user.id, tab: "following" },
            })
          }
        />
        <ProfileTabs
          tabs={tabs}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          colors={colors}
        />
        {selectedTab === "posts" && (
          <PostsTab colors={colors} userId={user.id} isOwnProfile />
        )}
        {selectedTab === "shop" && (
          <ShopTab
            sellerProducts={sellerProducts}
            loadingProducts={loadingProducts}
            colors={colors}
            formatCurrency={formatCurrency}
            onAddProduct={() => router.push("/create-listing")}
            onProductPress={(product) => router.push(`/product/${product.id}`)}
          />
        )}
        {selectedTab === "private" && <PrivateTab colors={colors} />}
        {selectedTab === "likes" && <LikesTab colors={colors} />}
        {selectedTab === "saved" && <SavedTab colors={colors} />}
      </ScrollView>
      <ProfileDrawer
        visible={showDrawer}
        drawerAnim={drawerAnim}
        drawerWidth={DRAWER_WIDTH}
        drawerItems={drawerItems}
        colors={colors}
        onClose={closeDrawer}
      />
    </View>
  );
}