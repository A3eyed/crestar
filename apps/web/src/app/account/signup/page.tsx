'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '@/utils/useAuth';
import {
  getFriendlyAuthError,
  isMobileWebViewContext,
  waitForSession,
  EXPO_SUCCESS_PATH,
  SIGNUP_VERIFY_EMAIL_MESSAGE,
} from '@/utils/authErrors';

function getSafeCallbackUrl(value: string | null) {
  const callbackUrl = value || '/';
  return callbackUrl.startsWith('/') ? callbackUrl : '/';
}

function AppleLogo({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [agreed, setAgreed] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(true);
  const [ready, setReady] = useState<boolean>(false);
  const [callbackUrl, setCallbackUrl] = useState<string>('/');
  const [searchString, setSearchString] = useState<string>('');
  const [isWebView, setIsWebView] = useState<boolean>(false);

  const { signUpWithCredentials, signInWithApple } = useAuth();

  useEffect(() => {
    try {
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

  const resolveDestination = useCallback(() => {
    const inWebView = isWebView || isMobileWebViewContext();
    if (inWebView) return EXPO_SUCCESS_PATH;
    return getSafeCallbackUrl(callbackUrl === EXPO_SUCCESS_PATH ? '/' : callbackUrl);
  }, [callbackUrl, isWebView]);

  const onApple = useCallback(async () => {
    if (!isAdult || !agreed) {
      setError(
        !isAdult
          ? 'You must confirm you are at least 18 years old to create an account.'
          : 'Agree to the Terms and Privacy Policy to continue.'
      );
      return;
    }
    setError(null);
    setSocialLoading('apple');
    try {
      try {
        localStorage.setItem('crestar_age_confirmed', '18+');
      } catch {}
      const dest = resolveDestination();
      const result = await signInWithApple({
        callbackURL:
          typeof window !== 'undefined'
            ? `${window.location.origin}${dest}`
            : dest,
      });
      if (result?.error) {
        setError(getFriendlyAuthError(result.error, 'signup'));
        setSocialLoading(null);
      }
    } catch (err) {
      setError(getFriendlyAuthError(err as { message?: string }, 'signup'));
      setSocialLoading(null);
    }
  }, [isAdult, agreed, signInWithApple, resolveDestination]);

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

      if (!isAdult) {
        setError('You must confirm you are at least 18 years old to create an account.');
        return;
      }

      if (!agreed) {
        setError('Agree to the Terms and Privacy Policy to create an account.');
        return;
      }

      setError(null);
      setInfo(null);
      setLoading(true);

      try {
        const result = await signUpWithCredentials({
          email: normalizedEmail,
          password: normalizedPassword,
          name: normalizedEmail.split('@')[0] || 'User',
        });

        if (result?.error) {
          console.error('[SignUp] Auth error:', result.error);
          setError(getFriendlyAuthError(result.error, 'signup'));
          setLoading(false);
          return;
        }

        try {
          localStorage.setItem('crestar_age_confirmed', '18+');
        } catch {}

        const session = await waitForSession();
        const inWebView = isWebView || isMobileWebViewContext();

        if (!session) {
          setInfo(SIGNUP_VERIFY_EMAIL_MESSAGE);
          setLoading(false);
          window.setTimeout(() => {
            window.location.href = `/account/signin${searchString}`;
          }, 2500);
          return;
        }

        if (inWebView) {
          window.location.href = EXPO_SUCCESS_PATH;
          return;
        }

        const dest = getSafeCallbackUrl(
          callbackUrl === EXPO_SUCCESS_PATH ? '/' : callbackUrl
        );
        if (dest === '/' || dest === '/profile') {
          window.location.href = `/account/verify-email?optional=1&callbackUrl=${encodeURIComponent(dest)}`;
        } else {
          window.location.href = dest;
        }
      } catch (err) {
        console.error('[SignUp] Unexpected error:', err);
        setError(getFriendlyAuthError(err as { message?: string }, 'signup'));
        setLoading(false);
      }
    },
    [email, password, agreed, isAdult, signUpWithCredentials, callbackUrl, isWebView, searchString]
  );

  if (!ready) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#000000' }} />;
  }

  const c = isDark
    ? {
        bg: '#000000',
        text: '#FFFFFF',
        subtle: 'rgba(255,255,255,0.5)',
        inputBg: 'rgba(255,255,255,0.08)',
        inputBorder: 'rgba(255,255,255,0.12)',
        inputText: '#FFFFFF',
        primaryBg: '#FE2C55',
        primaryText: '#FFFFFF',
        errorBg: 'rgba(254,44,85,0.12)',
        errorBorder: 'rgba(254,44,85,0.28)',
        errorText: '#FE2C55',
        infoBg: 'rgba(212,175,55,0.12)',
        infoBorder: 'rgba(212,175,55,0.35)',
        infoText: '#D4AF37',
        socialBg: 'rgba(255,255,255,0.08)',
        socialBorder: 'rgba(255,255,255,0.18)',
        socialText: '#FFFFFF',
        divider: 'rgba(255,255,255,0.12)',
        linkColor: '#FE2C55',
      }
    : {
        bg: '#FFFFFF',
        text: '#161823',
        subtle: 'rgba(22,24,35,0.5)',
        inputBg: '#F1F1F2',
        inputBorder: '#E3E3E4',
        inputText: '#161823',
        primaryBg: '#FE2C55',
        primaryText: '#FFFFFF',
        errorBg: 'rgba(254,44,85,0.08)',
        errorBorder: 'rgba(254,44,85,0.25)',
        errorText: '#FE2C55',
        infoBg: '#FFF8E6',
        infoBorder: 'rgba(212,175,55,0.45)',
        infoText: '#8A6D1B',
        socialBg: '#FFFFFF',
        socialBorder: 'rgba(22,24,35,0.12)',
        socialText: '#161823',
        divider: 'rgba(22,24,35,0.12)',
        linkColor: '#FE2C55',
      };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    fontSize: 16,
    padding: '14px 16px',
    borderRadius: 8,
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
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <h1
          style={{
            color: c.text,
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Crestar
        </h1>
        <p style={{ color: c.subtle, fontSize: 15, marginTop: 10 }}>Sign up for Crestar</p>
      </div>

      <div style={{ width: '100%', maxWidth: 375, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          type="button"
          onClick={onApple}
          disabled={!!socialLoading || loading}
          style={{
            position: 'relative',
            width: '100%',
            height: 48,
            borderRadius: 4,
            border: `1px solid ${c.socialBorder}`,
            backgroundColor: c.socialBg,
            color: c.socialText,
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
          <span style={{ position: 'absolute', left: 16, display: 'flex', alignItems: 'center' }}>
            <AppleLogo color={c.socialText} />
          </span>
          {socialLoading === 'apple' ? 'Connecting…' : 'Continue with Apple'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, backgroundColor: c.divider }} />
          <span style={{ color: c.subtle, fontSize: 13, fontWeight: 500 }}>OR</span>
          <div style={{ flex: 1, height: 1, backgroundColor: c.divider }} />
        </div>

        <form noValidate onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                padding: '12px 14px',
                borderRadius: 8,
                backgroundColor: c.errorBg,
                border: `1px solid ${c.errorBorder}`,
              }}
            >
              <p style={{ color: c.errorText, fontSize: 13, textAlign: 'center', margin: 0, fontWeight: 500 }}>
                {error}
              </p>
            </div>
          )}

          {info && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                backgroundColor: c.infoBg,
                border: `1px solid ${c.infoBorder}`,
              }}
            >
              <p style={{ color: c.infoText, fontSize: 13, textAlign: 'center', margin: 0 }}>{info}</p>
            </div>
          )}

          <label
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              color: c.subtle,
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            <input
              type="checkbox"
              checked={isAdult}
              onChange={(e) => {
                setIsAdult(e.target.checked);
                if (error) setError(null);
              }}
              style={{ marginTop: 2 }}
            />
            <span>I confirm that I am at least 18 years old.</span>
          </label>

          <label
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              color: c.subtle,
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (error) setError(null);
              }}
              style={{ marginTop: 2 }}
            />
            <span>
              I agree to the{' '}
              <a href="/terms" style={{ color: c.text, fontWeight: 700 }}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" style={{ color: c.text, fontWeight: 700 }}>
                Privacy Policy
              </a>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !agreed || !isAdult || !!socialLoading}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 4,
              border: 'none',
              backgroundColor: c.primaryBg,
              color: c.primaryText,
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading || !agreed || !isAdult ? 0.65 : 1,
              marginTop: 4,
            }}
          >
            {loading ? 'Signing up…' : 'Sign up'}
          </button>
        </form>
      </div>

      <div
        style={{
          marginTop: 28,
          textAlign: 'center',
          padding: '16px 0',
          borderTop: `1px solid ${c.divider}`,
          width: '100%',
          maxWidth: 375,
        }}
      >
        <span style={{ color: c.subtle, fontSize: 14 }}>Already have an account? </span>
        <a
          href={`/account/signin${searchString}`}
          style={{ color: c.linkColor, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
        >
          Log in
        </a>
      </div>
    </div>
  );
}
