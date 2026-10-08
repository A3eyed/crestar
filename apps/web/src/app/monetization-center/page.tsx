// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import useUser from '@/utils/useUser';
import BottomNav from '@/components/BottomNav';
import {
  ArrowLeft,
  Store,
  UtensilsCrossed,
  Video,
  Truck,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';

// Same programs as the mobile app's Monetization Center
const EARNING_OPTIONS = [
  {
    id: 'seller',
    centerType: 'seller',
    title: 'Become a Seller',
    subtitle: 'Sell physical goods & products',
    icon: Store,
  },
  {
    id: 'foodhub',
    centerType: 'foodhub',
    title: 'Sell Food & Drinks',
    subtitle: 'Start your food business',
    icon: UtensilsCrossed,
  },
  {
    id: 'creator',
    centerType: 'creator',
    title: 'Become a Creator',
    subtitle: 'Earn by promoting products in videos',
    icon: Video,
  },
  {
    id: 'deliverer',
    centerType: 'deliverer',
    title: 'Become a Deliverer',
    subtitle: 'Deliver orders and earn',
    icon: Truck,
  },
];

const VEHICLE_TYPES = [
  { value: 'motorbike', label: '🏍️ Motorbike' },
  { value: 'bicycle', label: '🚲 Bicycle' },
  { value: 'car', label: '🚗 Car' },
  { value: 'van', label: '🚐 Van' },
  { value: 'truck', label: '🚚 Truck' },
];

const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Central',
  'Eastern',
  'Volta',
  'Northern',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
  'Savannah',
  'North East',
  'Oti',
  'Western North',
];

export default function MonetizationCenterPage() {
  const { data: user, loading: userLoading } = useUser();

  const [loading, setLoading] = useState(true);
  const [existingCenter, setExistingCenter] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    businessName: '',
    phoneNumber: '',
    vehicleType: '',
    country: 'GH',
    region: '',
    city: '',
  });

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin?callbackUrl=/monetization-center';
    }
  }, [user, userLoading]);

  useEffect(() => {
    if (user) {
      checkExistingCenter();
    }
  }, [user]);

  const checkExistingCenter = async () => {
    try {
      const res = await fetch('/api/business-centers');
      if (res.ok) {
        const data = await res.json();
        if (data.has_center && data.center) {
          setExistingCenter(data.center);
        }
      }
    } catch (err) {
      console.error('Failed to check center:', err);
    } finally {
      setLoading(false);
    }
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setError('');

    if (!form.fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!form.region || !form.city.trim()) {
      setError('Please select your region and enter your city');
      return;
    }
    if (selectedOption.centerType === 'deliverer') {
      if (!form.phoneNumber.trim() || !form.vehicleType) {
        setError('Phone number and vehicle type are required for deliverers');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/business-centers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerType: selectedOption.centerType,
          fullName: form.fullName.trim(),
          businessName: form.businessName.trim() || null,
          phoneNumber: form.phoneNumber.trim() || null,
          vehicleType: form.vehicleType || null,
          country: form.country,
          region: form.region,
          city: form.city.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.existing_center_type) {
          setError('You already have a business center. Refreshing your status...');
          await checkExistingCenter();
          setSelectedOption(null);
          return;
        }
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      setSuccess(true);
      await checkExistingCenter();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const centerTypeLabel = (type) => {
    const opt = EARNING_OPTIONS.find((o) => o.centerType === type);
    return opt?.title?.replace('Become a ', '').replace('Sell ', '') || type;
  };

  const centerNextSteps = (type) => {
    if (type === 'seller' || type === 'foodhub') {
      return [
        { label: 'List a product', href: '/create-listing' },
        { label: 'Seller Center', href: '/seller/dashboard' },
        { label: 'Wallet & payouts', href: '/wallet' },
      ];
    }
    if (type === 'creator') {
      return [
        { label: 'Create a shoppable video', href: '/create' },
        { label: 'Wallet & payouts', href: '/wallet' },
      ];
    }
    return [{ label: 'Wallet & payouts', href: '/wallet' }];
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full"
          style={{ animation: 'monetization-spin 1s linear infinite' }}
        />
        <style jsx global>{`
          @keyframes monetization-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return null;

  // ── Existing center: status view (like mobile redirecting to dashboards) ──
  if (existingCenter && !selectedOption) {
    const isApproved = existingCenter.verification_status === 'approved';
    return (
      <div className="min-h-screen bg-black text-white pb-24">
        <div className="sticky top-0 z-20 bg-black border-b border-white/10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            <a
              href="/profile"
              className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20"
            >
              <ArrowLeft size={20} />
            </a>
            <h1 className="text-xl font-bold">Monetization</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center mb-6">
            {isApproved ? (
              <CheckCircle2 size={48} className="text-[#D4AF37] mx-auto mb-4" />
            ) : (
              <Clock size={48} className="text-yellow-400 mx-auto mb-4" />
            )}
            <h2 className="text-xl font-bold mb-1">
              {centerTypeLabel(existingCenter.center_type)} Program
            </h2>
            <p className="text-white/60 text-sm mb-4">
              {existingCenter.business_name || existingCenter.full_name}
            </p>
            <span
              className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${
                isApproved ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-yellow-500/15 text-yellow-400'
              }`}
            >
              {isApproved ? 'Approved & Active' : 'Pending Review'}
            </span>
          </div>

          {isApproved && (
            <div className="space-y-3">
              {centerNextSteps(existingCenter.center_type).map((step) => (
                <a
                  key={step.href}
                  href={step.href}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-5 py-4 hover:bg-white/10 transition-colors"
                >
                  <span className="font-semibold text-sm">{step.label}</span>
                  <ChevronRight size={18} className="text-white/40" />
                </a>
              ))}
            </div>
          )}

          {!isApproved && (
            <p className="text-white/50 text-sm text-center">
              Your application is being reviewed. You'll be able to start earning as soon as it's
              approved.
            </p>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Onboarding form for a selected program ──
  if (selectedOption) {
    const isDeliverer = selectedOption.centerType === 'deliverer';
    const OptionIcon = selectedOption.icon;

    if (success) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <CheckCircle2 size={64} className="text-[#D4AF37] mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">You're in! 🎉</h1>
            <p className="text-white/60 mb-8">
              Your {selectedOption.title.toLowerCase()} application was submitted successfully.
            </p>
            <a
              href="/profile"
              className="block w-full bg-[#D4AF37] text-black py-3.5 rounded-xl font-bold hover:opacity-90"
            >
              Go to Profile
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black text-white pb-24">
        <div className="sticky top-0 z-20 bg-black border-b border-white/10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedOption(null);
                setError('');
              }}
              className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <OptionIcon size={22} className="text-[#D4AF37]" />
              <h1 className="text-xl font-bold">{selectedOption.title}</h1>
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Full Name <span className="text-[#D4AF37]">*</span>
            </label>
            <input
              value={form.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              placeholder="Your legal full name"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>

          {!isDeliverer && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Business Name (optional)
              </label>
              <input
                value={form.businessName}
                onChange={(e) => setField('businessName', e.target.value)}
                placeholder="e.g. Ama's Kitchen"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Phone Number {isDeliverer && <span className="text-[#D4AF37]">*</span>}
            </label>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => setField('phoneNumber', e.target.value)}
              placeholder="024 XXX XXXX"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>

          {isDeliverer && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Vehicle Type <span className="text-[#D4AF37]">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VEHICLE_TYPES.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setField('vehicleType', v.value)}
                    className={`py-3 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      form.vehicleType === v.value
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                        : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Region <span className="text-[#D4AF37]">*</span>
            </label>
            <select
              value={form.region}
              onChange={(e) => setField('region', e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none [&>option]:bg-black"
            >
              <option value="">Select your region...</option>
              {GHANA_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              City <span className="text-[#D4AF37]">*</span>
            </label>
            <input
              value={form.city}
              onChange={(e) => setField('city', e.target.value)}
              placeholder="e.g. Accra, Kumasi, Tamale"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#D4AF37] text-black rounded-xl py-3.5 font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {submitting ? 'Submitting...' : 'Complete Onboarding'}
          </button>

          <p className="text-white/40 text-xs text-center">
            By continuing you agree to Crestar's{' '}
            <a href="/terms" className="text-[#D4AF37] hover:underline">
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Start Earning menu (like mobile) ──
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <a
            href="/profile"
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <ArrowLeft size={20} />
          </a>
          <h1 className="text-xl font-bold">Monetization Center</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-1">Start Earning</h2>
        <p className="text-white/60 text-sm mb-4">Choose how you want to earn on Crestar</p>

        <div className="flex items-start gap-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl p-4 mb-6">
          <CheckCircle2 size={18} className="text-[#D4AF37] shrink-0 mt-0.5" />
          <p className="text-sm text-white/80">
            <span className="font-bold text-[#D4AF37]">One flat 3% fee.</span> Every program on
            Crestar — selling, food, creating, delivering — pays the same flat 3%. No other fees,
            ever. Your wallet always shows what you keep.
          </p>
        </div>

        <div className="space-y-3">
          {EARNING_OPTIONS.map((option) => {
            const OptionIcon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option)}
                className="w-full flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-[#D4AF37]/40 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-[#D4AF37]/15 flex items-center justify-center shrink-0">
                  <OptionIcon size={24} className="text-[#D4AF37]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{option.title}</h3>
                  <p className="text-white/50 text-sm">{option.subtitle}</p>
                  <p className="text-[#D4AF37] text-xs mt-1 font-semibold">
                    Flat 3% Crestar fee — you keep 97%
                  </p>
                </div>
                <ChevronRight size={20} className="text-white/40" />
              </button>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
