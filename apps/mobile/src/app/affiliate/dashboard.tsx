// @ts-nocheck
import { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import useUser from '@/utils/auth/useUser';
import useAuth from '@/utils/auth/useAuth';
import { useTheme } from '@/utils/theme';
import useLocalization from '@/utils/localization';
import { useCreatorEarnings } from '@/hooks/useCreatorEarnings';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { useShowcaseSharing } from '@/hooks/useShowcaseSharing';
import { TAB_DEFS } from '@/constants/affiliateConstants';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import { DashboardHeader } from '@/components/AffiliateDashboard/DashboardHeader';
import { DashboardTabs } from '@/components/AffiliateDashboard/DashboardTabs';
import { EarningsTab } from '@/components/AffiliateDashboard/EarningsTab';
import { CommissionsTab } from '@/components/AffiliateDashboard/CommissionsTab';
import { WithdrawalsTab } from '@/components/AffiliateDashboard/WithdrawalsTab';
import { AuthPrompt, LoadingState } from '@/components/AffiliateDashboard/StateViews';

// Configure local notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function CreatorDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user } = useUser();
  const { isAuthenticated, isReady, signIn } = useAuth();
  const colors = useTheme();
  const { formatCurrency } = useLocalization();

  const [selectedTab, setSelectedTab] = useState('earnings');
  const [checkingAccess, setCheckingAccess] = useState(true);

  // 🛡️ Validate user has creator business center.
  // IMPORTANT: only redirect on a DEFINITIVE answer from the API.
  // A failed request (401 while auth settles, network blip, 5xx) must NEVER
  // bounce the user away — monetization-center redirects approved creators
  // straight back here, so redirecting on failure creates an infinite
  // redirect loop between the two screens.
  useEffect(() => {
    // Wait until auth state is actually known
    if (!isReady) {
      return;
    }
    if (!isAuthenticated) {
      setCheckingAccess(false);
      return;
    }

    const validateCreatorAccess = async () => {
      try {
        const centerResponse = await authenticatedFetch('/api/business-centers');
        if (centerResponse.ok) {
          const centerData = await centerResponse.json();

          // Definitive answer: no center, or it isn't a creator center
          if (!centerData.has_center || centerData.center?.center_type !== 'creator') {
            console.log(
              '⚠️ User does not have creator business center, redirecting to monetization center'
            );
            router.replace('/monetization-center');
            return;
          }

          console.log('✅ Creator access validated');
        } else {
          // Request failed (401/5xx) — fail OPEN and stay on the dashboard.
          // Do NOT redirect: bouncing here loops with monetization-center.
          console.error(
            '❌ Could not validate creator access (staying on dashboard):',
            centerResponse.status
          );
        }
      } catch (error) {
        // Network error — fail OPEN and stay on the dashboard.
        console.error('❌ Error validating creator access (staying on dashboard):', error);
      } finally {
        setCheckingAccess(false);
      }
    };

    validateCreatorAccess();
  }, [isReady, isAuthenticated, router]);

  const { notifPermission, requestNotifPermission } = useNotificationPermission();

  const { loading, refreshing, earningsData, onRefresh } = useCreatorEarnings(
    user?.id,
    isAuthenticated,
    notifPermission
  );

  const username = user?.username || (user?.email ? user.email.split('@')[0] : `user${user?.id}`);

  const { showcaseLink, handleShareShowcase, handleCopyLink } = useShowcaseSharing(username);

  // While auth is still loading, show loading — not the sign-in prompt
  if (!isReady) {
    return <LoadingState colors={colors} />;
  }

  if (!isAuthenticated) {
    return <AuthPrompt colors={colors} onSignIn={signIn} />;
  }

  if (checkingAccess || loading) {
    return <LoadingState colors={colors} />;
  }

  const earnings = earningsData?.earnings || {};
  const orders = earningsData?.attributedOrders || [];
  const videoBreakdown = earningsData?.videoBreakdown || [];
  const withdrawals = earningsData?.withdrawalHistory || [];

  const handleWalletPress = () => router.push('/wallet');
  const handleCreateVideo = () => router.push('/(tabs)/create');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />

      {/* Header */}
      <DashboardHeader
        insets={insets}
        colors={colors}
        username={username}
        onBack={() => router.back()}
        onWalletPress={handleWalletPress}
      />

      {/* Tabs */}
      <DashboardTabs
        tabs={TAB_DEFS}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        colors={colors}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        {selectedTab === 'earnings' && (
          <EarningsTab
            earnings={earnings}
            orders={orders}
            videoBreakdown={videoBreakdown}
            notifPermission={notifPermission}
            showcaseLink={showcaseLink}
            formatCurrency={formatCurrency}
            colors={colors}
            onCashOut={handleWalletPress}
            onRequestPermission={requestNotifPermission}
            onCopyLink={handleCopyLink}
            onShareShowcase={handleShareShowcase}
            onCreateVideo={handleCreateVideo}
          />
        )}

        {selectedTab === 'commissions' && (
          <CommissionsTab
            earnings={earnings}
            orders={orders}
            videoBreakdown={videoBreakdown}
            formatCurrency={formatCurrency}
            colors={colors}
          />
        )}

        {selectedTab === 'history' && (
          <WithdrawalsTab
            earnings={earnings}
            withdrawals={withdrawals}
            formatCurrency={formatCurrency}
            colors={colors}
            onCashOut={handleWalletPress}
          />
        )}
      </ScrollView>
    </View>
  );
}
