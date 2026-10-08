// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";

export default function VerifyEmailPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const inputs = useRef([]);

  useEffect(() => {
    // Auto-send a code on mount
    sendCode(true);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(
      () => setResendCooldown((v) => Math.max(0, v - 1)),
      1000,
    );
    return () => clearInterval(t);
  }, [resendCooldown]);

  const sendCode = async (silent = false) => {
    try {
      setSending(true);
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
      });
      const data = await res.json();
      if (res.status === 429) {
        setResendCooldown(data.cooldown || 60);
        return;
      }
      if (res.ok) {
        if (data.alreadyVerified) {
          setSuccess(true);
          setTimeout(() => (window.location.href = "/"), 1500);
          return;
        }
        setResendCooldown(60);
        if (!silent) setError(null);
      } else {
        if (!silent) setError(data.error || "Could not send code.");
      }
    } catch {
      if (!silent) setError("Could not send code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleChangeDigit = (val, index) => {
    const digit = val.replace(/[^0-9]/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    setError(null);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
    if (next.every((d) => d !== "")) {
      verifyCode(next.join(""));
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    const next = [...code];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setCode(next);
    if (pasted.length === 6) verifyCode(pasted);
    else inputs.current[pasted.length]?.focus();
  };

  const verifyCode = async (full) => {
    try {
      setVerifying(true);
      setError(null);
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: full }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => (window.location.href = "/"), 1500);
      } else {
        setCode(["", "", "", "", "", ""]);
        setTimeout(() => inputs.current[0]?.focus(), 50);
        setError(data.error || "Incorrect code. Please try again.");
      }
    } catch {
      setError("Could not verify. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: 700,
              margin: "0 0 8px",
            }}
          >
            Email verified!
          </p>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
            Taking you to the app…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1
        style={{
          color: "#fff",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "0.2em",
          margin: "0 0 6px",
        }}
      >
        CRESTAR
      </h1>
      <p
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 13,
          margin: "0 0 36px",
        }}
      >
        Verify your email
      </p>

      <div style={styles.card}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✉️</div>
        <p
          style={{
            color: "#fff",
            fontSize: 17,
            fontWeight: 700,
            margin: "0 0 8px",
          }}
        >
          Check your inbox
        </p>
        <p
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 13,
            margin: "0 0 28px",
            lineHeight: 1.6,
          }}
        >
          We sent a 6-digit code to your email
        </p>

        {/* 6-digit input boxes */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
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
              onChange={(e) => handleChangeDigit(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onPaste={i === 0 ? handlePaste : undefined}
              style={{
                width: 46,
                height: 54,
                borderRadius: 12,
                border: `2px solid ${digit ? "#fff" : "rgba(255,255,255,0.2)"}`,
                backgroundColor: "rgba(255,255,255,0.07)",
                color: "#fff",
                fontSize: 24,
                fontWeight: 700,
                textAlign: "center",
                outline: "none",
                caretColor: "transparent",
                boxSizing: "border-box",
              }}
            />
          ))}
        </div>

        {verifying && (
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 13,
              margin: "0 0 16px",
            }}
          >
            Verifying…
          </p>
        )}

        {error && (
          <div
            style={{
              backgroundColor: "rgba(220,38,38,0.12)",
              border: "1px solid rgba(220,38,38,0.28)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                color: "#F87171",
                fontSize: 13,
                margin: 0,
                textAlign: "center",
              }}
            >
              {error}
            </p>
          </div>
        )}

        <button
          onClick={() => sendCode(false)}
          disabled={sending || resendCooldown > 0}
          style={{
            background: "none",
            border: "none",
            color:
              resendCooldown > 0
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.6)",
            fontSize: 13,
            cursor: resendCooldown > 0 ? "default" : "pointer",
            padding: "8px 0",
          }}
        >
          {sending
            ? "Sending…"
            : resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Resend code"}
        </button>
      </div>

      <a
        href="/account/logout"
        style={{
          color: "rgba(255,255,255,0.25)",
          fontSize: 12,
          textDecoration: "none",
          marginTop: 24,
        }}
      >
        Sign out
      </a>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    width: "100%",
    backgroundColor: "#000",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    boxSizing: "border-box",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: "28px 24px",
    maxWidth: 360,
    width: "100%",
    textAlign: "center",
  },
};
