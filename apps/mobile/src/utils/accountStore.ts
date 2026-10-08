// @ts-nocheck
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const ACCOUNTS_KEY = "crestar_saved_accounts";

/**
 * TikTok-style multi-account store.
 * Saves account credentials (JWT + basic user info) so users can
 * switch between accounts without re-entering their password.
 */
export const useAccountStore = create((set, get) => ({
  savedAccounts: [],
  loaded: false,

  // Load saved accounts from secure storage
  loadAccounts: async () => {
    try {
      const raw = await SecureStore.getItemAsync(ACCOUNTS_KEY);
      if (raw) {
        const accounts = JSON.parse(raw);
        console.log(`Loaded ${accounts.length} saved accounts from storage`);
        set({ savedAccounts: accounts, loaded: true });
      } else {
        console.log("No saved accounts found in storage");
        set({ savedAccounts: [], loaded: true });
      }
    } catch (e) {
      console.error("Failed to load saved accounts:", e);
      set({ savedAccounts: [], loaded: true });
    }
  },

  // Save or update an account in the saved list
  saveAccount: async (accountData) => {
    // accountData: { userId, email, name, displayName, username, profileImage, authToken }
    const { savedAccounts } = get();
    const existingIndex = savedAccounts.findIndex(
      (a) => String(a.userId) === String(accountData.userId),
    );

    let updated;
    if (existingIndex >= 0) {
      // Update existing account
      updated = [...savedAccounts];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...accountData,
        updatedAt: Date.now(),
      };
      console.log(
        `Updated existing account for user ${accountData.userId} (@${accountData.username})`,
      );
    } else {
      // Add new account
      updated = [
        ...savedAccounts,
        { ...accountData, addedAt: Date.now(), updatedAt: Date.now() },
      ];
      console.log(
        `Added new account for user ${accountData.userId} (@${accountData.username})`,
      );
    }

    set({ savedAccounts: updated });
    try {
      await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(updated));
      console.log(`Successfully saved ${updated.length} accounts to storage`);
    } catch (e) {
      console.error("Failed to save accounts:", e);
      // Rollback the state change if save failed
      set({ savedAccounts });
      throw e;
    }
  },

  // Remove an account from the saved list
  removeAccount: async (userId) => {
    const { savedAccounts } = get();
    const userIdString = String(userId);
    const accountToRemove = savedAccounts.find(
      (a) => String(a.userId) === userIdString,
    );

    if (!accountToRemove) {
      console.warn(
        `Attempted to remove account ${userId} but it was not found in saved accounts`,
      );
      return;
    }

    const updated = savedAccounts.filter(
      (a) => String(a.userId) !== userIdString,
    );

    console.log(
      `Removing account ${userId} (@${accountToRemove.username || accountToRemove.email})`,
    );
    console.log(
      `Accounts before removal: ${savedAccounts.length}, after removal: ${updated.length}`,
    );

    set({ savedAccounts: updated });

    try {
      await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(updated));
      console.log(
        `Successfully removed account and saved ${updated.length} remaining accounts to storage`,
      );
    } catch (e) {
      console.error("Failed to remove account from storage:", e);
      // Rollback the state change if save failed
      set({ savedAccounts });
      throw e;
    }
  },

  // Clear all saved accounts
  clearAll: async () => {
    console.log("Clearing all saved accounts");
    set({ savedAccounts: [] });
    try {
      await SecureStore.deleteItemAsync(ACCOUNTS_KEY);
      console.log("Successfully cleared all saved accounts");
    } catch (e) {
      console.error("Failed to clear accounts:", e);
    }
  },

  // Debug helper to inspect current state
  debugState: () => {
    const state = get();
    console.log("=== Account Store Debug ===");
    console.log("Loaded:", state.loaded);
    console.log("Saved accounts count:", state.savedAccounts.length);
    state.savedAccounts.forEach((account, index) => {
      console.log(
        `  ${index + 1}. User ${account.userId} (@${account.username || account.email}) - ${account.name}`,
      );
    });
    console.log("========================");
    return state;
  },
}));

export default useAccountStore;
