// @ts-nocheck
import { create } from 'zustand';
import AsyncStorage from './safeStorage';
import { Appearance } from 'react-native';

const useStore = create((set, get) => ({
  // User state
  hasSeenSplash: false,
  isOnboarded: false,
  user: null,
  userRoles: [],

  // Professional role approval status
  approvedRoles: [],
  highestApprovedRole: null,

  // Delivery state
  isDelivererOnline: false,

  // Wallet state
  walletBalance: 2450.0,
  walletVisible: true,

  // Theme: 'system' | 'dark' | 'light'
  // themePreference is what the user picked; theme is the resolved actual theme.
  themePreference: 'system',
  theme: Appearance.getColorScheme() === 'light' ? 'light' : 'dark',
  language: 'en',

  // Actions
  setHasSeenSplash: (value) => set({ hasSeenSplash: value }),
  setIsOnboarded: (value) => set({ isOnboarded: value }),
  setUser: (user) => set({ user }),
  setUserRoles: (roles) => set({ userRoles: roles }),
  addUserRole: (role) =>
    set((state) => ({
      userRoles: [...new Set([...state.userRoles, role])],
    })),

  setApprovedRoles: (roles) => {
    let highest = null;
    if (roles.includes('seller')) highest = 'seller';
    else if (roles.includes('deliverer')) highest = 'deliverer';
    else if (roles.includes('service_provider')) highest = 'service_provider';
    set({ approvedRoles: roles, highestApprovedRole: highest });
  },

  setIsDelivererOnline: (value) => set({ isDelivererOnline: value }),
  setWalletBalance: (balance) => set({ walletBalance: balance }),
  setWalletVisible: (visible) => set({ walletVisible: visible }),

  // Set the theme preference. 'system' follows the device, otherwise forces dark/light.
  setTheme: async (preference) => {
    try {
      let resolved = preference;
      if (preference === 'system') {
        const sys = Appearance.getColorScheme();
        resolved = sys === 'light' ? 'light' : 'dark';
      }
      set({ themePreference: preference, theme: resolved });
      await AsyncStorage.setItem('themePreference', preference);
    } catch (e) {
      console.error('Failed to set theme:', e);
    }
  },

  // Called by Appearance listener when system theme changes
  applySystemTheme: () => {
    const { themePreference } = get();
    if (themePreference !== 'system') return;
    const sys = Appearance.getColorScheme();
    set({ theme: sys === 'light' ? 'light' : 'dark' });
  },

  setLanguage: async (language) => {
    set({ language });
    await AsyncStorage.setItem('language', language);
  },

  getEarnButtonLabel: () => {
    const { highestApprovedRole } = get();
    if (highestApprovedRole === 'seller') return 'Seller Center';
    if (highestApprovedRole === 'deliverer') return 'Delivery Center';
    if (highestApprovedRole === 'service_provider') return 'Service Center';
    return 'Earn';
  },

  loadPersistedState: async () => {
    try {
      const onboarded = await AsyncStorage.getItem('isOnboarded');
      const userRoles = await AsyncStorage.getItem('userRoles');
      const user = await AsyncStorage.getItem('user');
      const approvedRoles = await AsyncStorage.getItem('approvedRoles');
      const themePreference = await AsyncStorage.getItem('themePreference');
      const oldTheme = await AsyncStorage.getItem('theme'); // legacy
      const language = await AsyncStorage.getItem('language');

      if (onboarded) set({ isOnboarded: JSON.parse(onboarded) });
      if (userRoles) set({ userRoles: JSON.parse(userRoles) });
      if (user) set({ user: JSON.parse(user) });
      if (language) set({ language });

      // Resolve theme:
      // 1. If user explicitly picked a preference, honor it.
      // 2. If only the legacy "theme" key exists, treat that as their preference.
      // 3. Otherwise default to "system" (follow OS).
      let preference = themePreference;
      if (!preference && oldTheme) preference = oldTheme;
      if (!preference) preference = 'system';

      let resolvedTheme;
      if (preference === 'system') {
        const sys = Appearance.getColorScheme();
        resolvedTheme = sys === 'light' ? 'light' : 'dark';
      } else {
        resolvedTheme = preference;
      }
      set({ themePreference: preference, theme: resolvedTheme });

      if (approvedRoles) {
        const roles = JSON.parse(approvedRoles);
        get().setApprovedRoles(roles);
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  },

  saveOnboarding: async (user, roles) => {
    try {
      await AsyncStorage.setItem('isOnboarded', JSON.stringify(true));
      // JSON.stringify(undefined) returns undefined (not a string), which the
      // native storage module rejects with an uncaught ObjC exception — so
      // fall back to an explicit empty payload.
      await AsyncStorage.setItem('user', JSON.stringify(user ?? null));
      await AsyncStorage.setItem('userRoles', JSON.stringify(roles ?? []));
      set({ isOnboarded: true, user, userRoles: roles });
    } catch (error) {
      console.error('Failed to save onboarding:', error);
    }
  },
}));

// Subscribe to system appearance changes — updates theme live if user is on "system"
Appearance.addChangeListener(({ colorScheme }) => {
  const state = useStore.getState();
  if (state.themePreference === 'system') {
    state.applySystemTheme();
  }
});

export default useStore;
