// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import useUser from '@/utils/useUser';
import {
  ArrowLeft,
  ChevronRight,
  User as UserIcon,
  Bell,
  Shield,
  Globe,
  Lock,
  LogOut,
  Trash2,
  HelpCircle,
  FileText,
  Key,
  Smartphone,
  DollarSign,
} from 'lucide-react';

export default function SettingsPage() {
  const { data: user } = useUser();
  const [currentCurrency, setCurrentCurrency] = useState('GHS');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currency');
      if (saved) {
        setCurrentCurrency(saved);
      }
    }
  }, []);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      window.location.href = '/account/logout';
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm('Are you sure? This will permanently delete your account and all your data.')) {
      window.location.href = '/account/delete';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black border-b border-white/10 backdrop-blur-xl bg-opacity-95">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <a
            href="/profile"
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </a>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Account Section */}
        <div className="mb-8">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">Account</h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <a
              href="/edit-profile"
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/10"
            >
              <div className="flex items-center gap-3">
                <UserIcon size={20} className="text-white/60" />
                <span className="text-white font-medium">Edit Profile</span>
              </div>
              <ChevronRight size={20} className="text-white/40" />
            </a>

            <a
              href="/settings/notifications"
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-white/60" />
                <span className="text-white font-medium">Notifications</span>
              </div>
              <ChevronRight size={20} className="text-white/40" />
            </a>
          </div>
        </div>

        {/* Security */}
        <div className="mb-8">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">
            Security & Privacy
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <a
              href="/account/change-password"
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/10"
            >
              <div className="flex items-center gap-3">
                <Key size={20} className="text-white/60" />
                <span className="text-white font-medium">Change Password</span>
              </div>
              <ChevronRight size={20} className="text-white/40" />
            </a>

            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone size={20} className="text-white/60" />
                  <div>
                    <p className="text-white font-medium">Two-Factor Authentication</p>
                    <p className="text-white/50 text-sm mt-0.5">Add an extra layer of security</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full">
                  <span className="text-[#D4AF37] text-xs font-semibold">Coming Soon</span>
                </div>
              </div>
            </div>

            <a
              href="/settings/privacy"
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/10"
            >
              <div className="flex items-center gap-3">
                <Lock size={20} className="text-white/60" />
                <span className="text-white font-medium">Privacy Settings</span>
              </div>
              <ChevronRight size={20} className="text-white/40" />
            </a>

            <div className="p-4">
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-white/60" />
                <div className="flex-1">
                  <p className="text-white font-medium">Account Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-green-400 text-sm">Secure & Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="mb-8">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">
            Preferences
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <a
              href="/settings/currency"
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/10"
            >
              <div className="flex items-center gap-3">
                <DollarSign size={20} className="text-white/60" />
                <div>
                  <p className="text-white font-medium">Currency</p>
                  <p className="text-white/50 text-sm">{currentCurrency}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-white/40" />
            </a>

            <a
              href="/settings/language"
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-white/60" />
                <div>
                  <p className="text-white font-medium">Language</p>
                  <p className="text-white/50 text-sm">English</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-white/40" />
            </a>
          </div>
        </div>

        {/* Support */}
        <div className="mb-8">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">Support</h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <a
              href="/support"
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/10"
            >
              <div className="flex items-center gap-3">
                <HelpCircle size={20} className="text-white/60" />
                <span className="text-white font-medium">Help & Support</span>
              </div>
              <ChevronRight size={20} className="text-white/40" />
            </a>

            <a
              href="/privacy"
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/10"
            >
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-white/60" />
                <span className="text-white font-medium">Privacy Policy</span>
              </div>
              <ChevronRight size={20} className="text-white/40" />
            </a>

            <a
              href="/terms"
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-white/60" />
                <span className="text-white font-medium">Terms of Service</span>
              </div>
              <ChevronRight size={20} className="text-white/40" />
            </a>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mb-8">
          <h2 className="text-red-400/80 text-xs font-bold uppercase tracking-wider mb-3">
            Danger Zone
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/10 text-left"
            >
              <LogOut size={20} className="text-white/60" />
              <span className="text-white font-medium">Log Out</span>
            </button>

            <button
              onClick={handleDeleteAccount}
              className="w-full flex items-center gap-3 p-4 hover:bg-red-500/10 transition-colors text-left"
            >
              <Trash2 size={20} className="text-red-400" />
              <span className="text-red-400 font-medium">Delete Account</span>
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center text-white/40 text-sm">
          <p>Crestar v1.1.2</p>
          <p className="mt-1">© 2024 Crestar. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
