import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { devLog, devWarn, devError, secureAuthLog } from '../devLogger';

const PROJECT_GROUP_ID = process.env.EXPO_PUBLIC_PROJECT_GROUP_ID || 'crestar';
export const authKey = `${PROJECT_GROUP_ID}-jwt`;

interface User {
  id: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

interface Auth {
  jwt: string;
  user: User;
}

interface AuthStore {
  isReady: boolean;
  auth: Auth | null;
  setAuth: (auth: Auth | null) => Promise<void>;
  clearAuth: () => Promise<void>;
  forceRefresh: () => Promise<Auth | null>;
  initiate: () => Promise<void>;
}

interface AuthModalStore {
  isOpen: boolean;
  mode: 'signin' | 'signup';
  open: (options?: { mode?: 'signin' | 'signup' }) => void;
  close: () => void;
  setMode: (mode: 'signin' | 'signup') => void;
}

/**
 * Check if a token is expired.
 * Better Auth issues OPAQUE session tokens (random strings, not JWTs) —
 * those cannot be inspected locally and are validated by the server on
 * every request, so they are always treated as NOT expired here.
 * Only real 3-part JWTs get a local exp check.
 */
function isTokenExpired(jwt: string): boolean {
  try {
    if (!jwt || typeof jwt !== 'string' || jwt.trim().length === 0) {
      return true; // Empty token is invalid
    }

    const parts = jwt.split('.');
    if (parts.length !== 3) {
      // Opaque session token (Better Auth default) — server validates it.
      return false;
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      devWarn(`⏰ JWT expired at ${new Date(payload.exp * 1000).toISOString()}`);
      return true;
    }

    return false;
  } catch (error) {
    devError('❌ Error checking token expiration:', error);
    // If we can't parse it, assume it's an opaque token and let the server decide
    return false;
  }
}

/**
 * Simplified auth store - single session only, platform email/password auth
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  isReady: false,
  auth: null,

  setAuth: async (auth) => {
    if (auth) {
      try {
        // Ensure JWT is a plain string, not double-stringified
        if (auth.jwt && typeof auth.jwt === 'string') {
          // Remove any accidental quotes around the JWT
          auth.jwt = auth.jwt.replace(/^["']|["']$/g, '');
        }

        // Check if token is expired before storing
        if (isTokenExpired(auth.jwt)) {
          devWarn('⚠️ Auth Store: Attempted to save expired token, clearing instead');
          await SecureStore.deleteItemAsync(authKey);
          set({ auth: null, isReady: true });
          return;
        }

        const serialized = JSON.stringify(auth);
        await SecureStore.setItemAsync(authKey, serialized);

        // Verify the write succeeded by reading back
        const readBack = await SecureStore.getItemAsync(authKey);
        if (!readBack) {
          devWarn('⚠️ Auth Store: SecureStore write verification failed — retrying');
          await SecureStore.setItemAsync(authKey, serialized);

          // Second verification
          const secondRead = await SecureStore.getItemAsync(authKey);
          if (!secondRead) {
            devError('❌ Auth Store: SecureStore write failed after retry');
          }
        }

        // Update Zustand state AFTER confirmed persistence
        set({ auth, isReady: true });

        // SECURITY: Only log non-sensitive user identifiers
        secureAuthLog('✅ Auth Store: Saved + verified auth', {
          email: auth.user?.email,
          hasJWT: !!auth.jwt,
        });
      } catch (error) {
        devError('❌ Auth Store: setAuth error:', error);
        // Still set in memory even if SecureStore fails
        set({ auth, isReady: true });
      }
    } else {
      try {
        await SecureStore.deleteItemAsync(authKey);
      } catch (e) {
        devWarn('⚠️ Auth Store: Error deleting auth:', e);
      }
      set({ auth: null });
    }
  },

  /**
   * Clear all auth data and reset store.
   * Useful for fixing corrupted auth state.
   */
  clearAuth: async () => {
    try {
      await SecureStore.deleteItemAsync(authKey);
      set({ auth: null, isReady: true });
      devLog('🗑️ Auth Store: Cleared all auth data');
    } catch (error) {
      devError('❌ Auth Store: Error clearing auth:', error);
      set({ auth: null, isReady: true });
    }
  },

  /**
   * Force-refresh auth from SecureStore.
   * Useful after setAuth to guarantee React state is in sync.
   */
  forceRefresh: async () => {
    try {
      const stored = await SecureStore.getItemAsync(authKey);
      if (stored) {
        const auth = JSON.parse(stored);

        // Validate and fix token format
        if (auth?.jwt) {
          // Remove any accidental quotes around the token
          if (typeof auth.jwt === 'string') {
            auth.jwt = auth.jwt.replace(/^["']|["']$/g, '');
          }

          // If token is accidentally double-stringified, fix it
          if (typeof auth.jwt === 'string' && auth.jwt.startsWith('"')) {
            devWarn('⚠️ Token appears to be double-stringified, fixing...');
            try {
              auth.jwt = JSON.parse(auth.jwt);
              auth.jwt = auth.jwt.replace(/^["']|["']$/g, '');
            } catch (e) {
              devError('❌ Failed to parse double-stringified token');
            }
          }

          // Reject only empty tokens — Better Auth session tokens are
          // opaque strings, NOT 3-part JWTs, so no structural check here.
          if (typeof auth.jwt !== 'string' || auth.jwt.trim().length === 0) {
            devError('❌ Empty token in storage, clearing auth');
            await SecureStore.deleteItemAsync(authKey);
            set({ auth: null, isReady: true });
            return null;
          }

          // Check if token is expired (only applies to real JWTs)
          if (isTokenExpired(auth.jwt)) {
            devWarn('⚠️ Auth Store: Token expired, clearing auth');
            await SecureStore.deleteItemAsync(authKey);
            set({ auth: null, isReady: true });
            return null;
          }
        }

        set({ auth, isReady: true });
        // SECURITY: Only log non-sensitive identifiers
        secureAuthLog('🔄 Auth Store: Force-refreshed auth', {
          email: auth.user?.email,
          hasJWT: !!auth.jwt,
        });
        return auth;
      } else {
        set({ auth: null, isReady: true });
        return null;
      }
    } catch (error) {
      devError('❌ Auth Store: forceRefresh error:', error);
      return null;
    }
  },

  initiate: async () => {
    devLog('🔐 Auth Store: Initializing...');
    try {
      const stored = await SecureStore.getItemAsync(authKey);
      if (stored) {
        const auth = JSON.parse(stored);

        // Validate and fix token format
        if (auth?.jwt) {
          // Remove any accidental quotes around the token
          if (typeof auth.jwt === 'string') {
            auth.jwt = auth.jwt.replace(/^["']|["']$/g, '');
          }

          // If token is accidentally double-stringified, fix it
          if (typeof auth.jwt === 'string' && auth.jwt.startsWith('"')) {
            devWarn('⚠️ Token appears to be double-stringified, fixing...');
            try {
              auth.jwt = JSON.parse(auth.jwt);
              auth.jwt = auth.jwt.replace(/^["']|["']$/g, '');
            } catch (e) {
              devError('❌ Failed to parse double-stringified token');
            }
          }

          // Reject only empty tokens — Better Auth session tokens are
          // opaque strings, NOT 3-part JWTs, so no structural check here.
          if (typeof auth.jwt !== 'string' || auth.jwt.trim().length === 0) {
            devError('❌ Empty token in storage, clearing auth');
            await SecureStore.deleteItemAsync(authKey);
            set({ auth: null, isReady: true });
            return;
          }

          // Check if token is expired (only applies to real JWTs)
          if (isTokenExpired(auth.jwt)) {
            devWarn('⚠️ Auth Store: Token expired during init, clearing auth');
            await SecureStore.deleteItemAsync(authKey);
            set({ auth: null, isReady: true });
            devLog('🗑️ Cleared expired auth from storage');
            return;
          }
        }

        set({ auth, isReady: true });
        secureAuthLog('✅ Auth Store: Loaded saved auth', {
          email: auth.user?.email,
          hasJWT: !!auth.jwt,
        });
      } else {
        set({ auth: null, isReady: true });
        devLog('✅ Auth Store: No saved auth');
      }
    } catch (error) {
      devError('❌ Auth Store: Init error:', error);
      await SecureStore.deleteItemAsync(authKey);
      set({ auth: null, isReady: true });
    }
  },
}));

// Auth modal state store
export const useAuthModal = create<AuthModalStore>((set) => ({
  isOpen: false,
  mode: 'signin',

  open: (options = {}) => {
    set({ isOpen: true, mode: options.mode || 'signin' });
  },

  close: () => {
    set({ isOpen: false });
  },

  setMode: (mode) => {
    set({ mode });
  },
}));
