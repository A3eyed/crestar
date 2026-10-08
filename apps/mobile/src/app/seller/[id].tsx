// @ts-nocheck
import { View, Text, ScrollView } from 'react-native';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import useAuth from '@/utils/auth/useAuth';
import useLocalization from '@/utils/localization';
import { VerifiedUsername } from '@/components/VerifiedBadge';
import { useSellerProfile } from '@/hooks/useSellerProfile';
import { getUserType, getProfileTabs, getDisplayName } from '@/utils/sellerProfileHelpers';
import { ProfileHeader } from '../../components/SellerProfile/ProfileHeader';
import { ProfileAvatar } from '../../components/SellerProfile/ProfileAvatar';
import { MonetizationBadges } from '../../components/SellerProfile/MonetizationBadges';
import { ProfileStats } from '../../components/SellerProfile/ProfileStats';
import { ProfileBio } from '../../components/SellerProfile/ProfileBio';
import { ActionButtons } from '../../components/SellerProfile/ActionButtons';
import { BusinessContactInfo } from '../../components/SellerProfile/BusinessContactInfo';
import StoreLocationBlock from '../../components/SellerProfile/StoreLocationBlock';
import { ProfileTabs } from '../../components/SellerProfile/ProfileTabs';
import { PostsTab } from '../../components/SellerProfile/TabContent/PostsTab';
import { ShopTab } from '../../components/SellerProfile/TabContent/ShopTab';
import { ShowcaseTab } from '../../components/SellerProfile/TabContent/ShowcaseTab';
import { AboutTab } from '../../components/SellerProfile/TabContent/AboutTab';
import { LoadingState } from '../../components/SellerProfile/LoadingState';
import { ErrorState } from '../../components/SellerProfile/ErrorState';
import { useTheme } from '@/utils/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: profileUserId } = useLocalSearchParams();
  const { formatCurrency } = useLocalization();
  const { isAuthenticated, signIn } = useAuth();
  const colors = useTheme();

  const {
    profile,
    monetization,
    products,
    services,
    storeLocation,
    fulfillmentSettings,
    loading,
    isFollowing,
    toggleFollow,
  } = useSellerProfile(profileUserId);

  const [selectedTab, setSelectedTab] = useState('posts');

  const handleFollow = () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    toggleFollow();
  };

  const handleProductPress = (item) => {
    if (item.product_type === 'food_beverage') {
      router.push(`/food/${item.id}`);
    } else if (item.basic_price) {
      console.log('Service pressed:', item.id);
    } else {
      router.push(`/product/${item.id}`);
    }
  };

  const handleMessage = () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    router.push({
      pathname: '/chat',
      params: {
        partnerId: profileUserId,
        partnerName: getDisplayName(profile),
        partnerType: monetization?.seller ? 'seller' : 'user',
      },
    });
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!profile) {
    return <ErrorState onGoBack={() => router.back()} />;
  }

  const userType = getUserType(monetization);
  const tabs = getProfileTabs(userType, products, services);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />

      <ProfileHeader insets={insets} onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            paddingTop: insets.top + 80,
            paddingHorizontal: 20,
            paddingBottom: 20,
          }}
        >
          <ProfileAvatar profile={profile} userType={userType} />

          <Text
            style={{
              color: colors.text,
              fontSize: userType.isMonetized ? 24 : 20,
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            {getDisplayName(profile)}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: userType.isMonetized ? 20 : 16,
            }}
          >
            <VerifiedUsername
              username={profile.username}
              isVerified={profile.is_verified}
              usernameStyle={{ color: colors.textSecondary, fontSize: 15 }}
            />
          </View>

          <MonetizationBadges userType={userType} monetization={monetization} />

          <ProfileStats profile={profile} userType={userType} />

          <ProfileBio profile={profile} userType={userType} />

          <ActionButtons
            isFollowing={isFollowing}
            onFollow={handleFollow}
            onMessage={handleMessage}
            userType={userType}
          />

          <BusinessContactInfo userType={userType} monetization={monetization} />
        </View>

        {/* Where this shop is, and how they get orders to you */}
        <StoreLocationBlock
          location={storeLocation}
          settings={fulfillmentSettings}
          colors={colors}
        />

        <ProfileTabs tabs={tabs} selectedTab={selectedTab} onTabChange={setSelectedTab} />

        {selectedTab === 'posts' && <PostsTab userType={userType} sellerId={profileUserId} />}

        {selectedTab === 'shop' && userType.isSeller && (
          <ShopTab
            products={products}
            services={services}
            onProductPress={handleProductPress}
            formatCurrency={formatCurrency}
            sellerId={profileUserId}
          />
        )}

        {selectedTab === 'showcase' && (
          <ShowcaseTab
            sellerId={profileUserId}
            sellerType={userType.sellerType}
            products={products}
          />
        )}

        {selectedTab === 'about' && userType.isMonetized && (
          <AboutTab userType={userType} monetization={monetization} />
        )}
      </ScrollView>
    </View>
  );
}
