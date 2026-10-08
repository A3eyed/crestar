// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { authenticatedFetch } from "../utils/authenticatedFetch";
import { SecurityService } from "../utils/security";
import useLocalization from "../utils/localization";

export function useWithdrawal(balance, onSuccess) {
  const { formatCurrency, currency } = useLocalization();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawalMethod, setWithdrawalMethod] = useState("momo");
  const [momoProvider, setMomoProvider] = useState("MTN");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [selectedBank, setSelectedBank] = useState(null);
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankSearch, setBankSearch] = useState("");

  // Saved payout methods
  const [savedPayoutMethods, setSavedPayoutMethods] = useState([]);
  const [loadingPayoutMethods, setLoadingPayoutMethods] = useState(false);
  const [useExistingMethod, setUseExistingMethod] = useState(true);
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState(null);

  const fetchPayoutMethods = useCallback(async () => {
    setLoadingPayoutMethods(true);
    try {
      const res = await authenticatedFetch("/api/wallet/payout-method");
      if (res.ok) {
        const data = await res.json();
        setSavedPayoutMethods(data.methods || []);

        // Auto-select first method if available
        if (data.methods && data.methods.length > 0) {
          setSelectedPayoutMethod(data.methods[0]);
          setUseExistingMethod(true);
        } else {
          setUseExistingMethod(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch payout methods:", error);
    } finally {
      setLoadingPayoutMethods(false);
    }
  }, []);

  const fetchBanks = useCallback(async () => {
    setLoadingBanks(true);
    try {
      const res = await authenticatedFetch("/api/wallet/banks");
      if (res.ok) {
        const data = await res.json();
        setBanks(data.banks || []);
      } else {
        console.error("Failed to fetch banks:", await res.text());
      }
    } catch (error) {
      console.error("Failed to fetch banks:", error);
    } finally {
      setLoadingBanks(false);
    }
  }, []);

  useEffect(() => {
    // Load payout methods on mount so callers can check hasSavedMethod immediately
    fetchPayoutMethods();
  }, [fetchPayoutMethods]);

  useEffect(() => {
    if (showWithdrawModal) {
      fetchPayoutMethods();
    }
  }, [showWithdrawModal, fetchPayoutMethods]);

  useEffect(() => {
    if (withdrawalMethod === "bank" && banks.length === 0) {
      fetchBanks();
    }
  }, [withdrawalMethod, banks.length, fetchBanks]);

  const resetWithdrawForm = () => {
    setWithdrawAmount("");
    setWithdrawalMethod("momo");
    setMomoProvider("MTN");
    setAccountNumber("");
    setAccountName("");
    setSelectedBank(null);
    setShowWithdrawModal(false);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }
    if (amount > balance) {
      Alert.alert(
        "Error",
        `Insufficient funds. You have ${formatCurrency(balance)}`,
      );
      return;
    }
    if (amount < 1) {
      Alert.alert("Error", `Minimum withdrawal amount is ${formatCurrency(1)}`);
      return;
    }

    // Validation for using existing method
    if (useExistingMethod) {
      if (!selectedPayoutMethod) {
        Alert.alert("Error", "Please select a payout method");
        return;
      }
    } else {
      // Validation for manual entry
      if (!accountNumber.trim()) {
        Alert.alert(
          "Error",
          withdrawalMethod === "momo"
            ? "Enter your Mobile Money number"
            : "Enter your account number",
        );
        return;
      }
      if (withdrawalMethod === "bank" && !selectedBank) {
        Alert.alert("Error", "Please select your bank");
        return;
      }
      if (withdrawalMethod === "bank" && !accountName.trim()) {
        Alert.alert("Error", "Please enter the account holder's name");
        return;
      }
    }

    // 🔒 SECURITY: Require authentication before withdrawal
    const authenticated = await SecurityService.authenticateForWithdrawal(
      amount,
      currency,
    );
    if (!authenticated) {
      Alert.alert("Authentication Failed", "Withdrawal cancelled.");
      return;
    }

    setWithdrawing(true);
    try {
      console.log("💸 Initiating withdrawal:", {
        amount,
        useExisting: useExistingMethod,
        method: useExistingMethod
          ? selectedPayoutMethod?.method_name
          : withdrawalMethod,
      });

      // Build request payload
      const payload = { amount };
      if (useExistingMethod) {
        // Use saved payout method
        payload.payout_method_id = selectedPayoutMethod.id;
      } else {
        // Use manual entry
        payload.withdrawal_method = withdrawalMethod;
        payload.account_number = accountNumber.trim();
        if (withdrawalMethod === "momo") {
          payload.momo_provider = momoProvider;
        } else if (withdrawalMethod === "bank") {
          payload.bank_code = selectedBank?.code;
          payload.account_name = accountName.trim();
        }
      }

      // Use the proper withdrawal endpoint that processes Paystack transfers
      const response = await authenticatedFetch(
        "/api/crestar-wallet/withdraw",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        const methodDescription = useExistingMethod
          ? selectedPayoutMethod.method_name
          : withdrawalMethod === "momo"
            ? `${momoProvider} Mobile Money`
            : selectedBank?.name;

        Alert.alert(
          "Withdrawal Successful! 💸",
          `${formatCurrency(amount)} has been sent to your ${methodDescription} account.\n\nReference: ${data.reference}`,
          [
            {
              text: "OK",
              onPress: () => {
                resetWithdrawForm();
                if (onSuccess) onSuccess();
              },
            },
          ],
        );
      } else {
        console.error("Withdrawal failed:", data);
        Alert.alert(
          "Withdrawal Failed",
          data.error || "Failed to process withdrawal. Please try again.",
        );
      }
    } catch (error) {
      console.error("Withdrawal error:", error);
      Alert.alert(
        "Error",
        "Failed to process withdrawal. Please check your connection and try again.",
      );
    } finally {
      setWithdrawing(false);
    }
  };

  return {
    showWithdrawModal,
    setShowWithdrawModal,
    withdrawAmount,
    setWithdrawAmount,
    withdrawing,
    withdrawalMethod,
    setWithdrawalMethod,
    momoProvider,
    setMomoProvider,
    accountNumber,
    setAccountNumber,
    accountName,
    setAccountName,
    selectedBank,
    setSelectedBank,
    banks,
    loadingBanks,
    showBankPicker,
    setShowBankPicker,
    bankSearch,
    setBankSearch,
    resetWithdrawForm,
    handleWithdraw,
    fetchPayoutMethods,
    savedPayoutMethods,
    loadingPayoutMethods,
    useExistingMethod,
    setUseExistingMethod,
    selectedPayoutMethod,
    setSelectedPayoutMethod,
  };
}
