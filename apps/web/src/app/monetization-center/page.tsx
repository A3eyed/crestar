// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import useUser from '@/utils/useUser';
import { useLocalization } from '@/utils/useLocalization';
import {
  AFRICA_COUNTRIES,
  getRegionsForCountry,
} from '@/utils/africaMarkets';
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
  FileText,
} from 'lucide-react';

const EARNING_OPTION_DEFS = [
  { id: 'seller', centerType: 'seller', titleKey: 'becomeSeller', subtitleKey: 'sellPhysical', icon: Store },
  { id: 'foodhub', centerType: 'foodhub', titleKey: 'sellFoodDrinks', subtitleKey: 'startFoodBusiness', icon: UtensilsCrossed },
  { id: 'creator', centerType: 'creator', titleKey: 'becomeCreator', subtitleKey: 'earnPromoting', icon: Video },
  { id: 'deliverer', centerType: 'deliverer', titleKey: 'becomeDeliverer', subtitleKey: 'deliverOrdersEarn', icon: Truck },
];

const VEHICLE_TYPES = [
  { value: 'motorbike', label: 'Motorbike' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'car', label: 'Car' },
  { value: 'van', label: 'Van' },
  { value: 'truck', label: 'Truck' },
];

/** Enterprise program terms — shown before onboarding can be completed */
const PROGRAM_TERMS = {
  seller: {
    title: 'Seller Program Terms',
    summary: 'How selling physical products on Crestar works, including fees and your responsibilities.',
    sections: [
      {
        heading: '1. Program overview',
        body: 'The Seller Program lets you list and sell physical goods to buyers on Crestar. You set your prices, manage inventory, and fulfil orders according to these terms and Crestar’s general Terms of Service.',
      },
      {
        heading: '2. How it works',
        body: 'After approval or activation, you create product listings with accurate descriptions, images, pricing, and available stock. When a buyer places an order and pays, you prepare and ship (or arrange delivery) within the stated handling time. The buyer confirms delivery; funds are then released to your Crestar wallet according to platform rules.',
      },
      {
        heading: '3. Platform fee',
        body: 'Crestar charges a single platform fee of 5% on the item subtotal of each completed sale (excluding any buyer-paid delivery fee that is passed through to a deliverer, where applicable). There is no separate listing fee and no monthly subscription fee for this program. Your wallet balance reflects amounts after the platform fee is deducted.',
      },
      {
        heading: '4. Payouts',
        body: 'Available balance can be withdrawn to a payout method you register (for example mobile money or bank transfer), subject to verification, minimum thresholds, and processing times. Crestar may hold funds in pending status until delivery is confirmed or a dispute window closes.',
      },
      {
        heading: '5. Your responsibilities',
        body: 'You must provide accurate product information, honour listed stock and prices, ship only items that match the listing, comply with applicable laws (including consumer and product safety rules), and respond to buyers and Crestar support in a timely manner. Misrepresentation, counterfeit goods, or abuse of the platform may result in suspension or termination.',
      },
      {
        heading: '6. Acceptance',
        body: 'By checking the box below and completing onboarding, you confirm that you have read these Seller Program Terms, understand them, and agree to be bound by them together with Crestar’s Terms of Service and Privacy Policy.',
      },
    ],
  },
  foodhub: {
    title: 'FoodHub Vendor Terms',
    summary: 'How selling food and drinks on Crestar FoodHub works, including fees and operational standards.',
    sections: [
      {
        heading: '1. Program overview',
        body: 'FoodHub allows approved vendors to offer prepared food and beverages for order and delivery (or pickup where enabled). You operate as an independent vendor; Crestar provides the marketplace, payments, and related tools.',
      },
      {
        heading: '2. How it works',
        body: 'You maintain an up-to-date menu with prices, availability, and preparation times. Buyers place paid orders through Crestar. You prepare orders to the stated standard and hand them to the assigned deliverer or the buyer for pickup. Payment is released to your wallet after successful fulfilment under platform rules.',
      },
      {
        heading: '3. Platform fee',
        body: 'Crestar charges a single platform fee of 5% on the food and drink subtotal of each completed order. There is no separate listing fee and no monthly subscription fee for this program. Delivery fees charged to the buyer for third-party delivery are handled separately and are not the same as the platform fee.',
      },
      {
        heading: '4. Payouts',
        body: 'Completed order proceeds (after the platform fee) appear in your Crestar wallet. You may withdraw available funds to a registered payout method, subject to verification and processing times.',
      },
      {
        heading: '5. Your responsibilities',
        body: 'You must comply with all applicable food safety, hygiene, and licensing requirements in your jurisdiction; prepare orders that match the menu; maintain accurate availability; and handle allergies or special instructions as reasonably possible. Crestar may suspend vendors that pose safety or quality risks.',
      },
      {
        heading: '6. Acceptance',
        body: 'By checking the box below and completing onboarding, you confirm that you have read these FoodHub Vendor Terms, understand them, and agree to be bound by them together with Crestar’s Terms of Service and Privacy Policy.',
      },
    ],
  },
  creator: {
    title: 'Creator Program Terms',
    summary: 'How earning as a creator on Crestar works, including fees and content standards.',
    sections: [
      {
        heading: '1. Program overview',
        body: 'The Creator Program lets you publish video and related content on Crestar and earn when your content drives eligible product sales or other monetised actions defined by Crestar.',
      },
      {
        heading: '2. How it works',
        body: 'You create and post content according to Crestar guidelines. Where shoppable features are enabled, viewers can purchase products from your content. Eligible earnings accrue to your Crestar wallet after the related order is completed and any applicable returns window has passed.',
      },
      {
        heading: '3. Platform fee',
        body: 'Crestar charges a single platform fee of 5% on eligible creator earnings attributed to completed transactions. There is no monthly subscription fee for participating in the Creator Program. Your wallet shows amounts after the platform fee is applied.',
      },
      {
        heading: '4. Payouts',
        body: 'Available earnings can be withdrawn to a registered payout method, subject to verification, thresholds, and processing times.',
      },
      {
        heading: '5. Your responsibilities',
        body: 'You must own or have rights to the content you post; disclose commercial relationships where required by law; avoid misleading claims about products; and follow Crestar’s community and content policies. Crestar may remove content or suspend accounts that violate these standards.',
      },
      {
        heading: '6. Acceptance',
        body: 'By checking the box below and completing onboarding, you confirm that you have read these Creator Program Terms, understand them, and agree to be bound by them together with Crestar’s Terms of Service and Privacy Policy.',
      },
    ],
  },
  deliverer: {
    title: 'Deliverer Program Terms',
    summary: 'How delivering orders on Crestar works, including fees and service standards.',
    sections: [
      {
        heading: '1. Program overview',
        body: 'The Deliverer Program lets independent delivery partners accept and complete delivery jobs for Crestar orders. You are not an employee of Crestar; you provide delivery services as an independent operator.',
      },
      {
        heading: '2. How it works',
        body: 'When delivery jobs are available in your area, you may accept an assignment, collect the order from the seller or vendor, and deliver it to the buyer at the address provided. You confirm completion in the app. Delivery compensation is credited according to the job terms shown before acceptance.',
      },
      {
        heading: '3. Platform fee',
        body: 'Crestar charges a single platform fee of 5% on delivery earnings credited to you for completed jobs. There is no monthly subscription fee for this program. Amounts shown as available in your wallet are after the platform fee.',
      },
      {
        heading: '4. Payouts',
        body: 'Completed delivery earnings appear in your Crestar wallet and may be withdrawn to a registered payout method, subject to verification and processing times.',
      },
      {
        heading: '5. Your responsibilities',
        body: 'You must hold any licences required to operate your vehicle; handle orders with care; follow reasonable delivery instructions; protect buyer and seller privacy; and complete accepted jobs unless prevented by circumstances outside your control. Fraud, theft, or repeated failure to complete jobs may result in permanent removal from the program.',
      },
      {
        heading: '6. Acceptance',
        body: 'By checking the box below and completing onboarding, you confirm that you have read these Deliverer Program Terms, understand them, and agree to be bound by them together with Crestar’s Terms of Service and Privacy Policy.',
      },
    ],
  },
};

function ProgramTermsPanel({ centerType }) {
  const terms = PROGRAM_TERMS[centerType] || PROGRAM_TERMS.seller;
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
        <FileText size={18} className="text-[#D4AF37] shrink-0" />
        <div>
          <h3 className="font-semibold text-sm text-white">{terms.title}</h3>
          <p className="text-white/45 text-xs mt-0.5">{terms.summary}</p>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto px-4 py-3 space-y-4 scroll-smooth">
        {terms.sections.map((s) => (
          <div key={s.heading}>
            <h4 className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wide mb-1">
              {s.heading}
            </h4>
            <p className="text-sm text-white/70 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-white/10 text-[11px] text-white/35">
        Scroll to review all sections. Full Terms of Service also apply.
      </div>
    </div>
  );
}

export default function MonetizationCenterPage() {
  const { data: user, loading: userLoading } = useUser();
  const { t } = useLocalization();
  const EARNING_OPTIONS = EARNING_OPTION_DEFS.map((o) => ({
    ...o,
    title: t(o.titleKey),
    subtitle: t(o.subtitleKey),
  }));

  const [loading, setLoading] = useState(true);
  const [existingCenter, setExistingCenter] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [acceptedProgramTerms, setAcceptedProgramTerms] = useState(false);

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

  useEffect(() => {
    setAcceptedProgramTerms(false);
    setError('');
  }, [selectedOption?.centerType]);

  const checkExistingCenter = async () => {
    try {
      const res = await fetch('/api/business-centers');
      if (res.ok) {
        const data = await res.json();
        if (data.has_center && data.center) {
          setExistingCenter(data.center);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setError('');

    if (!acceptedProgramTerms) {
      setError('Please read and accept the program terms to continue.');
      return;
    }
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
          acceptedProgramTerms: true,
          acceptedProgramTermsAt: new Date().toISOString(),
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
        { label: t('sellerCenter'), href: '/seller/dashboard' },
        { label: t('wallet') + ' & payouts', href: '/wallet' },
      ];
    }
    if (type === 'creator') {
      return [
        { label: 'Create a shoppable video', href: '/create' },
        { label: t('wallet') + ' & payouts', href: '/wallet' },
      ];
    }
    return [{ label: t('wallet') + ' & payouts', href: '/wallet' }];
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (success || existingCenter) {
    const status = existingCenter?.status || existingCenter?.verification_status || 'pending';
    const isApproved =
      status === 'active' || status === 'approved' || existingCenter?.verification_status === 'approved';

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
            <h1 className="text-xl font-bold">{t('monetizationCenter')}</h1>
          </div>
        </div>
        <div className="max-w-xl mx-auto px-4 py-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            {isApproved ? (
              <CheckCircle2 size={40} className="mx-auto text-[#D4AF37] mb-3" />
            ) : (
              <Clock size={40} className="mx-auto text-[#D4AF37] mb-3" />
            )}
            <h2 className="text-xl font-bold mb-1">
              {isApproved ? t('youreIn') : t('pendingReview')}
            </h2>
            <p className="text-white/55 text-sm mb-1">
              {centerTypeLabel(existingCenter?.center_type)} Program
            </p>
            <p className="text-white/45 text-sm mb-6">
              {isApproved
                ? 'Your program is active. Use the shortcuts below to get started.'
                : t('applicationUnderReview')}
            </p>
            <div className="space-y-2">
              {centerNextSteps(existingCenter?.center_type).map((step) => (
                <a
                  key={step.href}
                  href={step.href}
                  className="flex items-center justify-between w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10"
                >
                  <span className="font-semibold text-sm">{step.label}</span>
                  <ChevronRight size={18} className="text-white/40" />
                </a>
              ))}
            </div>
            <a
              href="/profile"
              className="inline-block mt-6 text-[#D4AF37] text-sm font-medium hover:underline"
            >
              {t('goToProfile')}
            </a>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (selectedOption) {
    const OptionIcon = selectedOption.icon;
    const isDeliverer = selectedOption.centerType === 'deliverer';
    const regionsRaw = getRegionsForCountry(form.country);
    const regions = Array.isArray(regionsRaw) ? regionsRaw : [];

    return (
      <div className="min-h-screen bg-black text-white pb-24">
        <div className="sticky top-0 z-20 bg-black border-b border-white/10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setSelectedOption(null);
                setError('');
                setAcceptedProgramTerms(false);
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
          <ProgramTermsPanel centerType={selectedOption.centerType} />

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
              placeholder="Phone number"
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
                    type="button"
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
              Country <span className="text-[#D4AF37]">*</span>
            </label>
            <select
              value={form.country}
              onChange={(e) => {
                setField('country', e.target.value);
                setField('region', '');
              }}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none [&>option]:bg-black"
            >
              {AFRICA_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('region')} <span className="text-[#D4AF37]">*</span>
            </label>
            {regions.length > 0 ? (
              <select
                value={form.region}
                onChange={(e) => setField('region', e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none [&>option]:bg-black"
              >
                <option value="">Select your region...</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form.region}
                onChange={(e) => setField('region', e.target.value)}
                placeholder="Your region or state"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              City <span className="text-[#D4AF37]">*</span>
            </label>
            <input
              value={form.city}
              onChange={(e) => setField('city', e.target.value)}
              placeholder="Your city"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/[0.03] p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedProgramTerms}
              onChange={(e) => setAcceptedProgramTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/30 accent-[#D4AF37] shrink-0"
            />
            <span className="text-sm text-white/75 leading-relaxed">
              I have read and understand the{' '}
              <span className="text-white font-medium">
                {(PROGRAM_TERMS[selectedOption.centerType] || PROGRAM_TERMS.seller).title}
              </span>
              , including the 5% platform fee, and I agree to them. I also agree to Crestar’s{' '}
              <a href="/terms" className="text-[#D4AF37] hover:underline" target="_blank" rel="noreferrer">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-[#D4AF37] hover:underline" target="_blank" rel="noreferrer">
                Privacy Policy
              </a>
              .
            </span>
          </label>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !acceptedProgramTerms}
            className="w-full bg-[#D4AF37] text-black rounded-xl py-3.5 font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {submitting ? t('submitting') : t('completeOnboarding')}
          </button>

          <p className="text-white/35 text-xs text-center">
            Completing onboarding records your acceptance of the program terms above.
          </p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold">{t('monetizationCenter')}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-1">{t('startEarning')}</h2>
        <p className="text-white/60 text-sm mb-6">{t('chooseHowToEarn')}</p>

        <div className="space-y-3">
          {EARNING_OPTIONS.map((option) => {
            const OptionIcon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedOption(option)}
                className="w-full flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-[#D4AF37]/40 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-[#D4AF37]/15 flex items-center justify-center shrink-0">
                  <OptionIcon size={24} className="text-[#D4AF37]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{option.title}</h3>
                  <p className="text-white/50 text-sm">{option.subtitle}</p>
                </div>
                <ChevronRight size={20} className="text-white/40" />
              </button>
            );
          })}
        </div>

        <p className="text-white/35 text-xs text-center mt-8">
          Program terms, including platform fees, are presented for review before you complete onboarding.
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
