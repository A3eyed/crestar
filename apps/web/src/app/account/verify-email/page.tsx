// @ts-nocheck
'use client';
import { useState, useEffect, useRef } from 'react';

/**
 * Optional 6-digit email verification.
 * Clean, minimal layout. Users may continue without verifying.
 */
export default function VerifyEmailPage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [optional, setOptional] = useState(true);
  const [callbackUrl, setCallbackUrl] = useState('/');
  const inputs = useRef([]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setOptional(params.get('optional') !== '0');
      const cb = params.get('callbackUrl');
      if (cb && cb.startsWith('/')) setCallbackUrl(cb);
    } catch {}
    sendCode(true);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const goApp = () => {
    window.location.href = callbackUrl || '/';
  };

  const sendCode = async (silent = false) => {
    try {
      setSending(true);
      const res = await fetch('/api/auth/send-verification', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = '/account/signin?callbackUrl=/account/verify-email';
        return;
      }
      if (res.status === 429) {
        setResendCooldown(data.cooldown || 60);
        return;
      }
      if (res.ok) {
        if (data.alreadyVerified) {
          setSuccess(true);
          setTimeout(goApp, 1200);
          return;
        }
        setResendCooldown(60);
        if (!silent) setError(null);
      } else if (!silent) {
        setError(data.error || 'Could not send code');
      }
    } catch {
      if (!silent) setError('Could not send code. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleChangeDigit = (val, index) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    setError(null);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
    if (next.every((d) => d !== '')) {
      verifyCode(next.join(''));
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...code];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    setCode(next);
    if (pasted.length === 6) verifyCode(pasted);
    else inputs.current[pasted.length]?.focus();
  };

  const verifyCode = async (full) => {
    try {
      setVerifying(true);
      setError(null);
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: full }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(goApp, 1200);
      } else {
        setCode(['', '', '', '', '', '']);
        setTimeout(() => inputs.current[0]?.focus(), 50);
        setError(data.error || 'Incorrect code. Please try again.');
      }
    } catch {
      setError('Could not verify. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.inner}>
          <p style={styles.successTitle}>Email verified</p>
          <p style={styles.muted}>Opening Crestar</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        <h1 style={styles.logo}>CRESTAR</h1>

        <h2 style={styles.title}>Enter code</h2>
        <p style={styles.subtitle}>
          A 6 digit code was sent to your email. Enter it below to verify your account.
        </p>

        <div style={styles.codeRow}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(r) => (inputs.current[i] = r)}
              value={digit}
              type="text"
              inputMode="numeric"
              maxLength={1}
              disabled={verifying}
              autoFocus={i === 0}
              aria-label={`Digit ${i + 1}`}
              onChange={(e) => handleChangeDigit(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onPaste={i === 0 ? handlePaste : undefined}
              style={{
                ...styles.digit,
                borderColor: digit ? '#D4AF37' : 'rgba(255,255,255,0.18)',
              }}
            />
          ))}
        </div>

        {verifying && <p style={styles.status}>Verifying</p>}

        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => sendCode(false)}
          disabled={sending || resendCooldown > 0}
          style={{
            ...styles.resend,
            color:
              resendCooldown > 0 || sending
                ? 'rgba(255,255,255,0.28)'
                : '#D4AF37',
            cursor: resendCooldown > 0 || sending ? 'default' : 'pointer',
          }}
        >
          {sending
            ? 'Sending'
            : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : 'Resend code'}
        </button>

        {optional && (
          <button type="button" onClick={goApp} style={styles.secondary}>
            Not now
          </button>
        )}

        <a href="/account/logout" style={styles.signOut}>
          Sign out
        </a>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    boxSizing: 'border-box',
  },
  inner: {
    width: '100%',
    maxWidth: 340,
    textAlign: 'center',
  },
  logo: {
    color: '#D4AF37',
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '0.28em',
    margin: '0 0 40px',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
    margin: '0 0 10px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    lineHeight: 1.5,
    margin: '0 0 28px',
  },
  codeRow: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  digit: {
    width: 46,
    height: 54,
    borderRadius: 10,
    border: '1.5px solid rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
    textAlign: 'center',
    outline: 'none',
    caretColor: 'transparent',
    boxSizing: 'border-box',
  },
  status: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    margin: '0 0 12px',
  },
  errorBox: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid rgba(220,38,38,0.25)',
    borderRadius: 10,
    padding: '10px 12px',
    marginBottom: 12,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    margin: 0,
    textAlign: 'center',
  },
  resend: {
    background: 'none',
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    padding: '12px 8px',
    marginTop: 4,
  },
  secondary: {
    display: 'block',
    width: '100%',
    marginTop: 8,
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  signOut: {
    display: 'inline-block',
    marginTop: 28,
    color: 'rgba(255,255,255,0.28)',
    fontSize: 13,
    textDecoration: 'none',
  },
  successTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 700,
    margin: '0 0 8px',
  },
  muted: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    margin: 0,
  },
};
