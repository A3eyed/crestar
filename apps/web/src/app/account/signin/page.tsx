'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '@/utils/useAuth';
import { SocialSignInButtons } from '@/components/SocialSignInButtons';
import {
  getFriendlyAuthError,
  isMobileWebViewContext,
  waitForSession,
  EXPO_SUCCESS_PATH,
} from '@/utils/authErrors';

// ── Theme tokens ─────────────────────────────────────────────────────────────
const DARK = {
  bg: '#000000',
  inputBg: 'rgba(255,255,255,0.07)',
  inputBorder: 'rgba(255,255,255,0.12)',
  inputText: '#FFFFFF',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.38)',
  linkColor: '#FFFFFF',
  linkMuted: 'rgba(255,255,255,0.38)',
  errorBg: 'rgba(220,38,38,0.12)',
  errorBorder: 'rgba(220,38,38,0.28)',
  errorText: '#F87171',
};

const LIGHT = {
  bg: '#FFFFFF',
  inputBg: '#F5F5F5',
  inputBorder: '#E2E2E2',
  inputText: '#000000',
  text: '#000000',
  textMuted: 'rgba(0,0,0,0.38)',
  linkColor: '#000000',
  linkMuted: 'rgba(0,0,0,0.4)',
  errorBg: '#FFF0F2',
  errorBorder: 'rgba(220,38,38,0.25)',
  errorText: '#DC2626',
};

function getSafeCallbackUrl(value) {
  const callbackUrl = value || '/';
  return callbackUrl.startsWith('/') ? callbackUrl : '/';
}

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('/');
  const [searchString, setSearchString] = useState('');
  const [isDark, setIsDark] = useState(null);
  const [isWebView, setIsWebView] = useState(false);

  const { signInWithCredentials } = useAuth();

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
        console.warn('⚠️ [SignIn] Error from URL params:', message);
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
      console.error('❌ [SignIn] Initialization error:', e);
      setIsDark(true);
    }
  }, []);

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
          console.error('[SignIn] Better Auth error:', result.error);
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

        const inWebView = isWebView || isMobileWebViewContext();
        const destination = inWebView
          ? EXPO_SUCCESS_PATH
          : getSafeCallbackUrl(callbackUrl === EXPO_SUCCESS_PATH ? '/' : callbackUrl);

        window.location.href = destination;
      } catch (err) {
        console.error('[SignIn] Unexpected error:', err);
        setError(getFriendlyAuthError(err, 'signin'));
        setLoading(false);
      }
    },
    [email, password, signInWithCredentials, callbackUrl, isWebView]
  );

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
            letterSpacing: '0.25em',
            margin: 0,
          }}
        >
          CRESTAR
        </h1>
        <p style={{ color: t.textMuted, fontSize: 13, margin: '6px 0 0' }}>
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
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px 16px',
              borderRadius: 12,
              border: 'none',
              backgroundColor: isDark ? '#FFFFFF' : '#000000',
              color: isDark ? '#000000' : '#FFFFFF',
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              marginTop: 2,
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <SocialSignInButtons callbackUrl={callbackUrl} />

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
