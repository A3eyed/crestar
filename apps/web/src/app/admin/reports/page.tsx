// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import useUser from "@/utils/useUser";

export default function AdminReportsPage() {
  const { data: user, loading } = useUser();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    status: "pending",
    type: "",
    category: "",
  });

  const isAdmin = ["admin", "owner", "moderator"].includes(user?.role);

  useEffect(() => {
    if (user && isAdmin) {
      loadReports();
    }
  }, [user, isAdmin, filter]);

  const loadReports = async () => {
    try {
      setLoadingReports(true);
      const params = new URLSearchParams();
      if (filter.status && filter.status !== "all")
        params.append("status", filter.status);
      if (filter.type) params.append("type", filter.type);
      if (filter.category) params.append("category", filter.category);

      const response = await fetch(`/api/admin/reports?${params}`);
      if (!response.ok) throw new Error("Failed to load reports");

      const data = await response.json();
      setReports(data.reports || []);
      setStats(data.stats || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleAdminAction = async (reportId, action, newStatus, adminNotes) => {
    try {
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          action,
          newStatus,
          adminNotes,
        }),
      });

      if (!response.ok) throw new Error("Failed to process action");

      const result = await response.json();
      alert(result.message);
      loadReports(); // Reload reports
    } catch (err) {
      alert(err.message);
    }
  };

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
        <div className="text-lg text-red-600">
          Please sign in to access admin panel
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">
          Access Denied. Admin privileges required.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Admin Dashboard - Content Reports
                </h1>
                <p className="mt-2 text-gray-600">
                  Welcome, @{user.username}. Manage community reports and take
                  moderation actions.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/admin/dashboard"
                  className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Dashboard
                </a>
                <a
                  href="/admin/settings"
                  className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Settings
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {stats.pending || 0}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.pending || 0} reports
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {stats.reviewed || 0}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Reviewed
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.reviewed || 0} reports
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {stats.resolved || 0}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Resolved
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.resolved || 0} reports
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {stats.dismissed || 0}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Dismissed
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.dismissed || 0} reports
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={filter.status}
                  onChange={(e) =>
                    setFilter((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                  <option value="all">All</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  value={filter.type}
                  onChange={(e) =>
                    setFilter((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All Types</option>
                  <option value="user">User</option>
                  <option value="video">Video</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  value={filter.category}
                  onChange={(e) =>
                    setFilter((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All Categories</option>
                  <option value="fraud">Fraud</option>
                  <option value="harassment">Harassment</option>
                  <option value="inappropriate">Inappropriate Content</option>
                  <option value="illegal_goods">Illegal Goods</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {loadingReports ? (
              <li className="px-6 py-4">Loading reports...</li>
            ) : reports.length === 0 ? (
              <li className="px-6 py-4">
                No reports found for the selected filters.
              </li>
            ) : (
              reports.map((report) => (
                <li key={report.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {report.category} -{" "}
                            {report.type === "user"
                              ? "User Report"
                              : "Video Report"}
                          </p>
                          <p className="text-sm text-gray-500">
                            Reported by @{report.reporter.username} on{" "}
                            {new Date(report.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              report.status_code === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : report.status_code === "reviewed"
                                  ? "bg-blue-100 text-blue-800"
                                  : report.status_code === "resolved"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {report.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          <strong>Target:</strong>{" "}
                          {report.target.username
                            ? `@${report.target.username}`
                            : report.target.video_id
                              ? `Video ID: ${report.target.video_id}`
                              : "Unknown"}
                        </p>
                        {report.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Description:</strong> {report.description}
                          </p>
                        )}
                        {report.admin_notes && (
                          <p className="text-sm text-blue-600 mt-1">
                            <strong>Admin Notes:</strong> {report.admin_notes}
                          </p>
                        )}
                      </div>

                      {/* Admin Actions */}
                      {report.status_code === "pending" && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              handleAdminAction(
                                report.id,
                                "update_status",
                                "reviewed",
                                "Under review by admin",
                              )
                            }
                            className="inline-flex items-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Mark as Reviewed
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt(
                                "Add admin notes (optional):",
                              );
                              handleAdminAction(
                                report.id,
                                "update_status",
                                "resolved",
                                notes || "Resolved by admin",
                              );
                            }}
                            className="inline-flex items-center px-3 py-2 border border-green-300 text-xs font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt("Reason for dismissal:");
                              handleAdminAction(
                                report.id,
                                "update_status",
                                "dismissed",
                                notes || "Dismissed by admin",
                              );
                            }}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Dismiss
                          </button>

                          {report.target.user_id && (
                            <>
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Shadow ban user @${report.target.username}?`,
                                    )
                                  ) {
                                    const reason = prompt(
                                      "Reason for shadow ban:",
                                    );
                                    handleAdminAction(
                                      report.id,
                                      "shadow_ban",
                                      null,
                                      reason || "Shadow banned due to reports",
                                    );
                                  }
                                }}
                                className="inline-flex items-center px-3 py-2 border border-yellow-300 text-xs font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                              >
                                Shadow Ban User
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      `PERMANENTLY DEACTIVATE user @${report.target.username}? This cannot be undone.`,
                                    )
                                  ) {
                                    const reason = prompt(
                                      "Reason for deactivation:",
                                    );
                                    handleAdminAction(
                                      report.id,
                                      "deactivate_account",
                                      null,
                                      reason ||
                                        "Account deactivated due to violations",
                                    );
                                  }
                                }}
                                className="inline-flex items-center px-3 py-2 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                              >
                                Deactivate Account
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
