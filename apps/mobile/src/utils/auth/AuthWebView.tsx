// @ts-nocheck
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuthStore, useAuthModal } from './store';
import { devLog, devError, devWarn } from '../devLogger';

const nativeCallbackUrl = '/api/auth/expo-web-success';
const webCallbackUrl = '/api/auth/expo-web-success';
const makeCallbackQueryString = (url) => `callbackUrl=${encodeURIComponent(url)}`;
const getUrlWithCallback = (url, callbackUrl) => {
  const hasParams = url.includes('?');
  const separator = hasParams ? '&' : '?';
  if (url.includes('callbackUrl=')) {
    return url;
  }
  return `${url}${separator}${makeCallbackQueryString(callbackUrl)}`;
};

const getOrigin = (url) => {
  try {
    return new URL(url).origin;
  } catch (err) {
    return url;
  }
};

/**
 * Renders the authentication WebView (native) or iframe (Expo web).
 */
export const AuthWebView = ({ mode, proxyURL, baseURL }) => {
  const nativeStartUrl = `${baseURL}/account/${mode}?${makeCallbackQueryString(nativeCallbackUrl)}`;
  const [currentURI, setURI] = useState(nativeStartUrl);
  const { auth, setAuth, isReady, forceRefresh } = useAuthStore();
  const { close: closeModal } = useAuthModal();
  const isAuthenticated = isReady ? !!auth : null;
  const iframeRef = useRef(null);
  const [hasReceivedMessage, setHasReceivedMessage] = useState(false);

  // A header whose env var is unset crosses the bridge as NSNull, and the
  // native networking layer then calls -length on it — an uncaught ObjC
  // exception that aborts the entire process. Only send real string values.
  const requestHeaders = useMemo(() => {
    const candidates = {
      'x-createxyz-project-group-id': process.env.EXPO_PUBLIC_PROJECT_GROUP_ID,
      host: process.env.EXPO_PUBLIC_HOST,
      'x-forwarded-host': process.env.EXPO_PUBLIC_HOST,
      'x-createxyz-host': process.env.EXPO_PUBLIC_HOST,
    };
    const result = {};
    for (const [key, value] of Object.entries(candidates)) {
      if (typeof value === 'string' && value.length > 0) {
        result[key] = value;
      }
    }
    return result;
  }, []);

  // When auth becomes available, close the auth modal immediately
  useEffect(() => {
    if (isAuthenticated) {
      // Close immediately - no delay needed since auth is already persisted
      closeModal();
    }
  }, [isAuthenticated, closeModal]);

  // Keep the WebView pointed at the right page when the mode changes.
  useEffect(() => {
    if (isAuthenticated) {
      return;
    }
    const newURI = `${baseURL}/account/${mode}?${makeCallbackQueryString(nativeCallbackUrl)}`;
    setURI(newURI);
  }, [mode, baseURL, isAuthenticated]);

  const handleAuthMessage = useCallback(
    async (payload) => {
      if (!payload || typeof payload !== 'object') {
        devWarn('[AuthWebView] Invalid payload received');
        Alert.alert('Auth Error', 'Received invalid authentication data');
        return;
      }

      if (payload.type === 'AUTH_SUCCESS' && payload.jwt) {
        // ✅ Better Auth issues opaque session tokens (not 3-part JWTs).
        // Only require a non-empty string token — the server validates it
        // on every request via the bearer plugin.
        if (typeof payload.jwt !== 'string' || payload.jwt.trim().length === 0) {
          devError('[AuthWebView] Empty or invalid token received');
          Alert.alert('Auth Error', 'Received invalid authentication token');
          return;
        }

        devLog('[AuthWebView] Auth success for user:', payload.user?.email);
        setHasReceivedMessage(true);

        try {
          // Save auth data
          await setAuth({
            jwt: payload.jwt,
            user: payload.user,
          });

          // Force refresh to ensure state is synchronized
          const refreshedAuth = await forceRefresh();

          if (!refreshedAuth) {
            devError('[AuthWebView] Force refresh returned null - auth may not have persisted');
            Alert.alert('Auth Error', 'Failed to save authentication. Please try again.');
          }
          // Modal closes automatically via useEffect above on success
        } catch (error) {
          devError('[AuthWebView] Error saving auth:', error);
          Alert.alert('Auth Error', 'Failed to save authentication. Please try again.');
        }
      } else if (payload.type === 'AUTH_ERROR') {
        devError('[AuthWebView] Auth error:', payload.error);
        Alert.alert('Sign-in Failed', payload.error || 'An error occurred during sign-in');
      }
    },
    [setAuth, forceRefresh]
  );

  // Expo web (development): receive the JWT via postMessage from the iframe.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) {
      return;
    }
    const allowedOrigin = getOrigin(proxyURL);
    const handleMessage = (event) => {
      // Verify the origin for security.
      if (event.origin !== allowedOrigin) {
        return;
      }
      handleAuthMessage(event.data);
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleAuthMessage, proxyURL]);

  if (Platform.OS === 'web') {
    const handleIframeError = () => {
      devError('[AuthWebView] Failed to load auth iframe');
    };

    return (
      <iframe
        ref={iframeRef}
        title="Authentication"
        src={`${proxyURL}/account/${mode}?${makeCallbackQueryString(webCallbackUrl)}`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        onError={handleIframeError}
      />
    );
  }

  // ── Native device: render a WebView and receive auth through postMessage ──
  return (
    <WebView
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      source={{ uri: currentURI }}
      headers={requestHeaders}
      onMessage={(event) => {
        try {
          const payload = JSON.parse(event.nativeEvent.data);
          handleAuthMessage(payload);
        } catch (err) {
          devError('[AuthWebView] Failed to parse auth message:', err);
        }
      }}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        devError('[AuthWebView] Error loading:', nativeEvent.description);
      }}
      onShouldStartLoadWithRequest={(request) => {
        let requestUrl;
        try {
          requestUrl = new URL(request.url);
        } catch (err) {
          return true;
        }

        // Let the success endpoint load inside the WebView so it can read the
        // WebView cookie and send the JWT back via postMessage.
        if (requestUrl.pathname === nativeCallbackUrl) {
          return true;
        }

        // Allow the current page to load normally.
        if (request.url === currentURI) {
          return true;
        }

        // Rewrite proxy URLs back to the base URL and keep one callbackUrl.
        const newURL = request.url.replaceAll(proxyURL, baseURL);
        setURI(getUrlWithCallback(newURL, nativeCallbackUrl));
        return false;
      }}
      // Inject JavaScript to support window.ReactNativeWebView.postMessage
      injectedJavaScript={`
        (function() {
          // Make sure ReactNativeWebView is available for the auth success page
          if (typeof window.ReactNativeWebView === 'undefined') {
            window.ReactNativeWebView = {
              postMessage: function(data) {
                window.postMessage(data, '*');
              }
            };
          }
        })();
        true; // Required to prevent warning
      `}
      style={{ flex: 1 }}
    />
  );
};
