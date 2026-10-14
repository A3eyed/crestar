// @ts-nocheck
'use client';
import { useState, useEffect, useCallback } from 'react';
import useUser from '@/utils/useUser';
import { useLocalization } from '@/utils/useLocalization';
import CurrencyPrice from '@/components/CurrencyPrice';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Wallet as WalletIcon,
  CreditCard,
  X,
  Search,
  ChevronRight,
  Check,
  AlertCircle,
  Lock,
  Package,
} from 'lucide-react';

// Same payout options as the mobile app (Ghana)
const PAYOUT_METHODS = [
  {
    code: 'mtn_momo',
    type: 'mobile_money',
    name: 'MTN Mobile Money',
    description: 'Instant payout to your MTN MoMo wallet',
    fields: [
      { key: 'phone_number', label: 'MoMo Number', type: 'phone', placeholder: '024 XXX XXXX' },
      {
        key: 'account_name',
        label: 'Registered Name',
        type: 'text',
        placeholder: 'Name on MoMo account',
      },
    ],
  },
  {
    code: 'vodafone_cash',
    type: 'mobile_money',
    name: 'Telecel Cash',
    description: 'Instant payout to your Telecel Cash wallet',
    fields: [
      {
        key: 'phone_number',
        label: 'Telecel Cash Number',
        type: 'phone',
        placeholder: '020 XXX XXXX',
      },
      {
        key: 'account_name',
        label: 'Registered Name',
        type: 'text',
        placeholder: 'Name on account',
      },
    ],
  },
  {
    code: 'airteltigo_money',
    type: 'mobile_money',
    name: 'AT Money',
    description: 'Instant payout to your AT Money wallet',
    fields: [
      { key: 'phone_number', label: 'AT Money Number', type: 'phone', placeholder: '027 XXX XXXX' },
      {
        key: 'account_name',
        label: 'Registered Name',
        type: 'text',
        placeholder: 'Name on account',
      },
    ],
  },
  {
    code: 'bank_transfer',
    type: 'bank_transfer',
    name: 'Bank Transfer',
    description: '1 to 3 business days to your bank account',
    fields: [
      { key: 'bank_name', label: 'Bank', type: 'bank_search', placeholder: 'Select your bank' },
      {
        key: 'account_number',
        label: 'Account Number',
        type: 'text',
        placeholder: 'Enter account number',
      },
      {
        key: 'account_name',
        label: 'Account Holder Name',
        type: 'text',
        placeholder: 'Name on bank account',
      },
    ],
  },
];

export default function WalletPage() {
  const { data: user, loading: userLoading } = useUser();
  const { t } = useLocalization();
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletCurrency, setWalletCurrency] = useState('GHS');

  // Payout method state
  const [savedMethods, setSavedMethods] = useState([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedMethodCode, setSelectedMethodCode] = useState('');
  const [methodData, setMethodData] = useState({});
  const [savingMethod, setSavingMethod] = useState(false);
  const [methodError, setMethodError] = useState('');

  // Bank picker
  const [banks, setBanks] = useState([]);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  // Withdraw state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchWalletData();
      fetchPayoutMethods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const [balanceRes, txRes] = await Promise.all([
        fetch('/api/wallet/balance'),
        fetch('/api/wallet/transactions?limit=20'),
      ]);

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance({
          available:
            balanceData.actualBalance ?? balanceData.actual_balance ?? balanceData.balance ?? 0,
          pending: balanceData.pendingBalance ?? balanceData.pending_balance ?? 0,
        });
        setWalletCurrency(balanceData.currency || 'GHS');
      }

      if (txRes.ok) {
        const txData = await txRes.json();
        const txList = (txData.transactions || []).map((tx) => ({
          ...tx,
          dateLabel: typeof tx.created_at === 'string' ? tx.created_at.split('T')[0] : '',
        }));
        setTransactions(txList);
      }
    } catch (err) {
      console.error('Failed to fetch wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutMethods = async () => {
    try {
      const res = await fetch('/api/wallet/payout-method');
      if (res.ok) {
        const data = await res.json();
        setSavedMethods(data.methods || []);
        const existing = data.payout_method || data.payoutMethod;
        if (existing?.method_code) {
          setSelectedMethodCode(existing.method_code);
          if (existing.details && typeof existing.details === 'object') {
            setMethodData(existing.details);
          } else if (typeof existing.details === 'string') {
            try {
              setMethodData(JSON.parse(existing.details));
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch payout methods:', err);
    }
  };

  const fetchBanks = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet/banks');
      if (res.ok) {
        const data = await res.json();
        setBanks(data.banks || []);
      }
    } catch (err) {
      console.error('Failed to fetch banks:', err);
    }
  }, []);

  useEffect(() => {
    if (showBankPicker && banks.length === 0) {
      fetchBanks();
    }
  }, [showBankPicker, banks.length, fetchBanks]);

  const selectedMethod = PAYOUT_METHODS.find((m) => m.code === selectedMethodCode);

  const handleSaveMethod = async () => {
    setMethodError('');
    if (!selectedMethod) {
      setMethodError('Please select a payout method');
      return;
    }
    for (const field of selectedMethod.fields) {
      if (!methodData[field.key]?.trim?.()) {
        setMethodError(`${field.label} is required`);
        return;
      }
    }

    setSavingMethod(true);
    try {
      const res = await fetch('/api/wallet/payout-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method_type: selectedMethod.type,
          method_code: selectedMethod.code,
          method_name: selectedMethod.name,
          details: methodData,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save payout method');
      }
      await fetchPayoutMethods();
      setShowPayoutModal(false);
    } catch (err) {
      setMethodError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSavingMethod(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawError('');
    setWithdrawSuccess('');
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setWithdrawError('Please enter a valid amount');
      return;
    }
    if (amount > balance.available) {
      setWithdrawError('Insufficient funds');
      return;
    }
    if (savedMethods.length === 0) {
      setWithdrawError('Please set up a payout method first');
      return;
    }

    setWithdrawing(true);
    try {
      const res = await fetch('/api/crestar-wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          payout_method_id: savedMethods[0].id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWithdrawSuccess(`Withdrawal successful! Reference: ${data.reference}`);
        setWithdrawAmount('');
        fetchWalletData();
        setTimeout(() => {
          setShowWithdrawModal(false);
          setWithdrawSuccess('');
        }, 2500);
      } else {
        setWithdrawError(data.error || 'Failed to process withdrawal');
      }
    } catch (err) {
      setWithdrawError('Failed to process withdrawal. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  const filteredBanks = banks.filter((b) =>
    b.name?.toLowerCase().includes(bankSearch.toLowerCase())
  );

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/50 text-lg">{t('loading')}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <WalletIcon size={48} className="text-white/30" />
        <p className="text-white/60">{t('signInToViewWallet')}</p>
        <a
          href="/account/signin"
          className="bg-[#D4AF37] text-black px-6 py-2 rounded-lg font-semibold hover:opacity-90"
        >
          {t('signIn')}
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black border-b border-white/10 backdrop-blur-xl bg-opacity-95">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <a
            href="/profile"
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </a>
          <h1 className="text-xl font-bold">{t('wallet')}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full"
              style={{ animation: 'wallet-spin 1s linear infinite' }}
            />
            <p className="text-white/50 text-sm">{t('loadingWallet')}</p>
            <style jsx global>
              {`
                @keyframes wallet-spin {
                  to {
                    transform: rotate(360deg);
                  }
                }
              `}
            </style>
          </div>
        ) : (
          <>
            <div
              className="rounded-2xl p-6 mb-6"
              style={{
                background: 'linear-gradient(135deg, #8B6914 0%, #B8912E 50%, #D4AF37 100%)',
              }}
            >
              <p className="text-white/80 text-sm mb-2 uppercase tracking-wide">
                {t('availableToCashOut')}
              </p>
              <div className="mb-6">
                <CurrencyPrice
                  price={balance.available}
                  originalCurrency={walletCurrency}
                  showOriginal={true}
                  size="xlarge"
                  textStyle={{
                    color: '#FFFFFF',
                    fontSize: '2.25rem',
                    fontWeight: 'bold',
                  }}
                  convertedStyle={{ color: 'rgba(255,255,255,0.7)' }}
                />
              </div>

              {balance.pending > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/80 text-sm">{t('pendingEarnings')}</span>
                    <CurrencyPrice
                      price={balance.pending}
                      originalCurrency={walletCurrency}
                      showOriginal={false}
                      size="medium"
                      textStyle={{ color: '#FFFFFF', fontWeight: '600' }}
                    />
                  </div>
                </div>
              )}

              <div
                className={
                  savedMethods.length > 0 ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'
                }
              >
                <button
                  onClick={() => {
                    setWithdrawError('');
                    setShowWithdrawModal(true);
                  }}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg py-3 font-semibold hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowUpRight size={18} />
                  {t('cashOut')}
                </button>
                {savedMethods.length === 0 && (
                  <button
                    onClick={() => {
                      setMethodError('');
                      setShowPayoutModal(true);
                    }}
                    className="bg-white text-black rounded-lg py-3 font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard size={18} />
                    {t('payoutMethod')}
                  </button>
                )}
              </div>
            </div>

            <a
              href="/orders"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex items-center justify-between hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                  <Package size={20} className="text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-white font-semibold">{t('ordersAndPurchases')}</p>
                  <p className="text-white/50 text-sm">
                    {t('confirmDeliveries')}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/40" />
            </a>

            {savedMethods.length > 0 ? (
              <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                    <CreditCard size={20} className="text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{savedMethods[0].method_name}</p>
                    <p className="text-white/50 text-sm">
                      {t('lockedForSecurity')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                  <Lock size={13} className="text-white/50" />
                  <span className="text-white/50 text-xs font-semibold">{t('locked')}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowPayoutModal(true)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex items-center justify-between hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                    <CreditCard size={20} className="text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{t('setUpPayoutMethod')}</p>
                    <p className="text-white/50 text-sm">
                      {t('addMobileMoneyOrBank')}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-white/40" />
              </button>
            )}

            <div>
              <h3 className="text-white font-bold text-lg mb-4">{t('recentTransactions')}</h3>

              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <WalletIcon size={64} className="text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">{t('noTransactions')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => {
                    const isCredit =
                      tx.transaction_type === 'deposit' || tx.transaction_type === 'earning';
                    return (
                      <div
                        key={tx.id}
                        className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isCredit ? 'bg-[#D4AF37]/20' : 'bg-red-500/20'
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownRight size={20} className="text-[#D4AF37]" />
                            ) : (
                              <ArrowUpRight size={20} className="text-red-400" />
                            )}
                          </div>

                          <div>
                            <p className="text-white font-semibold capitalize">
                              {tx.transaction_type.replace('_', ' ')}
                            </p>
                            <p className="text-white/50 text-sm">{tx.dateLabel}</p>
                          </div>
                        </div>

                        <div className={`font-semibold ${
                          isCredit ? 'text-[#D4AF37]' : 'text-red-400'
                        }`}>
                          {isCredit ? '+' : '-'}
                          <CurrencyPrice
                            price={Math.abs(parseFloat(tx.amount) || 0)}
                            originalCurrency={tx.currency || walletCurrency}
                            showOriginal={false}
                            size="small"
                            textStyle={{
                              color: isCredit ? '#D4AF37' : '#F87171',
                              fontWeight: '600',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Payout method modal and withdraw modal remain in English for form fields (bank names etc) - main UI is localized */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#111] border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t('payoutMethod')}</h2>
              <button onClick={() => setShowPayoutModal(false)} className="p-1">
                <X size={22} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {PAYOUT_METHODS.map((m) => (
                <button
                  key={m.code}
                  onClick={() => setSelectedMethodCode(m.code)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    selectedMethodCode === m.code
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-white/50 text-sm">{m.description}</p>
                </button>
              ))}
              {selectedMethod &&
                selectedMethod.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm text-white/70 mb-1">{field.label}</label>
                    <input
                      value={methodData[field.key] || ''}
                      onChange={(e) =>
                        setMethodData((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                ))}
              {methodError && <p className="text-red-400 text-sm">{methodError}</p>}
              <button
                onClick={handleSaveMethod}
                disabled={savingMethod}
                className="w-full bg-[#D4AF37] text-black font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                {savingMethod ? t('processing') : t('setUpPayoutMethod')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t('cashOut')}</h2>
              <button onClick={() => setShowWithdrawModal(false)} className="p-1">
                <X size={22} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Amount</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white text-xl font-bold"
                />
              </div>
              {withdrawError && <p className="text-red-400 text-sm">{withdrawError}</p>}
              {withdrawSuccess && (
                <div className="text-[#D4AF37] text-sm flex items-center gap-2">
                  <Check size={16} />
                  {withdrawSuccess}
                </div>
              )}
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="w-full bg-[#D4AF37] text-black font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                {withdrawing ? t('processing') : t('confirmCashOut')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
