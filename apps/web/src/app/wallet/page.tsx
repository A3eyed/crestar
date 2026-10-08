// @ts-nocheck
'use client';
import { useState, useEffect, useCallback } from 'react';
import useUser from '@/utils/useUser';
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
    // Depend on the stable user id — the user OBJECT can get a new identity
    // on every render, which caused endless refetch loops and screen flicker
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
        // Pre-format dates via string slicing (hydration-safe, no Date())
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
        <div className="text-white/50 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <WalletIcon size={48} className="text-white/30" />
        <p className="text-white/60">Sign in to view your wallet</p>
        <a
          href="/account/signin"
          className="bg-[#D4AF37] text-black px-6 py-2 rounded-lg font-semibold hover:opacity-90"
        >
          Sign In
        </a>
      </div>
    );
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
          <h1 className="text-xl font-bold">Wallet</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-12 h-12 border-4 border-white/20 border-t-[#D4AF37] rounded-full"
              style={{ animation: 'wallet-spin 1s linear infinite' }}
            />
            <p className="text-white/50 text-sm">Loading wallet...</p>
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
            {/* Balance Card — Crestar gold gradient */}
            <div
              className="rounded-2xl p-6 mb-6"
              style={{
                background: 'linear-gradient(135deg, #8B6914 0%, #B8912E 50%, #D4AF37 100%)',
              }}
            >
              <p className="text-white/80 text-sm mb-2 uppercase tracking-wide">
                Available to Cash Out
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
                    <span className="text-white/80 text-sm">Pending Earnings</span>
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
                  Cash Out
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
                    Payout Method
                  </button>
                )}
              </div>
            </div>

            {/* Orders — confirm deliveries and track purchases */}
            <a
              href="/orders"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex items-center justify-between hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                  <Package size={20} className="text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-white font-semibold">Orders &amp; Purchases</p>
                  <p className="text-white/50 text-sm">
                    Confirm deliveries with your PIN to release payments
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/40" />
            </a>

            {/* Payout method summary — locked once set (fraud prevention) */}
            {savedMethods.length > 0 ? (
              <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                    <CreditCard size={20} className="text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{savedMethods[0].method_name}</p>
                    <p className="text-white/50 text-sm">
                      Locked for your security — contact support to change it
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                  <Lock size={13} className="text-white/50" />
                  <span className="text-white/50 text-xs font-semibold">Locked</span>
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
                    <p className="text-white font-semibold">Set up payout method</p>
                    <p className="text-white/50 text-sm">
                      Add mobile money or a bank account to cash out
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-white/40" />
              </button>
            )}

            {/* Transactions */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Recent Transactions</h3>

              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <WalletIcon size={64} className="text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">No transactions yet</p>
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

                        <div className="text-right">
                          <div
                            className={`font-bold ${isCredit ? 'text-[#D4AF37]' : 'text-red-400'}`}
                          >
                            {isCredit ? '+' : '-'}
                            <CurrencyPrice
                              price={tx.amount}
                              originalCurrency={tx.currency || walletCurrency}
                              showOriginal={false}
                              size="medium"
                              textStyle={{
                                color: isCredit ? '#D4AF37' : '#F87171',
                                fontWeight: 'bold',
                                display: 'inline',
                              }}
                            />
                          </div>
                          <p
                            className={`text-xs ${
                              tx.status === 'completed'
                                ? 'text-[#D4AF37]'
                                : tx.status === 'pending'
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                            }`}
                          >
                            {tx.status}
                          </p>
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

      {/* ══════ PAYOUT METHOD MODAL — first-time setup only ══════ */}
      {showPayoutModal && savedMethods.length === 0 && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#141414] flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <CreditCard size={22} className="text-[#D4AF37]" />
                <h2 className="text-lg font-bold">Payout Method</h2>
              </div>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-white/60 text-sm mb-4">
                Choose how you want to receive your earnings
              </p>

              <div className="space-y-3 mb-6">
                {PAYOUT_METHODS.map((method) => (
                  <button
                    key={method.code}
                    onClick={() => setSelectedMethodCode(method.code)}
                    className={`w-full p-4 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                      selectedMethodCode === method.code
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{method.name}</p>
                      <p className="text-white/50 text-sm">{method.description}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedMethodCode === method.code ? 'border-[#D4AF37]' : 'border-white/30'
                      }`}
                    >
                      {selectedMethodCode === method.code && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {selectedMethod && (
                <div className="space-y-4 mb-6">
                  <h3 className="font-semibold">{selectedMethod.name} Details</h3>
                  {selectedMethod.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        {field.label}
                      </label>
                      {field.type === 'bank_search' ? (
                        <button
                          onClick={() => setShowBankPicker(true)}
                          className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:bg-white/10"
                        >
                          <span className={methodData[field.key] ? 'text-white' : 'text-white/40'}>
                            {methodData[field.key] || 'Tap to select bank'}
                          </span>
                          <ChevronRight size={16} className="text-white/40" />
                        </button>
                      ) : (
                        <input
                          type={field.type === 'phone' ? 'tel' : 'text'}
                          value={methodData[field.key] || ''}
                          onChange={(e) =>
                            setMethodData((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                          className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {methodError && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
                  <AlertCircle size={16} />
                  {methodError}
                </div>
              )}

              <button
                onClick={handleSaveMethod}
                disabled={!selectedMethodCode || savingMethod}
                className="w-full bg-[#D4AF37] text-black rounded-xl py-3.5 font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {savingMethod ? 'Saving...' : 'Save Payout Method'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ BANK PICKER MODAL ══════ */}
      {showBankPicker && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70">
          <div className="bg-[#141414] border border-white/10 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="font-bold">Select Bank</h3>
              <button
                onClick={() => setShowBankPicker(false)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3">
                <Search size={16} className="text-white/40" />
                <input
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Search banks..."
                  autoFocus
                  className="flex-1 bg-transparent py-3 text-white placeholder-white/30 focus:outline-none"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredBanks.length === 0 ? (
                <p className="text-white/40 text-center py-10">
                  {banks.length === 0 ? 'Loading banks...' : 'No banks found'}
                </p>
              ) : (
                filteredBanks.map((bank) => (
                  <button
                    key={bank.code}
                    onClick={() => {
                      setMethodData((prev) => ({
                        ...prev,
                        bank_name: bank.name,
                        bank_code: bank.code,
                      }));
                      setShowBankPicker(false);
                    }}
                    className="w-full px-5 py-4 text-left border-b border-white/5 hover:bg-white/5 flex items-center justify-between"
                  >
                    <span>{bank.name}</span>
                    {methodData.bank_name === bank.name && (
                      <Check size={16} className="text-[#D4AF37]" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════ WITHDRAW MODAL ══════ */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-bold">Cash Out</h2>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-white/60 text-sm mb-1">Available</p>
              <div className="mb-5">
                <CurrencyPrice
                  price={balance.available}
                  originalCurrency={walletCurrency}
                  showOriginal={false}
                  size="large"
                  textStyle={{
                    color: '#D4AF37',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                  }}
                />
              </div>

              <label className="block text-sm font-medium text-white/80 mb-2">
                Amount ({walletCurrency})
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                min="1"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white text-lg placeholder-white/30 focus:border-[#D4AF37] focus:outline-none mb-4"
              />

              {savedMethods.length > 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 flex items-center gap-3">
                  <CreditCard size={18} className="text-[#D4AF37]" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{savedMethods[0].method_name}</p>
                    <p className="text-white/50 text-xs">Funds will be sent here</p>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                  <p className="text-yellow-400 text-sm">
                    Set up a payout method first to cash out.
                  </p>
                </div>
              )}

              {withdrawError && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
                  <AlertCircle size={16} />
                  {withdrawError}
                </div>
              )}
              {withdrawSuccess && (
                <div className="flex items-center gap-2 text-[#D4AF37] text-sm mb-4">
                  <Check size={16} />
                  {withdrawSuccess}
                </div>
              )}

              <p className="text-white/50 text-xs mb-4">
                Your balance is already net of Crestar&apos;s flat 3% platform fee — the full amount
                shown is yours.
              </p>

              <button
                onClick={handleWithdraw}
                disabled={withdrawing || savedMethods.length === 0}
                className="w-full bg-[#D4AF37] text-black rounded-xl py-3.5 font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {withdrawing ? 'Processing...' : 'Cash Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
