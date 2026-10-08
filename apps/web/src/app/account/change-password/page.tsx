// @ts-nocheck
"use client";
import { useState } from "react";
import useUser from "@/utils/useUser";
import { ArrowLeft, Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";

export default function ChangePasswordPage() {
  const { data: user } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Redirect after success
      setTimeout(() => {
        window.location.href = "/settings";
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  const passwordStrength = (password) => {
    if (!password) return { strength: 0, label: "", color: "" };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: "Weak", color: "bg-red-500" };
    if (strength <= 3)
      return { strength, label: "Fair", color: "bg-yellow-500" };
    if (strength <= 4) return { strength, label: "Good", color: "bg-blue-500" };
    return { strength, label: "Strong", color: "bg-green-500" };
  };

  const strength = passwordStrength(newPassword);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black border-b border-white/10 backdrop-blur-xl bg-opacity-95">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <a
            href="/settings"
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </a>
          <h1 className="text-xl font-bold">Change Password</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Security Info */}
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <Lock size={20} className="text-[#D4AF37] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#D4AF37] font-semibold mb-1">
                Keep your account secure
              </p>
              <p className="text-[#D4AF37]/80 text-sm leading-relaxed">
                Use a strong password with at least 8 characters, including
                uppercase, lowercase, numbers, and symbols.
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
            <div className="flex gap-3 items-start">
              <CheckCircle2
                size={20}
                className="text-green-400 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="text-green-400 font-semibold">
                  Password changed successfully!
                </p>
                <p className="text-green-400/80 text-sm mt-1">
                  Redirecting you back to settings...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div className="mb-6">
            <label className="block text-white/80 text-sm font-medium mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:border-[#D4AF37] focus:outline-none transition-colors"
                placeholder="Enter current password"
                disabled={loading || success}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
              >
                {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="mb-6">
            <label className="block text-white/80 text-sm font-medium mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:border-[#D4AF37] focus:outline-none transition-colors"
                placeholder="Enter new password"
                disabled={loading || success}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
              >
                {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all`}
                      style={{ width: `${(strength.strength / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-white/60 font-medium">
                    {strength.label}
                  </span>
                </div>
                <div className="text-xs text-white/50 space-y-1">
                  <p
                    className={newPassword.length >= 8 ? "text-green-400" : ""}
                  >
                    {newPassword.length >= 8 ? "✓" : "○"} At least 8 characters
                  </p>
                  <p
                    className={
                      /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)
                        ? "text-green-400"
                        : ""
                    }
                  >
                    {/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)
                      ? "✓"
                      : "○"}{" "}
                    Uppercase & lowercase letters
                  </p>
                  <p
                    className={
                      /[0-9]/.test(newPassword) ? "text-green-400" : ""
                    }
                  >
                    {/[0-9]/.test(newPassword) ? "✓" : "○"} At least one number
                  </p>
                  <p
                    className={
                      /[^A-Za-z0-9]/.test(newPassword) ? "text-green-400" : ""
                    }
                  >
                    {/[^A-Za-z0-9]/.test(newPassword) ? "✓" : "○"} At least one
                    special character
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mb-8">
            <label className="block text-white/80 text-sm font-medium mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:border-[#D4AF37] focus:outline-none transition-colors"
                placeholder="Confirm new password"
                disabled={loading || success}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-red-400 text-xs mt-2">
                Passwords do not match
              </p>
            )}
            {confirmPassword &&
              confirmPassword === newPassword &&
              newPassword.length >= 8 && (
                <p className="text-green-400 text-xs mt-2">✓ Passwords match</p>
              )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              loading ||
              success ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword
            }
            className="w-full bg-[#D4AF37] hover:bg-[#C19B2B] text-black font-bold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Changing Password..."
              : success
                ? "Password Changed!"
                : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
