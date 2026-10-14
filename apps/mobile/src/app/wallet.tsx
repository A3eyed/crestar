// @ts-nocheck
import { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Shield,
  TrendingUp,
  AlertCircle,
  CreditCard,
  Lock,
} from "lucide-react-native";
import useStore from "@/utils/store";
import useLocalization from "@/utils/localization";
import { getTheme } from "@/utils/theme";
import { useWalletData } from "@/hooks/useWalletData";
import { useWithdrawal } from "@/hooks/useWithdrawal";
import { WalletHeader } from "../components/Wallet/WalletHeader";
import { BalanceCard } from "../components/Wallet/BalanceCard";
import { TransactionList } from "../components/Wallet/TransactionList";
import { WithdrawModal } from "../components/Wallet/WithdrawModal";
import { PayoutMethodModal } from "../components/Wallet/PayoutMethodModal";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

const SUPPORT_WHATSAPP =
  "https://wa.me/233543799308?text=Hi%20Crestar%2C%20I%20need%20to%20change%20my%20payout%20method.";

export default function CrestarEarningsWalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { walletVisible, setWalletVisible, theme } = useStore();
  const { formatCurrency } = useLocalization();
  const colors = getTheme(theme);
  const [monetizationStatus, setMonetizationStatus] = useState(null);
  const [checkingMonetization, setCheckingMonetization] = useState(true);
  const [showPayoutMethodModal, setShowPayoutMethodModal] = useState(false);
  const {
    balance,
    walletData,
    transactions,
    loading,
    refreshing,
    handleRefresh,
    fetchWalletData,
  } = useWalletData();
  const availableBalance =
    walletData?.actualBalance ?? walletData?.actual_balance ?? balance ?? 0;
  const pendingBalance = Number(
    walletData?.pendingBalance ?? walletData?.pending_balance ?? 0
  );
  const withdrawal = useWithdrawal(availableBalance, fetchWalletData);
  const canWithdraw = !!monetizationStatus?.hasAnyMonetization;

  const checkMonetizationStatus = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/api/business-centers");
      if (!response.ok) {
        setMonetizationStatus({ hasAnyMonetization: false, checkFailed: true });
        return;
      }
      const data = await response.json();
      setMonetizationStatus({
        hasAnyMonetization: !!(
          data.has_center && data.center?.verification_status === "approved"
        ),
        center: data.center,
        checkFailed: false,
      });
    } catch (error) {
      setMonetizationStatus({ hasAnyMonetization: false, checkFailed: true });
    } finally {
      setCheckingMonetization(false);
    }
  }, []);

  useEffect(() => {
    checkMonetizationStatus();
  }, [checkMonetizationStatus]);

  const handleCashOut = () => {
    if (!canWithdraw) return;
    if (withdrawal.savedPayoutMethods.length > 0)
      withdrawal.setShowWithdrawModal(true);
    else setShowPayoutMethodModal(true);
  };

  if (loading && !walletData?.wallet_id) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
        <Text
          style={{ color: colors.textSecondary, fontSize: 16, marginTop: 16 }}
        >
          Loading wallet...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />
      <WalletHeader
        colors={colors}
        insets={insets}
        onBack={() => router.back()}
        title="Wallet"
      />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
          paddingTop: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <BalanceCard
          colors={colors}
          balance={availableBalance}
          walletData={walletData}
          walletVisible={walletVisible}
          onToggleVisibility={() => setWalletVisible(!walletVisible)}
          onWithdraw={handleCashOut}
          canWithdraw={canWithdraw}
          formatCurrency={formatCurrency}
          isEarningsWallet
        />

        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 6,
            }}
          >
            Crestar fee
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            Crestar keeps 5% of each sale. Your wallet is credited with the
            other 95%.
          </Text>
        </View>

        {!checkingMonetization && !canWithdraw ? (
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Shield size={16} color={colors.text} />
              <Text
                style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}
              >
                {monetizationStatus?.checkFailed
                  ? "Could not check payout access"
                  : "Payout access required"}
              </Text>
            </View>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                lineHeight: 18,
                marginBottom: 12,
              }}
            >
              Your balance is visible. Cash out opens after a Seller, Creator,
              or Deliverer center is approved.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/monetization-center")}
            >
              <Text style={{ color: colors.accent, fontWeight: "700" }}>
                Open Monetization Center
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {withdrawal.savedPayoutMethods.length > 0 ? (
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <CreditCard size={16} color={colors.text} />
              <Text
                style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}
              >
                Payout method
              </Text>
              <Lock size={12} color={colors.textSecondary} />
            </View>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              {withdrawal.savedPayoutMethods[0]?.method_name} is locked. Message
              WhatsApp to change it.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(SUPPORT_WHATSAPP).catch(() => {})}
              style={{ marginTop: 8 }}
            >
              <Text style={{ color: "#25D366", fontWeight: "700" }}>
                +233 54 379 9308
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowPayoutMethodModal(true)}
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}
            >
              Add a payout method
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                marginTop: 6,
              }}
            >
              Required before cash out.
            </Text>
          </TouchableOpacity>
        )}

        {pendingBalance > 0 ? (
          <View
            style={{
              backgroundColor: "rgba(255, 159, 10, 0.1)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "rgba(255, 159, 10, 0.3)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <AlertCircle
                size={16}
                color="#FF9F0A"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{ color: "#FF9F0A", fontSize: 14, fontWeight: "600" }}
              >
                Not delivered yet
              </Text>
            </View>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              {formatCurrency(pendingBalance)} is from paid orders that have not
              been delivered. The 5% fee is already removed. It becomes
              available only after the buyer confirms delivery with the PIN.
            </Text>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <TrendingUp
            size={20}
            color={colors.text}
            style={{ marginRight: 8 }}
          />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
            History
          </Text>
        </View>
        <TransactionList
          transactions={transactions}
          colors={colors}
          formatCurrency={formatCurrency}
        />
      </ScrollView>

      <WithdrawModal
        visible={withdrawal.showWithdrawModal}
        colors={colors}
        insets={insets}
        balance={availableBalance}
        formatCurrency={formatCurrency}
        withdrawAmount={withdrawal.withdrawAmount}
        setWithdrawAmount={withdrawal.setWithdrawAmount}
        savedPayoutMethods={withdrawal.savedPayoutMethods}
        loadingPayoutMethods={withdrawal.loadingPayoutMethods}
        selectedPayoutMethod={withdrawal.selectedPayoutMethod}
        setSelectedPayoutMethod={withdrawal.setSelectedPayoutMethod}
        selectedBank={withdrawal.selectedBank}
        setSelectedBank={withdrawal.setSelectedBank}
        banks={withdrawal.banks}
        loadingBanks={withdrawal.loadingBanks}
        showBankPicker={withdrawal.showBankPicker}
        setShowBankPicker={withdrawal.setShowBankPicker}
        bankSearch={withdrawal.bankSearch}
        setBankSearch={withdrawal.setBankSearch}
        withdrawing={withdrawal.withdrawing}
        onWithdraw={withdrawal.handleWithdraw}
        onClose={withdrawal.resetWithdrawForm}
      />
      <PayoutMethodModal
        visible={showPayoutMethodModal}
        onClose={() => setShowPayoutMethodModal(false)}
        colors={colors}
        onSuccess={() => {
          fetchWalletData();
          withdrawal.fetchPayoutMethods();
          setShowPayoutMethodModal(false);
        }}
      />
    </View>
  );
}
