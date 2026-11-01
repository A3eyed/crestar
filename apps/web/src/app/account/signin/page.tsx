'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '@/utils/useAuth';
import {
  getFriendlyAuthError,
  isMobileWebViewContext,
  waitForSession,
  EXPO_SUCCESS_PATH,
} from '@/utils/authErrors';

const DARK = {
  bg: '#000000',
  inputBg: 'rgba(255,255,255,0.07)',
  inputBorder: 'rgba(255,255,255,0.12)',
  inputText: '#FFFFFF',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.45)',
  linkColor: '#FFFFFF',
  linkMuted: 'rgba(255,255,255,0.45)',
  errorBg: 'rgba(220,38,38,0.12)',
  errorBorder: 'rgba(220,38,38,0.28)',
  errorText: '#F87171',
  socialBg: 'rgba(255,255,255,0.08)',
  socialBorder: 'rgba(255,255,255,0.16)',
  socialText: '#FFFFFF',
  divider: 'rgba(255,255,255,0.12)',
  primaryBg: '#FFFFFF',
  primaryText: '#000000',
};

const LIGHT = {
  bg: '#FFFFFF',
  inputBg: '#F5F5F5',
  inputBorder: '#E2E2E2',
  inputText: '#000000',
  text: '#000000',
  textMuted: 'rgba(0,0,0,0.45)',
  linkColor: '#000000',
  linkMuted: 'rgba(0,0,0,0.45)',
  errorBg: '#FFF0F2',
  errorBorder: 'rgba(220,38,38,0.25)',
  errorText: '#DC2626',
  socialBg: '#FFFFFF',
  socialBorder: 'rgba(0,0,0,0.12)',
  socialText: '#000000',
  divider: 'rgba(0,0,0,0.1)',
  primaryBg: '#000000',
  primaryText: '#FFFFFF',
};

function AppleLogo({ color = 'currentColor' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function getSafeCallbackUrl(value) {
  const callbackUrl = value || '/';
  return callbackUrl.startsWith('/') ? callbackUrl : '/';
}

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [callbackUrl, setCallbackUrl] = useState('/');
  const [searchString, setSearchString] = useState('');
  const [isDark, setIsDark] = useState(null);
  const [isWebView, setIsWebView] = useState(false);

  const { signInWithCredentials, signInWithApple } = useAuth();

  useEffect(() => {
    try {
      const inWebView = isMobileWebViewContext();
      setIsWebView(inWebView);

      const url = new URL(window.location.href);
      const params = url.searchParams;
      const cbUrl = getSafeCallbackUrl(params.get('callbackUrl'));
      setCallbackUrl(cbUrl || '/');

      const message = getFriendlyAuthError(params.get('error'), 'signin');
      if (message) {
        setError(message);
        params.delete('error');
        params.delete('code');
        window.history.replaceState({}, '', url.toString());
      }
      const nextSearch = params.toString();
      setSearchString(nextSearch ? `?${nextSearch}` : '');

      let dark = true;
      try {
        const urlTheme = params.get('theme');
        if (urlTheme === 'light') dark = false;
        else if (urlTheme === 'dark') dark = true;
        else {
          const saved = localStorage.getItem('theme');
          if (saved === 'light') dark = false;
          else if (saved === 'dark') dark = true;
          else dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
      } catch {}
      setIsDark(dark);
    } catch (e) {
      console.error('[SignIn] Initialization error:', e);
      setIsDark(true);
    }
  }, []);

  const resolveDestination = useCallback(() => {
    const inWebView = isWebView || isMobileWebViewContext();
    return inWebView
      ? EXPO_SUCCESS_PATH
      : getSafeCallbackUrl(callbackUrl === EXPO_SUCCESS_PATH ? '/' : callbackUrl);
  }, [callbackUrl, isWebView]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password;

      if (!normalizedEmail || !normalizedPassword) {
        setError('Please enter your email and password.');
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const result = await signInWithCredentials({
          email: normalizedEmail,
          password: normalizedPassword,
        });

        if (result?.error) {
          setError(getFriendlyAuthError(result.error, 'signin'));
          setLoading(false);
          return;
        }

        const session = await waitForSession();
        if (!session) {
          setError("We signed you in but couldn't start your session. Please try again.");
          setLoading(false);
          return;
        }

        window.location.href = resolveDestination();
      } catch (err) {
        setError(getFriendlyAuthError(err, 'signin'));
        setLoading(false);
      }
    },
    [email, password, signInWithCredentials, resolveDestination],
  );

  const onApple = useCallback(async () => {
    setError(null);
    setSocialLoading('apple');
    try {
      const dest = resolveDestination();
      // Relative path only — useAuth builds a same-origin absolute callbackURL
      const result = await signInWithApple({
        callbackURL: dest === EXPO_SUCCESS_PATH ? dest : dest || '/',
      });

      // If we still have a result, navigation did not leave the page
      if (result?.error) {
        setError(
          getFriendlyAuthError(result.error, 'signin') ||
            result.error.message ||
            'Apple sign-in failed. Please try again.',
        );
        setSocialLoading(null);
        return;
      }

      // Safety net: if still here after 8s, surface an error
      window.setTimeout(() => {
        setSocialLoading((current) => {
          if (current === 'apple') {
            setError(
              'Apple sign-in is taking too long. Confirm the Services ID return URL is set to the Neon callback, then try again.',
            );
            return null;
          }
          return current;
        });
      }, 8000);
    } catch (err) {
      setError(getFriendlyAuthError(err, 'signin'));
      setSocialLoading(null);
    }
  }, [signInWithApple, resolveDestination]);

  if (isDark === null) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#000' }} />;
  }

  const t = isDark ? DARK : LIGHT;

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    fontSize: 16,
    padding: '14px 16px',
    borderRadius: 12,
    border: `1px solid ${t.inputBorder}`,
    backgroundColor: t.inputBg,
    color: t.inputText,
    outline: 'none',
    WebkitAppearance: 'none',
    WebkitTextFillColor: t.inputText,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: t.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        boxSizing: 'border-box',
      }}
    >
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <h1
          style={{
            color: t.text,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: '0.2em',
            margin: 0,
          }}
        >
          CRESTAR
        </h1>
        <p style={{ color: t.textMuted, fontSize: 14, margin: '8px 0 0' }}>
          Sign in to your account
        </p>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={onApple}
          disabled={!!socialLoading || loading}
          style={{
            position: 'relative',
            width: '100%',
            height: 48,
            borderRadius: 12,
            border: `1px solid ${t.socialBorder}`,
            backgroundColor: t.socialBg,
            color: t.socialText,
            fontSize: 15,
            fontWeight: 600,
            cursor: socialLoading ? 'not-allowed' : 'pointer',
            opacity: socialLoading === 'apple' ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 16,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <AppleLogo color={t.socialText} />
          </span>
          {socialLoading === 'apple' ? 'Connecting…' : 'Continue with Apple'}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '4px 0',
          }}
        >
          <div style={{ flex: 1, height: 1, backgroundColor: t.divider }} />
          <span style={{ color: t.textMuted, fontSize: 12, fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, backgroundColor: t.divider }} />
        </div>

        <form
          noValidate
          onSubmit={onSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <input
            required
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Email address"
            autoCapitalize="none"
            autoComplete="email"
            style={inputStyle}
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Password"
            autoComplete="current-password"
            style={inputStyle}
          />

          {error && (
            <div
              style={{
                padding: '11px 16px',
                borderRadius: 10,
                backgroundColor: t.errorBg,
                border: `1px solid ${t.errorBorder}`,
              }}
            >
              <p
                style={{
                  color: t.errorText,
                  fontSize: 13,
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !!socialLoading}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 12,
              border: 'none',
              backgroundColor: t.primaryBg,
              color: t.primaryText,
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              marginTop: 2,
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 2 }}>
            <a
              href="/account/forgot-password"
              style={{
                color: t.linkMuted,
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              Forgot password?
            </a>
          </div>
        </form>
      </div>

      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <span style={{ color: t.linkMuted, fontSize: 14 }}>Don't have an account? </span>
        <a
          href={`/account/signup${searchString}`}
          style={{
            color: t.linkColor,
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Sign up
        </a>
      </div>
    </div>
  );
}
