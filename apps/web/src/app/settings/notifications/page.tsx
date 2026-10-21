// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import useUser from "@/utils/useUser";
import { ArrowLeft } from "lucide-react";

export default function NotificationsPage() {
  const { data: user } = useUser();
  const [preferences, setPreferences] = useState({
    orderUpdates: true,
    messages: true,
    newFollowers: true,
    likes: true,
    comments: true,
    liveShop: true,
    salesAlerts: true,
    promotions: false,
    newsletters: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("notificationPreferences");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences((prev) => ({
          ...prev,
          ...parsed,
          // migrate old liveStreams key
          liveShop: parsed.liveShop ?? parsed.liveStreams ?? prev.liveShop,
        }));
      } catch {}
    }
  }, []);

  const handleToggle = (key) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    localStorage.setItem("notificationPreferences", JSON.stringify(updated));
    setSaving(true);
    setTimeout(() => setSaving(false), 800);
  };

  if (!user) return null;

  const Toggle = ({ enabled }) => (
    <button
      type="button"
      className={`w-12 h-7 rounded-full transition-all ${enabled ? "bg-[#D4AF37]" : "bg-white/20"}`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"} mt-1`}
      />
    </button>
  );

  const Row = ({ title, subtitle, prefKey, last }) => (
    <div className={`flex items-center justify-between p-4 ${last ? "" : "border-b border-white/10"}`}>
      <div>
        <p className="text-white font-medium">{title}</p>
        <p className="text-white/50 text-sm mt-0.5">{subtitle}</p>
      </div>
      <div onClick={() => handleToggle(prefKey)}>
        <Toggle enabled={preferences[prefKey]} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black border-b border-white/10 backdrop-blur-xl bg-opacity-95">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <a
            href="/settings"
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <ArrowLeft size={20} className="text-white" />
          </a>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Alerts</h1>
            {saving && <p className="text-[#D4AF37] text-xs mt-0.5">Saved</p>}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">
            Orders & wallet
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <Row title="Order updates" subtitle="Shipping, delivery, and refunds" prefKey="orderUpdates" />
            <Row title="Sales alerts" subtitle="When someone buys from your tags or Live Shop" prefKey="salesAlerts" />
            <Row title="Messages" subtitle="Buyer, seller, and Crestar support chats" prefKey="messages" last />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">
            Social & Live Shop
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <Row title="New followers" subtitle="When someone follows your account" prefKey="newFollowers" />
            <Row title="Likes" subtitle="When someone likes your video" prefKey="likes" />
            <Row title="Comments" subtitle="When someone comments on your video" prefKey="comments" />
            <Row
              title="Live Shop sessions"
              subtitle="When a seller you follow opens a Live Shop"
              prefKey="liveShop"
              last
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">
            Marketing
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <Row title="Promotions" subtitle="Deals and limited drops" prefKey="promotions" />
            <Row title="Newsletters" subtitle="Product news from Crestar" prefKey="newsletters" last />
          </div>
        </div>

        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-4">
          <p className="text-[#D4AF37] text-sm leading-relaxed">
            Alerts appear in your Inbox. Turn on Live Shop and sales alerts if you host or buy from live sessions.
          </p>
        </div>
      </div>
    </div>
  );
}
