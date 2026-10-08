// @ts-nocheck
"use client";

import { useState, useCallback } from "react";

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
          body: JSON.stringify({ email }),
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
        <h1 className="text-3xl font-bold tracking-[0.25em] text-center text-white">
          CRESTAR
        </h1>
      </div>

      <div className="w-full max-w-sm">
        {success ? (
          <div className="space-y-6">
            <div className="rounded-lg bg-[#1A3A1A] border border-[#2A5A2A] p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#2A5A2A] flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-400"
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
                Check Your Email
              </h2>
              <p className="text-sm text-gray-300">
                We've sent password reset instructions to{" "}
                <span className="font-semibold">{email}</span>
              </p>
            </div>

            <a
              href="/account/signin"
              className="block w-full bg-[#FF3B5C] text-white text-center text-[16px] font-semibold py-[14px] rounded-lg hover:bg-[#FF2549] transition-colors"
            >
              Back to Sign In
            </a>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                Forgot Password?
              </h2>
              <p className="text-sm text-[#666]">
                Enter your email and we'll send you reset instructions
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
                className="w-full text-[16px] px-4 py-[14px] rounded-lg border bg-[#1A1A1A] text-white border-[#333] placeholder:text-[#666] focus:border-[#555] outline-none"
              />

              {error && (
                <div className="rounded-lg px-4 py-3 bg-[#2A1215] border border-[#FF3B5C33]">
                  <p className="text-[#FF3B5C] text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FF3B5C] text-white text-[16px] font-semibold py-[14px] rounded-lg disabled:opacity-50 active:opacity-80"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a
                href="/account/signin"
                className="text-sm text-[#666] hover:text-white transition-colors"
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
