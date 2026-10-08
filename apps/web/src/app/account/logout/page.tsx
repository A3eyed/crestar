// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import useAuth from "@/utils/useAuth";

export default function LogoutPage() {
  const { signOut } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        setIsDark(savedTheme === "dark");
      } else {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        setIsDark(prefersDark);
      }
    } catch (err) {
      console.error("Theme detection error:", err);
      setIsDark(true);
    }
    setReady(true);
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut({
        callbackUrl: "/",
        redirect: true,
      });
    } catch (err) {
      console.error("Sign out error:", err);
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          backgroundColor: "#000000",
        }}
      />
    );
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center px-6 ${
        isDark ? "bg-black" : "bg-white"
      }`}
      style={{ transition: "background-color 0.2s ease" }}
    >
      <div className="mb-8">
        <h1
          className={`text-3xl font-bold tracking-[0.25em] text-center ${
            isDark ? "text-white" : "text-black"
          }`}
          style={{ transition: "color 0.2s ease" }}
        >
          CRESTAR
        </h1>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <p
          className={`text-sm text-center ${isDark ? "text-[#666]" : "text-[#999]"}`}
        >
          Are you sure you want to sign out?
        </p>

        <button
          onClick={handleSignOut}
          disabled={loading}
          className="w-full bg-[#FF3B5C] text-white text-[16px] font-semibold py-[14px] rounded-lg disabled:opacity-50 active:opacity-80"
          style={{ transition: "opacity 0.15s ease" }}
        >
          {loading ? "Signing out..." : "Sign Out"}
        </button>

        <a
          href="/"
          className={`block text-center text-sm ${isDark ? "text-[#666] hover:text-[#888]" : "text-[#999] hover:text-[#666]"}`}
          style={{ transition: "color 0.15s ease" }}
        >
          Cancel
        </a>
      </div>
    </div>
  );
}
