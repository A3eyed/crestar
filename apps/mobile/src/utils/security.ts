// @ts-nocheck
import * as SecureStore from "expo-secure-store";
import { Alert, Platform } from "react-native";

// Enhanced security service with PIN-based authentication
// Uses expo-secure-store for encrypted credential storage
export const SecurityService = {
  // Check if biometrics are available (placeholder for future enhancement)
  isAvailable: async () => {
    // Biometric hardware check would go here when expo-local-authentication is added
    // For now, we use PIN-based security
    return { available: false, types: [], usePIN: true };
  },

  // Check if wallet security is enabled
  isWalletSecurityEnabled: async () => {
    try {
      const enabled = await SecureStore.getItemAsync("walletSecurityEnabled");
      return enabled === "true";
    } catch (error) {
      return false;
    }
  },

  // Enable wallet security
  enableWalletSecurity: async () => {
    try {
      await SecureStore.setItemAsync("walletSecurityEnabled", "true");
      return true;
    } catch (error) {
      console.error("Failed to enable wallet security:", error);
      return false;
    }
  },

  // Disable wallet security
  disableWalletSecurity: async () => {
    try {
      await SecureStore.setItemAsync("walletSecurityEnabled", "false");
      return true;
    } catch (error) {
      console.error("Failed to disable wallet security:", error);
      return false;
    }
  },

  // Check if user has set up a security PIN
  hasPIN: async () => {
    try {
      const pin = await SecureStore.getItemAsync("securityPIN");
      return pin !== null && pin !== undefined;
    } catch (error) {
      return false;
    }
  },

  // Set up a new security PIN
  setupPIN: async (pin) => {
    try {
      if (!pin || pin.length < 4) {
        return { success: false, error: "PIN must be at least 4 digits" };
      }
      await SecureStore.setItemAsync("securityPIN", pin);
      await SecurityService.enableWalletSecurity();
      return { success: true };
    } catch (error) {
      console.error("Failed to setup PIN:", error);
      return { success: false, error: "Failed to save PIN" };
    }
  },

  // Verify PIN
  verifyPIN: async (pin) => {
    try {
      const storedPIN = await SecureStore.getItemAsync("securityPIN");
      return storedPIN === pin;
    } catch (error) {
      console.error("Failed to verify PIN:", error);
      return false;
    }
  },

  // Change existing PIN
  changePIN: async (oldPIN, newPIN) => {
    try {
      const isValid = await SecurityService.verifyPIN(oldPIN);
      if (!isValid) {
        return { success: false, error: "Current PIN is incorrect" };
      }
      return await SecurityService.setupPIN(newPIN);
    } catch (error) {
      console.error("Failed to change PIN:", error);
      return { success: false, error: "Failed to change PIN" };
    }
  },

  // Prompt user for PIN input
  promptForPIN: async (reason = "Enter your PIN") => {
    return new Promise((resolve) => {
      Alert.prompt(
        "Security PIN Required",
        reason,
        [
          { text: "Cancel", onPress: () => resolve(null), style: "cancel" },
          {
            text: "Confirm",
            onPress: (pin) => resolve(pin),
          },
        ],
        "secure-text",
        "",
        "number-pad",
      );
    });
  },

  // Enhanced authentication with PIN verification
  authenticateWithPIN: async (reason = "Authenticate to continue") => {
    try {
      const hasPIN = await SecurityService.hasPIN();

      if (!hasPIN) {
        // No PIN set up, use simple confirmation
        return await SecurityService.fallbackAuth(reason);
      }

      const enteredPIN = await SecurityService.promptForPIN(reason);

      if (!enteredPIN) {
        return false; // User cancelled
      }

      const isValid = await SecurityService.verifyPIN(enteredPIN);

      if (!isValid) {
        Alert.alert(
          "Authentication Failed",
          "Incorrect PIN. Please try again.",
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("PIN authentication error:", error);
      return false;
    }
  },

  // Fallback authentication when PIN not set up
  fallbackAuth: async (reason) => {
    return new Promise((resolve) => {
      Alert.alert(
        "⚠️ Security Confirmation Required",
        `${reason}\n\nFor enhanced security, set up a PIN in Settings > Security.`,
        [
          { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
          { text: "Confirm", onPress: () => resolve(true) },
        ],
        { cancelable: false },
      );
    });
  },

  // Require authentication for sensitive wallet actions
  requireAuth: async (action = "access wallet") => {
    const securityEnabled = await SecurityService.isWalletSecurityEnabled();

    if (!securityEnabled) {
      // Even if security is disabled, require confirmation for sensitive actions
      return await SecurityService.fallbackAuth(`Confirm to ${action}`);
    }

    return await SecurityService.authenticateWithPIN(
      `Authenticate to ${action}`,
    );
  },

  // Specific authentication methods for different operations
  authenticateForWithdrawal: async (amount, currency = "GHS") => {
    const reason = `Confirm withdrawal of ${currency} ${amount.toFixed(2)}`;
    return await SecurityService.requireAuth(reason);
  },

  authenticateForPayoutChange: async () => {
    const reason = "update payout method";
    return await SecurityService.requireAuth(reason);
  },

  authenticateForP2PTransfer: async (amount, recipient) => {
    const reason = `transfer ${amount.toFixed(2)} GHS to ${recipient}`;
    return await SecurityService.requireAuth(reason);
  },

  authenticateForSensitiveData: async (dataType = "sensitive information") => {
    const reason = `view ${dataType}`;
    return await SecurityService.requireAuth(reason);
  },
};
