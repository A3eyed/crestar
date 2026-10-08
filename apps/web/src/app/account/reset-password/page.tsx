// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    const emailParam = params.get('email');

    if (tokenParam && emailParam) {
      setToken(tokenParam);
      setEmail(decodeURIComponent(emailParam));
    } else {
      setError('Invalid reset link');
    }
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);
      setError(null);

      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            email,
            password,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccess(true);
          setTimeout(() => {
            window.location.href = '/account/signin';
          }, 2000);
        } else {
          setError(data.error || 'Failed to reset password');
        }
      } catch (err) {
        console.error('Reset password error:', err);
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [token, email, password, confirmPassword]
  );

  if (!token || !email) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 bg-black">
        <div className="w-full max-w-sm text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Invalid Link</h2>
          <p className="text-[#666] mb-6">This password reset link is invalid or has expired</p>
          <a
            href="/account/forgot-password"
            className="inline-block bg-[#FF3B5C] text-white px-6 py-3 rounded-lg hover:bg-[#FF2549] transition-colors"
          >
            Request New Link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 bg-black">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-[0.25em] text-center text-white">CRESTAR</h1>
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
              <h2 className="text-xl font-semibold text-white mb-2">Password Reset!</h2>
              <p className="text-sm text-gray-300">Your password has been reset successfully</p>
              <p className="text-xs text-[#666] mt-2">Redirecting to sign in...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
              <p className="text-sm text-[#666]">Enter your new password for {email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                required
                name="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="New password"
                autoComplete="new-password"
                className="w-full text-[16px] px-4 py-[14px] rounded-lg border bg-[#1A1A1A] text-white border-[#333] placeholder:text-[#666] focus:border-[#555] outline-none"
              />

              <input
                required
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Confirm new password"
                autoComplete="new-password"
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
                {loading ? 'Resetting Password...' : 'Reset Password'}
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
