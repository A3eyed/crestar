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
    liveStreams: false,
    promotions: false,
    newsletters: false,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load preferences from localStorage
    const saved = localStorage.getItem("notificationPreferences");
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

  const handleToggle = (key) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);

    // Save to localStorage
    localStorage.setItem("notificationPreferences", JSON.stringify(updated));

    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  if (!user) {
    return null;
  }

  const Toggle = ({ enabled }) => (
    <button
      className={`w-12 h-7 rounded-full transition-all ${enabled ? "bg-[#D4AF37]" : "bg-white/20"}`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"} mt-1`}
      ></div>
    </button>
  );

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
          <div className="flex-1">
            <h1 className="text-xl font-bold">Notifications</h1>
            {saving && <p className="text-[#D4AF37] text-xs mt-0.5">Saved</p>}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Orders & Transactions */}
        <div className="mb-8">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">
            Orders & Transactions
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <p className="text-white font-medium">Order Updates</p>
                <p className="text-white/50 text-sm mt-0.5">
                  Get notified about order status changes
                </p>
              </div>
              <div onClick={() => handleToggle("orderUpdates")}>
                <Toggle enabled={preferences.orderUpdates} />
              </div>
            </div>

            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-white font-medium">Messages</p>
                <p className="text-white/50 text-sm mt-0.5">
                  Chat messages from buyers and sellers
                </p>
              </div>
              <div onClick={() => handleToggle("messages")}>
                <Toggle enabled={preferences.messages} />
              </div>
            </div>
          </div>
        </div>

        {/* Social */}
        <div className="mb-8">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">
            Social
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <p className="text-white font-medium">New Followers</p>
                <p className="text-white/50 text-sm mt-0.5">
                  When someone follows you
                </p>
              </div>
              <div onClick={() => handleToggle("newFollowers")}>
                <Toggle enabled={preferences.newFollowers} />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <p className="text-white font-medium">Likes</p>
                <p className="text-white/50 text-sm mt-0.5">
                  When someone likes your content
                </p>
              </div>
              <div onClick={() => handleToggle("likes")}>
                <Toggle enabled={preferences.likes} />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <p className="text-white font-medium">Comments</p>
                <p className="text-white/50 text-sm mt-0.5">
                  When someone comments on your videos
                </p>
              </div>
              <div onClick={() => handleToggle("comments")}>
                <Toggle enabled={preferences.comments} />
              </div>
            </div>

            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-white font-medium">Live Streams</p>
                <p className="text-white/50 text-sm mt-0.5">
                  When someone you follow goes live
                </p>
              </div>
              <div onClick={() => handleToggle("liveStreams")}>
                <Toggle enabled={preferences.liveStreams} />
              </div>
            </div>
          </div>
        </div>

        {/* Marketing */}
        <div className="mb-8">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">
            Marketing
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <p className="text-white font-medium">Promotions</p>
                <p className="text-white/50 text-sm mt-0.5">
                  Special offers and discounts
                </p>
              </div>
              <div onClick={() => handleToggle("promotions")}>
                <Toggle enabled={preferences.promotions} />
              </div>
            </div>

            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-white font-medium">Newsletters</p>
                <p className="text-white/50 text-sm mt-0.5">
                  Weekly updates and featured content
                </p>
              </div>
              <div onClick={() => handleToggle("newsletters")}>
                <Toggle enabled={preferences.newsletters} />
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-4">
          <p className="text-[#D4AF37] text-sm leading-relaxed">
            💡 <span className="font-semibold">Tip:</span> We'll only send you
            important notifications. You can always change these settings later.
          </p>
        </div>
      </div>
    </div>
  );
}
