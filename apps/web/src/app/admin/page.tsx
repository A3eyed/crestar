// @ts-nocheck
"use client";

import { useEffect } from "react";
import useUser from "@/utils/useUser";

export default function AdminIndexPage() {
  const { data: user, loading } = useUser();

  useEffect(() => {
    if (user) {
      const isAdmin = ["admin", "owner", "moderator"].includes(user?.role);
      if (isAdmin) {
        window.location.href = "/admin/dashboard";
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Admin Access Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please sign in with your admin account
          </p>
          <a
            href="/account/signin"
            className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
          >
            Sign In as Admin
          </a>
        </div>
      </div>
    );
  }

  const isAdmin = ["admin", "owner", "moderator"].includes(user?.role);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600">Admin privileges required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-lg">Redirecting to dashboard...</div>
    </div>
  );
}
