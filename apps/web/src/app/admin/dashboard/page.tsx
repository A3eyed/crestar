// @ts-nocheck
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import useUser from "@/utils/useUser";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";

const GOLD = "#D4AF37";
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "sellers", label: "Sellers" },
  { id: "deliverers", label: "Deliverers" },
  { id: "centers", label: "Business Centers" },
  { id: "reports", label: "Reports" },
];

async function adminFetch(url, options = {}) {
  return fetch(url, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
}

export default function AdminDashboardPage() {
  const { data: user, loading } = useUser();
  // Stabilize identity — useUser returns a new object every render
  const userId = user?.id ?? null;
  const isAdmin = !!(
    user &&
    (["admin", "owner", "moderator"].includes(user.role) || user.is_admin === true)
  );

  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ sellers: {}, deliverers: {}, centers: {}, reports: {} });
  const [sellers, setSellers] = useState([]);
  const [deliverers, setDeliverers] = useState([]);
  const [centers, setCenters] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [actionBusy, setActionBusy] = useState(null);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Guard against StrictMode double-mount and identity churn
  const bootstrappedFor = useRef(null);

  const loadAllStats = useCallback(async () => {
    try {
      const [sellersRes, deliverersRes, centersRes, reportsRes] = await Promise.all([
        adminFetch("/api/admin/sellers?status=pending"),
        adminFetch("/api/admin/deliverers?status=pending"),
        adminFetch("/api/admin/business-centers?status=pending"),
        adminFetch("/api/admin/reports?status=pending"),
      ]);
      const sellersData = sellersRes.ok ? await sellersRes.json() : {};
      const deliverersData = deliverersRes.ok ? await deliverersRes.json() : {};
      const centersData = centersRes.ok ? await centersRes.json() : {};
      const reportsData = reportsRes.ok ? await reportsRes.json() : {};
      setStats({
        sellers: sellersData.stats || { pending: sellersData.sellers?.length || 0 },
        deliverers: deliverersData.stats || { pending: deliverersData.deliverers?.length || 0 },
        centers: centersData.stats || { pending: centersData.centers?.length || 0 },
        reports: reportsData.stats || {
          pending: reportsData.reports?.length || reportsData.stats?.unread || 0,
        },
      });
    } catch (err) {
      setError("Could not load dashboard stats");
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/analytics");
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "analytics failed");
      }
      const data = await res.json();
      setAnalytics({
        categoryDistribution: data.categoryDistribution || [],
        revenueByType: data.revenueByType || [],
        platformRevenue: data.platformRevenue || [],
        orderVolume: data.orderVolume || [],
        userGrowth: data.userGrowth || [],
        totals: data.totals || {},
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not load platform analytics");
      setAnalytics({
        categoryDistribution: [],
        revenueByType: [],
        platformRevenue: [],
        orderVolume: [],
        userGrowth: [],
        totals: {},
      });
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadTabData = useCallback(async (tab) => {
    setLoadingData(true);
    try {
      if (tab === "sellers")
        setSellers((await (await adminFetch("/api/admin/sellers?status=pending")).json()).sellers || []);
      if (tab === "deliverers")
        setDeliverers((await (await adminFetch("/api/admin/deliverers?status=pending")).json()).deliverers || []);
      if (tab === "centers")
        setCenters((await (await adminFetch("/api/admin/business-centers?status=pending")).json()).centers || []);
      if (tab === "reports") {
        const data = await (await adminFetch("/api/admin/reports?status=pending")).json();
        setReports(data.reports || data.messages || []);
      }
    } catch (err) {
      setError("Could not load pending approvals");
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Bootstrap once per user id — NOT on every user object identity change
  useEffect(() => {
    if (!userId || !isAdmin) return;
    if (bootstrappedFor.current === userId) return;
    bootstrappedFor.current = userId;
    loadAllStats();
    loadAnalytics();
  }, [userId, isAdmin, loadAllStats, loadAnalytics]);

  useEffect(() => {
    if (!userId || !isAdmin || activeTab === "overview") return;
    loadTabData(activeTab);
  }, [activeTab, userId, isAdmin, loadTabData]);

  const runAction = async (key, url, body, clear) => {
    setActionBusy(key);
    try {
      const res = await adminFetch(url, { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Action failed");
      clear();
      loadAllStats();
    } catch (err) {
      setError("Could not update that item.");
    } finally {
      setActionBusy(null);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!user)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <a href="/account/signin?callbackUrl=/admin/dashboard" className="px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold">Sign in</a>
      </div>
    );
  if (!isAdmin)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Your account does not have admin privileges.</p>
      </div>
    );

  const pendingTotal = ["sellers", "deliverers", "centers", "reports"].reduce(
    (sum, key) => sum + (parseInt(stats[key].pending, 10) || 0), 0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">
              {pendingTotal} item{pendingTotal === 1 ? "" : "s"} waiting for review. Platform fee is 5% of each paid order.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/moderation" className="inline-flex px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-sm font-semibold">
              Moderation Center
            </a>
            <a href="https://wa.me/233543799308" className="inline-flex px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-medium">
              WhatsApp support
            </a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const badge = tab.id === "overview" ? null : stats[tab.id]?.pending;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${
                  activeTab === tab.id ? "border-[#D4AF37] text-gray-900" : "border-transparent text-gray-500"
                }`}
              >
                {tab.label}
                {Number(badge) > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#D4AF37] text-black text-xs font-bold flex items-center justify-center">{badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard label="Total Users" value={analytics?.totals?.users ?? "—"} />
              <StatCard label="GMV (GHS)" value={analytics?.totals ? `₵${Number(analytics.totals.gmv || 0).toLocaleString()}` : "—"} />
              <StatCard label="5% fees kept" value={analytics?.totals ? `₵${Number(analytics.totals.platformFees || 0).toLocaleString()}` : "—"} />
              <StatCard label="Paid Orders" value={analytics?.totals?.paidOrders ?? "—"} />
              <StatCard label="Active Products" value={analytics?.totals?.products ?? "—"} />
              <StatCard label="Active Videos" value={analytics?.totals?.videos ?? "—"} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <PendingCard label="Pending Sellers" value={stats.sellers.pending || 0} onClick={() => setActiveTab("sellers")} />
              <PendingCard label="Pending Deliverers" value={stats.deliverers.pending || 0} onClick={() => setActiveTab("deliverers")} />
              <PendingCard label="Pending Centers" value={stats.centers.pending || 0} onClick={() => setActiveTab("centers")} />
              <PendingCard label="Pending Reports" value={stats.reports.pending || 0} onClick={() => setActiveTab("reports")} />
            </div>
            {analyticsLoading && (
              <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">Loading platform analytics...</div>
            )}
            {!analyticsLoading && analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Revenue, last 6 months">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={analytics.platformRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip /><Legend />
                      <Area type="monotone" dataKey="gmv" name="GMV" stroke={GOLD} fill={GOLD} fillOpacity={0.25} />
                      <Line type="monotone" dataKey="fees" name="5% fee" stroke="#1F2937" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Paid orders, last 6 months">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={analytics.orderVolume}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="orders" name="Orders" fill={GOLD} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}
          </div>
        )}
        {activeTab === "sellers" && (
          <ApprovalList title="Pending seller applications" loading={loadingData} items={sellers} emptyMessage="No pending seller applications."
            renderItem={(seller) => (
              <ApprovalCard key={seller.id} title={seller.business_name || seller.full_name || "Seller"} subtitle={`@${seller.username || "unknown"}`}
                fields={[["Type", seller.seller_type], ["Location", [seller.city, seller.region].filter(Boolean).join(", ")], ["Applied", formatDate(seller.created_at)]]}
                photos={[["Ghana Card", seller.ghana_card_photo]]} busy={actionBusy === `seller-${seller.id}`}
                actions={[
                  { label: "Approve", primary: true, onClick: () => runAction(`seller-${seller.id}`, "/api/admin/sellers", { sellerId: seller.id, action: "approve" }, () => setSellers((p) => p.filter((r) => r.id !== seller.id))) },
                  { label: "Reject", onClick: () => runAction(`seller-${seller.id}`, "/api/admin/sellers", { sellerId: seller.id, action: "reject", reason: "Rejected by admin" }, () => setSellers((p) => p.filter((r) => r.id !== seller.id))) },
                ]}
              />
            )}
          />
        )}
        {activeTab === "deliverers" && (
          <ApprovalList title="Pending deliverer applications" loading={loadingData} items={deliverers} emptyMessage="No pending deliverer applications."
            renderItem={(d) => (
              <ApprovalCard key={d.id} title={d.full_name || "Deliverer"} subtitle={d.phone_number || ""}
                fields={[["Vehicle", d.vehicle_type], ["Applied", formatDate(d.created_at)]]}
                photos={[["Vehicle", d.vehicle_photo]]} busy={actionBusy === `deliverer-${d.id}`}
                actions={[
                  { label: "Approve", primary: true, onClick: () => runAction(`deliverer-${d.id}`, "/api/admin/deliverers", { delivererId: d.id, action: "approve" }, () => setDeliverers((p) => p.filter((r) => r.id !== d.id))) },
                  { label: "Reject", onClick: () => runAction(`deliverer-${d.id}`, "/api/admin/deliverers", { delivererId: d.id, action: "reject" }, () => setDeliverers((p) => p.filter((r) => r.id !== d.id))) },
                ]}
              />
            )}
          />
        )}
        {activeTab === "centers" && (
          <ApprovalList title="Pending business centers" loading={loadingData} items={centers} emptyMessage="No pending business centers."
            renderItem={(c) => (
              <ApprovalCard key={c.id} title={c.name || c.business_name || "Center"} subtitle={c.address || ""}
                fields={[["Owner", c.owner_username], ["Applied", formatDate(c.created_at)]]}
                busy={actionBusy === `center-${c.id}`}
                actions={[
                  { label: "Approve", primary: true, onClick: () => runAction(`center-${c.id}`, "/api/admin/business-centers", { centerId: c.id, action: "approve" }, () => setCenters((p) => p.filter((r) => r.id !== c.id))) },
                  { label: "Reject", onClick: () => runAction(`center-${c.id}`, "/api/admin/business-centers", { centerId: c.id, action: "reject" }, () => setCenters((p) => p.filter((r) => r.id !== c.id))) },
                ]}
              />
            )}
          />
        )}
        {activeTab === "reports" && (
          <ApprovalList title="Pending reports" loading={loadingData} items={reports} emptyMessage="No pending reports."
            renderItem={(r) => (
              <ApprovalCard key={r.id} title={r.category || r.type || "Report"} subtitle={r.message_text || r.description || ""}
                fields={[["From", r.reporter_username || r.sender_username], ["Status", r.status], ["Created", formatDate(r.created_at)]]}
                busy={actionBusy === `report-${r.id}`}
                actions={[
                  { label: "Resolve", primary: true, onClick: () => runAction(`report-${r.id}`, "/api/admin/reports", { reportId: r.id, action: "resolve" }, () => setReports((p) => p.filter((row) => row.id !== r.id))) },
                  { label: "Dismiss", onClick: () => runAction(`report-${r.id}`, "/api/admin/reports", { reportId: r.id, action: "dismiss" }, () => setReports((p) => p.filter((row) => row.id !== r.id))) },
                ]}
              />
            )}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
function PendingCard({ label, value, onClick }) {
  return (
    <button onClick={onClick} className="bg-white rounded-2xl shadow p-4 text-left hover:ring-2 hover:ring-[#D4AF37]/40 transition">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#b8960f]">{value}</p>
    </button>
  );
}
function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}
function ApprovalList({ title, loading, items, emptyMessage, renderItem }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {loading ? (
        <div className="bg-white rounded-2xl shadow p-8 text-center">Loading...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">{emptyMessage}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{items.map(renderItem)}</div>
      )}
    </div>
  );
}
function ApprovalCard({ title, subtitle, fields = [], photos = [], actions = [], busy }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mb-3">{subtitle}</p>
      {fields.filter(([, value]) => value).map(([label, value]) => (
        <p key={label} className="text-sm text-gray-600">
          <span className="text-gray-400">{label}:</span> {String(value)}
        </p>
      ))}
      <div className="flex gap-3 my-3">
        {photos.filter(([, url]) => url).map(([label, url]) => (
          <a key={label} href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={label} className="w-20 h-20 object-cover rounded-lg border" />
          </a>
        ))}
      </div>
      <div className="flex gap-2">
        {actions.map((action) => (
          <button key={action.label} onClick={action.onClick} disabled={busy}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${
              action.primary ? "bg-[#D4AF37] text-black" : "bg-gray-100 text-gray-700"
            }`}
          >
            {busy ? "..." : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
function formatDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(value);
  return `${MONTH_NAMES[parseInt(match[2], 10) - 1] || match[2]} ${parseInt(match[3], 10)}, ${match[1]}`;
}
