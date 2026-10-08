'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '@/utils/useAuth';
import {
  getFriendlyAuthError,
  isMobileWebViewContext,
  waitForSession,
  EXPO_SUCCESS_PATH,
} from '@/utils/authErrors';

function getSafeCallbackUrl(value) {
  const callbackUrl = value || '/';
  return callbackUrl.startsWith('/') ? callbackUrl : '/';
}

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [ready, setReady] = useState<boolean>(false);
  const [callbackUrl, setCallbackUrl] = useState<string>('/');
  const [searchString, setSearchString] = useState<string>('');
  const [isWebView, setIsWebView] = useState<boolean>(false);

  const { signUpWithCredentials } = useAuth();

  useEffect(() => {
    try {
      // Detect if we're in a mobile WebView (callbackUrl is the reliable signal)
      const inWebView = isMobileWebViewContext();
      setIsWebView(inWebView);

      const url = new URL(window.location.href);
      const params = url.searchParams;
      const cbUrl = getSafeCallbackUrl(params.get('callbackUrl'));
      setCallbackUrl(cbUrl || '/');

      const message = getFriendlyAuthError(params.get('error'), 'signup');
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
          const savedTheme = localStorage.getItem('theme');
          if (savedTheme === 'light') dark = false;
          else if (savedTheme === 'dark') dark = true;
          else dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
      } catch {}
      setIsDark(dark);
    } catch {
      setIsDark(true);
    }
    setReady(true);
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password;

      if (!normalizedEmail || !normalizedPassword) {
        setError('Please enter an email and a password.');
        return;
      }

      if (normalizedPassword.length < 8) {
        setError('Your password must be at least 8 characters long.');
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const result = await signUpWithCredentials({
          email: normalizedEmail,
          password: normalizedPassword,
          name: normalizedEmail.split('@')[0] || 'User',
        });

        if (result?.error) {
          console.error('[SignUp] Better Auth error:', result.error);
          setError(getFriendlyAuthError(result.error, 'signup'));
          setLoading(false);
          return;
        }

        // Confirm the session cookie is readable before navigating away so the
        // WebView bridge never reads an empty cookie jar.
        const session = await waitForSession();
        if (!session) {
          setError("Your account was created but we couldn't sign you in. Please sign in.");
          setLoading(false);
          return;
        }

        // Re-check the native bridge at submit time — it is injected at
        // document-end and may not have existed when the page mounted.
        const inWebView = isWebView || isMobileWebViewContext();
        const destination = inWebView
          ? EXPO_SUCCESS_PATH
          : getSafeCallbackUrl(callbackUrl === EXPO_SUCCESS_PATH ? '/' : callbackUrl);

        window.location.href = destination;
      } catch (err) {
        console.error('[SignUp] Unexpected error:', err);
        setError(getFriendlyAuthError(err as { message?: string }, 'signup'));
        setLoading(false);
      }
    },
    [email, password, signUpWithCredentials, callbackUrl, isWebView]
  );

  // Show black while loading — prevents white flash in dark mobile WebView
  if (!ready) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#000000' }} />;
  }

  const c = isDark
    ? {
        bg: '#000000',
        text: '#FFFFFF',
        subtle: 'rgba(255,255,255,0.4)',
        inputBg: 'rgba(255,255,255,0.06)',
        inputBorder: 'rgba(255,255,255,0.12)',
        inputText: '#FFFFFF',
        primaryBg: '#FFFFFF',
        primaryText: '#000000',
        errorBg: 'rgba(255,90,90,0.12)',
        errorBorder: 'rgba(255,90,90,0.25)',
        errorText: '#FF5A5A',
      }
    : {
        bg: '#FFFFFF',
        text: '#000000',
        subtle: 'rgba(0,0,0,0.5)',
        inputBg: '#F5F5F5',
        inputBorder: '#E5E5E5',
        inputText: '#000000',
        primaryBg: '#000000',
        primaryText: '#FFFFFF',
        errorBg: '#FFF0F2',
        errorBorder: 'rgba(220,38,38,0.25)',
        errorText: '#DC2626',
      };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    fontSize: 16,
    padding: '14px 16px',
    borderRadius: 12,
    border: `1px solid ${c.inputBorder}`,
    backgroundColor: c.inputBg,
    color: c.inputText,
    outline: 'none',
    WebkitTextFillColor: c.inputText,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: c.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <h1
          style={{
            color: c.text,
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '0.2em',
            margin: 0,
          }}
        >
          CRESTAR
        </h1>
        <p style={{ color: c.subtle, fontSize: 13, marginTop: 6 }}>Create your account</p>
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
            placeholder="Password (8+ characters)"
            autoComplete="new-password"
            style={inputStyle}
          />

          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                backgroundColor: c.errorBg,
                border: `1px solid ${c.errorBorder}`,
              }}
            >
              <p
                style={{
                  color: c.errorText,
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
              backgroundColor: c.primaryBg,
              color: c.primaryText,
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <span style={{ color: c.subtle, fontSize: 14 }}>Already have an account? </span>
        <a
          href={`/account/signin${searchString}`}
          style={{
            color: c.text,
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Sign in
        </a>
      </div>
    </div>
  );
}
