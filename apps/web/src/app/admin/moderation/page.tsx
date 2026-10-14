// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import useUser from "@/utils/useUser";

async function adminFetch(url, options = {}) {
  return fetch(url, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
}

export default function AdminModerationPage() {
  const { data: user, loading } = useUser();
  const isAdmin =
    user &&
    (["admin", "owner", "moderator"].includes(user.role) || user.is_admin === true);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selected, setSelected] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [reason, setReason] = useState("");
  const [suspendDays, setSuspendDays] = useState("");

  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [broadcastBusy, setBroadcastBusy] = useState(false);

  const [supportMessages, setSupportMessages] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "40");
      const res = await adminFetch(`/api/admin/moderate?${params}`);
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Could not load users" });
    } finally {
      setLoadingUsers(false);
    }
  }, [query, statusFilter]);

  const loadSupport = useCallback(async () => {
    setSupportLoading(true);
    try {
      const res = await adminFetch("/api/admin/support-inbox?limit=15");
      if (res.ok) {
        const data = await res.json();
        setSupportMessages(data.messages || data.inbox || []);
      }
    } catch (_) {
    } finally {
      setSupportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin) {
      loadUsers();
      loadSupport();
    }
  }, [user, isAdmin, loadUsers, loadSupport]);

  const runAction = async (action, extra = {}) => {
    if (!selected) return;
    setActionBusy(action);
    setMessage(null);
    try {
      const res = await adminFetch("/api/admin/moderate", {
        method: "POST",
        body: JSON.stringify({
          action,
          userId: selected.id,
          reason: reason || undefined,
          days: suspendDays || undefined,
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setMessage({ type: "success", text: `${action} succeeded for @${selected.username}` });
      setReason("");
      setSuspendDays("");
      await loadUsers();
      setSelected((prev) => (prev ? { ...prev, ...data } : null));
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Action failed" });
    } finally {
      setActionBusy(null);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      setMessage({ type: "error", text: "Title and body required" });
      return;
    }
    setBroadcastBusy(true);
    setMessage(null);
    try {
      const res = await adminFetch("/api/admin/moderate", {
        method: "POST",
        body: JSON.stringify({
          action: "broadcast",
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
          target: broadcastTarget,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Broadcast failed");
      setMessage({ type: "success", text: "Broadcast sent successfully" });
      setBroadcastTitle("");
      setBroadcastBody("");
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Broadcast failed" });
    } finally {
      setBroadcastBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <a href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
                ← Dashboard
              </a>
              <h1 className="text-2xl font-semibold text-gray-900">Moderation Center</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Warn, suspend, verify, revoke monetization, and broadcast to users. Verified badge is admin-only.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {message && (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User search</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUsers()}
              placeholder="Username, email, name or ID…"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white"
            >
              <option value="">All statuses</option>
              <option value="suspended">Suspended</option>
              <option value="warned">Warned</option>
            </select>
            <button
              onClick={loadUsers}
              disabled={loadingUsers}
              className="px-5 py-2.5 rounded-xl bg-[#D4AF37] text-black font-semibold text-sm disabled:opacity-60"
            >
              {loadingUsers ? "Searching…" : "Search"}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-1 bg-white rounded-2xl shadow p-4 max-h-[70vh] overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Results ({users.length})
            </h3>
            {loadingUsers ? (
              <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No users found</p>
            ) : (
              <ul className="space-y-1">
                {users.map((u) => (
                  <li key={u.id}>
                    <button
                      onClick={() => setSelected(u)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${
                        selected?.id === u.id
                          ? "bg-[#D4AF37]/15 border border-[#D4AF37]/40"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          @{u.username || "unknown"}
                        </span>
                        {u.is_verified && (
                          <span className="text-[#D4AF37]" title="Verified">✓</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <StatusBadge status={u.account_status} />
                        {u.account_warning > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            {u.account_warning} warn
                          </span>
                        )}
                        {u.monetization_revoked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                            no $
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">{u.role}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="lg:col-span-2 bg-white rounded-2xl shadow p-5">
            {!selected ? (
              <p className="text-gray-400 text-center py-16">Select a user to moderate</p>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      @{selected.username}
                      {selected.is_verified && (
                        <span className="text-[#D4AF37] text-lg" title="Verified">✓</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selected.email} · {selected.name || "—"} · role: {selected.role}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">ID: {selected.id}</p>
                  </div>
                  <StatusBadge status={selected.account_status} large />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <InfoChip label="Warnings" value={selected.account_warning ?? 0} />
                  <InfoChip
                    label="Monetization"
                    value={selected.monetization_revoked ? "Revoked" : "Active"}
                    danger={selected.monetization_revoked}
                  />
                  <InfoChip label="Verified" value={selected.is_verified ? "Yes" : "No"} />
                  <InfoChip
                    label="Suspended until"
                    value={
                      selected.suspended_until
                        ? new Date(selected.suspended_until).toLocaleDateString()
                        : selected.account_status === "suspended"
                          ? "Permanent"
                          : "—"
                    }
                  />
                </div>

                {selected.suspended_reason && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    Reason: {selected.suspended_reason}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Reason (for warn / suspend / revoke)
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Optional reason shown to user"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Suspend days (blank = permanent)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={suspendDays}
                      onChange={(e) => setSuspendDays(e.target.value)}
                      placeholder="e.g. 7"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ActionBtn
                    label="Warn"
                    busy={actionBusy === "warn"}
                    onClick={() => runAction("warn")}
                    color="amber"
                  />
                  {selected.account_status === "suspended" ? (
                    <ActionBtn
                      label="Unsuspend"
                      busy={actionBusy === "unsuspend"}
                      onClick={() => runAction("unsuspend")}
                      color="green"
                    />
                  ) : (
                    <ActionBtn
                      label="Suspend"
                      busy={actionBusy === "suspend"}
                      onClick={() => runAction("suspend")}
                      color="red"
                    />
                  )}
                  {selected.is_verified ? (
                    <ActionBtn
                      label="Revoke ✓"
                      busy={actionBusy === "revoke_verification"}
                      onClick={() => runAction("revoke_verification")}
                      color="gray"
                    />
                  ) : (
                    <ActionBtn
                      label="Grant ✓"
                      busy={actionBusy === "grant_verification"}
                      onClick={() => runAction("grant_verification")}
                      color="gold"
                    />
                  )}
                  {selected.monetization_revoked ? (
                    <ActionBtn
                      label="Restore $ access"
                      busy={actionBusy === "restore_monetization"}
                      onClick={() => runAction("restore_monetization")}
                      color="green"
                    />
                  ) : (
                    <ActionBtn
                      label="Revoke $ access"
                      busy={actionBusy === "revoke_monetization"}
                      onClick={() => runAction("revoke_monetization")}
                      color="red"
                    />
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Broadcast notification</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Platform update"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Audience</label>
              <select
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
              >
                <option value="all">Everyone</option>
                <option value="sellers">Sellers only</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
              <textarea
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                rows={3}
                placeholder="Message body shown in-app…"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          </div>
          <button
            onClick={sendBroadcast}
            disabled={broadcastBusy}
            className="mt-4 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-black font-semibold text-sm disabled:opacity-60"
          >
            {broadcastBusy ? "Sending…" : "Send broadcast"}
          </button>
        </section>

        <section className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent support messages</h2>
            <button onClick={loadSupport} className="text-sm text-[#b8960f] font-medium hover:underline">
              Refresh
            </button>
          </div>
          {supportLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : supportMessages.length === 0 ? (
            <p className="text-sm text-gray-400">No recent messages (or support-inbox not yet populated).</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {supportMessages.slice(0, 10).map((m) => (
                <li key={m.id || m.created_at} className="py-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-gray-900">
                      {m.from_username || m.username || m.sender || m.sender_username || "User"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-0.5 line-clamp-2">
                    {m.body || m.message || m.content || m.message_text || "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status, large }) {
  const s = status || "active";
  const styles =
    s === "suspended"
      ? "bg-red-100 text-red-700"
      : s === "warned"
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-100 text-emerald-700";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${styles} ${
        large ? "text-xs px-2.5 py-1" : "text-[10px] px-1.5 py-0.5"
      }`}
    >
      {s}
    </span>
  );
}

function InfoChip({ label, value, danger }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-sm font-semibold ${danger ? "text-red-600" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

function ActionBtn({ label, onClick, busy, color }) {
  const colors = {
    amber: "bg-amber-100 text-amber-900 hover:bg-amber-200",
    red: "bg-red-100 text-red-800 hover:bg-red-200",
    green: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
    gold: "bg-[#D4AF37] text-black hover:bg-[#c9a432]",
    gray: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  };
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 ${colors[color] || colors.gray}`}
    >
      {busy ? "…" : label}
    </button>
  );
}
