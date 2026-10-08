// @ts-nocheck
"use client";

import { useEffect } from "react";

export default function AdminPasswordResetPage() {
  useEffect(() => {
    window.location.href = "/account/forgot-password";
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-lg">Redirecting to password reset...</p>
    </div>
  );
}
