// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { authenticatedFetch } from "../utils/authenticatedFetch";

const VISIBLE_TYPES = [
  "order_payout",
  "delivery_fee",
  "creator_commission",
  "escrow_release",
  "escrow_hold",
  "withdrawal",
  "platform_fee",
  "deposit",
  "refund",
  "order_payment",
  "purchase",
];

const emptyWallet = {
  actual_balance: 0,
  pending_balance: 0,
  actualBalance: 0,
  pendingBalance: 0,
  currency: "GHS",
};

export function useWalletData() {
  const [walletData, setWalletData] = useState(emptyWallet);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWalletData = useCallback(async () => {
    try {
      const [balanceResponse, transactionsResponse] = await Promise.all([
        authenticatedFetch("/api/crestar-wallet/balance"),
        authenticatedFetch("/api/crestar-wallet/transactions?limit=100"),
      ]);

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        const actual = Number(
          balanceData.actualBalance ?? balanceData.actual_balance ?? 0
        );
        const pending = Number(
          balanceData.pendingBalance ?? balanceData.pending_balance ?? 0
        );
        setWalletData({
          actual_balance: actual,
          pending_balance: pending,
          actualBalance: actual,
          pendingBalance: pending,
          currency: balanceData.currency || "GHS",
          wallet_id: balanceData.wallet_id,
        });
      }

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(
          (transactionsData.transactions || []).filter((tx) =>
            VISIBLE_TYPES.includes(tx.transaction_type)
          )
        );
      }
    } catch (error) {
      console.error("Failed to fetch wallet data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWalletData();
  }, [fetchWalletData]);

  return {
    balance: walletData.actualBalance,
    walletData,
    transactions,
    loading,
    refreshing,
    handleRefresh,
    fetchWalletData,
  };
}