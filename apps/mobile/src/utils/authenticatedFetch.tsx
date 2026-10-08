// @ts-nocheck
import { useAuthStore } from './auth/store';
import { devLog, devWarn, secureNetworkLog } from './devLogger';

/**
 * Safely parse JSON from a fetch response.
 * Guards against HTML error pages (e.g. 404/500 returning HTML instead of JSON).
 */
export async function safeJsonParse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // Do NOT log raw response text — may contain sensitive user data (App Store 5.1.1)
    throw new Error('Connection error, please try again.');
  }
  return response.json();
}

/**
 * Fetch with timeout protection
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30s)
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  }
}

/**
 * Retry fetch with exponential backoff
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @returns {Promise<Response>}
 */
async function retryableFetch(url, options, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
        devLog(`🔄 Retry attempt ${attempt}/${maxRetries} for ${url} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await fetchWithTimeout(url, options);

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // Retry on server errors (5xx) or network issues
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      devWarn(`⚠️ Request attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on auth errors
      if (error.message.includes('401') || error.message.includes('403')) {
        throw error;
      }

      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

/**
 * Helper function to make authenticated API requests with JWT token.
 * Automatically prepends the base URL to relative paths (starting with `/`)
 * so cart/checkout/order API calls work in TestFlight and Expo Go.
 *
 * Features:
 * - Automatic URL resolution for React Native
 * - JWT token injection
 * - Timeout protection (30s)
 * - Automatic retry with exponential backoff (up to 2 retries)
 * - Comprehensive error handling
 *
 * @param {string} url - API endpoint URL (can be relative or absolute)
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {object} config - Additional config { retry: boolean, timeout: number }
 * @returns {Promise<Response>} - Fetch response
 */
export async function authenticatedFetch(url, options = {}, config = {}) {
  const { retry = true, timeout = 30000 } = config;

  const { auth } = useAuthStore.getState();

  // Resolve relative URLs to absolute URLs
  let resolvedUrl = url;
  if (url.startsWith('/')) {
    const baseURL =
      process.env.EXPO_PUBLIC_BASE_URL ||
      process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
      'https://crestarhq.com';
    resolvedUrl = `${baseURL.replace(/\/$/, '')}${url}`;
    devLog(`🔧 Resolved ${url} → ${resolvedUrl}`);
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add JWT token if available
  if (auth?.jwt) {
    headers.Authorization = `Bearer ${auth.jwt}`;
    // SECURITY: Never log JWT content, length, or preview
    secureNetworkLog('🔐 Authenticated request', {
      hasAuth: true,
      url: resolvedUrl,
    });
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  const response = retry
    ? await retryableFetch(resolvedUrl, fetchOptions)
    : await fetchWithTimeout(resolvedUrl, fetchOptions, timeout);

  // A 401 from better-auth's bearer plugin means the stored session token is
  // no longer valid (revoked, expired, or issued by a different secret).
  // Clear it so the app prompts for sign-in instead of silently failing on
  // every screen. Auth endpoints are skipped — they legitimately 401.
  if (response.status === 401 && auth?.jwt && !resolvedUrl.includes('/api/auth/')) {
    devWarn('🔒 Session rejected by server (401) — clearing stored auth');
    try {
      await useAuthStore.getState().clearAuth();
    } catch (clearError) {
      devWarn('⚠️ Failed to clear auth after 401:', clearError);
    }
  }

  return response;
}

/**
 * React hook version of authenticated fetch for use in components
 */
export function useAuthenticatedFetch() {
  return authenticatedFetch;
}
