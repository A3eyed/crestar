// @ts-nocheck
"use client";

import { useState, useCallback } from "react";

const GOLD = "#D4AF37";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      setSuccess(false);

      if (!email) {
        setError("Please enter your email address");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccess(true);
        } else {
          setError(
            data.error || "Failed to send reset email. Please try again.",
          );
        }
      } catch (err) {
        console.error("Forgot password error:", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 bg-black">
      <div className="mb-10">
        <h1
          className="text-3xl font-bold tracking-[0.25em] text-center"
          style={{ color: GOLD }}
        >
          CRESTAR
        </h1>
      </div>

      <div className="w-full max-w-sm">
        {success ? (
          <div className="space-y-6">
            <div className="rounded-xl bg-white/[0.06] border border-white/10 p-6 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "rgba(212,175,55,0.15)" }}
              >
                <svg
                  className="w-8 h-8"
                  style={{ color: GOLD }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Check your email
              </h2>
              <p className="text-sm text-white/55">
                If an account exists for{" "}
                <span className="font-semibold text-white/80">{email}</span>,
                you will receive reset instructions shortly.
              </p>
            </div>

            <a
              href="/account/signin"
              className="block w-full text-black text-center text-[16px] font-semibold py-[14px] rounded-xl hover:opacity-90 transition-opacity"
              style={{ backgroundColor: GOLD }}
            >
              Back to Sign In
            </a>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                Forgot password?
              </h2>
              <p className="text-sm text-white/45">
                Enter your email and we will send reset instructions
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                required
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Email address"
                autoCapitalize="none"
                autoComplete="email"
                className="w-full text-[16px] px-4 py-[14px] rounded-xl border bg-white/[0.06] text-white border-white/15 placeholder:text-white/35 focus:border-[#D4AF37] outline-none"
              />

              {error && (
                <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-black text-[16px] font-semibold py-[14px] rounded-xl disabled:opacity-50 active:opacity-80"
                style={{ backgroundColor: GOLD }}
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a
                href="/account/signin"
                className="text-sm text-white/45 hover:text-white transition-colors"
              >
                ← Back to Sign In
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
