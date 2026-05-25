import React, { useState, useEffect } from 'react';
import { 
  User, 
  Landmark, 
  ShieldCheck, 
  ArrowLeft, 
  ArrowUpRight, 
  Award, 
  Activity, 
  Wallet, 
  Check, 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  FileText,
  HelpCircle,
  QrCode,
  LogOut,
  Copy
} from 'lucide-react';
import { UserProfile, getFormattedUserId } from '../types';
import { Leaderboard } from './Leaderboard';

interface ProfilePageProps {
  userProfile: UserProfile;
  currentUserId: string;
  onWithdraw: (amount: number) => Promise<void>;
  onClose: () => void;
  onLogout?: () => void;
  leaderboardUsers: UserProfile[];
  onViewProfile?: (user: UserProfile) => void;
}

interface BankType {
  code: string;
  name: string;
}

const NIGERIAN_BANKS: BankType[] = [
  { code: 'access', name: 'Access Bank' },
  { code: 'zenith', name: 'Zenith Bank' },
  { code: 'gtbank', name: 'Guaranty Trust Bank (GTB)' },
  { code: 'uba', name: 'United Bank for Africa (UBA)' },
  { code: 'firstbank', name: 'First Bank of Nigeria' },
  { code: 'kuda', name: 'Kuda Microfinance Bank' },
  { code: 'opay', name: 'OPay Digital Services' },
  { code: 'moniepoint', name: 'Moniepoint MFB' },
  { code: 'palmpay', name: 'PalmPay Limited' },
  { code: 'fidelity', name: 'Fidelity Bank' },
  { code: 'stanbic', name: 'Stanbic IBTC Bank' },
];

type ProfileActiveSubView = 'profile' | 'withdraw' | 'clearance';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userProfile,
  currentUserId,
  onWithdraw,
  onClose,
  onLogout,
  leaderboardUsers,
  onViewProfile,
}) => {
  const [activeSubView, setActiveSubView] = useState<ProfileActiveSubView>('profile');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [idCopied, setIdCopied] = useState<boolean>(false);

  // Auto-resolve holder name for Nigerian Bank systems simulates active NIBSS database check
  useEffect(() => {
    if (activeSubView === 'withdraw' && accountNumber.length === 10) {
      setIsVerifying(true);
      const timer = setTimeout(() => {
        setIsVerifying(false);
        const resolvedName = userProfile.displayName.toUpperCase() || 'SOVEREIGN USER';
        setAccountName(`${resolvedName} (VERIFIED)`);
      }, 1050);
      return () => clearTimeout(timer);
    } else {
      setAccountName('');
    }
  }, [accountNumber, userProfile.displayName, activeSubView]);

  const handleWithdrawClick = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid amount to withdraw.' });
      return;
    }

    if (amount < 200) {
      setStatusMessage({ type: 'error', text: 'Minimum withdrawal amount is ₦200.' });
      return;
    }

    if (amount > userProfile.balance) {
      setStatusMessage({ type: 'error', text: `Insufficient balance! You can only withdraw up to ₦${userProfile.balance.toFixed(2)}` });
      return;
    }

    if (!selectedBank) {
      setStatusMessage({ type: 'error', text: 'Please select a destination bank.' });
      return;
    }

    if (accountNumber.length !== 10) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid 10-digit account number.' });
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate interbank compliance wait times
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Execute parent callback state sync
      await onWithdraw(amount);

      const txRef = `SOV-TX-${Math.floor(1000000 + Math.random() * 9000000)}`;
      const selectedBankName = NIGERIAN_BANKS.find(b => b.code === selectedBank)?.name || 'Nigerian Bank';
      
      const receipt = {
        txId: txRef,
        bank: selectedBankName,
        accountNo: accountNumber,
        name: accountName,
        amount: amount,
        dateTime: new Date().toLocaleString(),
        fee: 10.00, // standard Naira transfer fee
        status: 'SUCCESSFUL',
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      setWithdrawAmount('');
      setAccountNumber('');
      setSelectedBank('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Transaction settlement failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const winRatio = (userProfile.wins + userProfile.losses + userProfile.draws) > 0
    ? ((userProfile.wins / (userProfile.wins + userProfile.losses + userProfile.draws)) * 100).toFixed(1)
    : '0.0';

  if (activeSubView === 'withdraw') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto pb-12 animate-in fade-in duration-300">
        {/* Navigation Breadcrumb back to profile */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-900">
          <button
            onClick={() => {
              setActiveSubView('profile');
              setStatusMessage(null);
            }}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-mono transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Profile Summary
          </button>
          <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded text-emerald-400 font-bold uppercase tracking-wider">
            NIBSS Clears Portal
          </span>
        </div>

        {showReceipt && receiptData && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f121d] border border-emerald-500/30 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in scale-in duration-200">
              <div className="bg-gradient-to-r from-emerald-950 to-teal-950 p-6 flex flex-col items-center text-center space-y-2 border-b border-emerald-900/30">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500 rounded-full flex items-center justify-center text-emerald-400">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-display font-bold text-lg text-emerald-400">NIBSS Settlement Confirmed</h4>
                <p className="text-xs text-emerald-300">CBN Clearance Protocol clearance successful</p>
              </div>

              <div className="p-6 space-y-4 font-mono text-xs text-gray-300 bg-slate-950/40">
                <div className="bg-slate-950 p-4 rounded-xl border border-gray-900 space-y-2.5">
                  <div className="flex justify-between items-center text-[10px] text-gray-500 pb-1.5 border-b border-gray-900">
                    <span>CENTRAL SETTLEMENT RECORD</span>
                    <span className="text-emerald-500 font-bold">{receiptData.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">REF NUMBER:</span>
                    <span className="text-gray-200">{receiptData.txId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">SETTLED IN:</span>
                    <span className="text-gray-200 text-right">{receiptData.bank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">RECIPIENT ACCT:</span>
                    <span className="text-gray-200">{receiptData.accountNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">BENEFICIARY:</span>
                    <span className="text-gray-200 text-right truncate max-w-[200px]">{receiptData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">DATE & TIME:</span>
                    <span className="text-gray-200">{receiptData.dateTime}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-gray-900">
                    <span className="text-gray-500">FEE PROXY:</span>
                    <span className="text-gray-200">₦{receiptData.fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-900 text-sm font-bold text-emerald-400">
                    <span>TOTAL AMOUNT:</span>
                    <span>₦{receiptData.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 text-center leading-relaxed">
                  Funds have been routed via Nigeria Inter-Bank Settlement System (NIBSS). Please check your account ledger.
                </div>
              </div>

              <div className="p-4 border-t border-gray-900 bg-[#0f121d] flex gap-3">
                <button
                  onClick={() => {
                    setShowReceipt(false);
                    setActiveSubView('profile');
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 hover:opacity-90 text-slate-950 font-bold text-xs rounded-xl cursor-pointer text-center"
                >
                  Done & Return
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-gray-800">
            <Landmark className="w-5 h-5 text-emerald-500" />
            <h3 className="font-display font-bold text-sm text-gray-200">Secure Bank Withdrawal (Naira)</h3>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Verify your banking credentials and authorize an immediate settlement order. There are zero settlement fees. Real-time payouts route via Central Bank clearings.
          </p>

          <form onSubmit={handleWithdrawClick} className="space-y-4">
            {/* Bank selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Destination Bank</label>
              <select
                value={selectedBank}
                onChange={(e) => {
                  setSelectedBank(e.target.value);
                  setStatusMessage(null);
                }}
                className="w-full bg-slate-950 border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Choose Nigerian Bank --</option>
                {NIGERIAN_BANKS.map(bank => (
                  <option key={bank.code} value={bank.code}>{bank.name}</option>
                ))}
              </select>
            </div>

            {/* 10 Digit Account number */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">10-Digit Account Number</label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={10}
                  placeholder="Enter account number"
                  value={accountNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setAccountNumber(val);
                    setStatusMessage(null);
                  }}
                  className="w-full bg-slate-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                />
                {isVerifying && (
                  <span className="absolute right-3.5 top-3 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                )}
              </div>
            </div>

            {/* Resolved Holder Name display (read-only) */}
            {accountName && (
              <div className="bg-slate-950 border border-gray-900 rounded-xl p-3 flex justify-between items-center animate-in fade-in duration-200">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">NIBSS Account Name</span>
                <span className="text-xs font-mono font-bold text-amber-500">{accountName}</span>
              </div>
            )}

            {/* Withdrawal Amount in Naira */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Settlement Amount</label>
                <button
                  type="button"
                  onClick={() => {
                    if (userProfile.balance > 0) {
                      setWithdrawAmount(userProfile.balance.toString());
                    }
                  }}
                  className="text-[9px] font-mono text-amber-500 hover:text-amber-400 font-bold cursor-pointer"
                >
                  Withdraw All (Max)
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-gray-500 font-mono font-bold">₦</span>
                <input
                  type="number"
                  min="200"
                  step="0.01"
                  placeholder="Minimum ₦200"
                  value={withdrawAmount}
                  onChange={(e) => {
                    setWithdrawAmount(e.target.value);
                    setStatusMessage(null);
                  }}
                  className="w-full bg-slate-950 border border-gray-800 rounded-xl py-2.5 pl-8 pr-4 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing || isVerifying}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 disabled:opacity-50 text-slate-950 font-display font-extrabold text-xs py-3 rounded-xl transition hover:opacity-90 active:scale-98 cursor-pointer shadow-lg shadow-emerald-950/25 flex items-center justify-center gap-1.5 duration-100"
            >
              {isProcessing ? 'Settle Clears with CBN...' : 'Secure Authorization Withdraw'}
              <ArrowUpRight className="w-4 h-4 text-slate-950" />
            </button>
          </form>

          {statusMessage && (
            <div className={`p-4 border text-xs rounded-xl flex items-center gap-2.5 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400' 
                : 'bg-red-950/20 border-red-900/40 text-red-500'
            }`}>
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeSubView === 'clearance') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto pb-12 animate-in fade-in duration-300">
        <div className="flex items-center justify-between pb-3 border-b border-gray-900">
          <button
            onClick={() => setActiveSubView('profile')}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-mono transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Profile Summary
          </button>
          <span className="text-[10px] font-mono bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded text-amber-400 font-bold uppercase tracking-wider">
            Ledger Clearance Record
          </span>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-gray-800">
            <FileText className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-bold text-sm text-gray-200">Centralized Clearance Statement</h3>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Comprehensive audit log of your matches, game results, and sandbox central clears routed directly in real-time.
          </p>

          <div className="space-y-3 pt-2">
            {userProfile.wins > 0 && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-gray-900/65 flex justify-between items-center">
                <div className="flex gap-2.5 items-center">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-200">Duel Bet Won</span>
                    <span className="text-[8px] text-gray-500 font-mono">TRANS-DUEL-{userProfile.wins * 123 + 900}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold font-mono text-sm">+₦{(200).toLocaleString()}</span>
                  <span className="block text-[8px] text-emerald-500 font-mono uppercase tracking-wider">SETTLED</span>
                </div>
              </div>
            )}

            {userProfile.losses > 0 && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-gray-900/65 flex justify-between items-center">
                <div className="flex gap-2.5 items-center">
                  <div className="w-8 h-8 rounded-lg bg-red-400/10 flex items-center justify-center text-red-400">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-200">Duel Bet Lost</span>
                    <span className="text-[8px] text-gray-500 font-mono">TRANS-DUEL-{userProfile.losses * 432 + 100}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-red-400 font-bold font-mono text-sm">-₦{(100).toLocaleString()}</span>
                  <span className="block text-[8px] text-red-500 font-mono uppercase tracking-wider">PAID</span>
                </div>
              </div>
            )}

            <div className="bg-slate-950 p-3.5 rounded-xl border border-gray-900/65 flex justify-between items-center">
              <div className="flex gap-2.5 items-center">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-200">Airdrop Welcome Faucet Credit</span>
                  <span className="text-[8px] text-gray-500 font-mono">TRANS-AC-0091</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-bold font-mono text-sm">+₦1,000.00</span>
                <span className="block text-[8px] text-emerald-500 font-mono uppercase tracking-wider">RECEIVED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-300 animate-out duration-200">
      
      {/* Return Navigation Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-900">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-mono transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Arena Lobby
        </button>
        <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-mono tracking-wider bg-slate-950 px-2.5 py-1 rounded-lg border border-gray-900">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
          <span>AUTHENTICATED SECURE PROFILE</span>
        </div>
      </div>

      {/* Grid Layout containing statistics */}
      <div className="grid md:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Avatar, Bio, Stats (5 cols) */}
        <div className="md:col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-5 text-center">
            
            {/* Visual Profile Avatar Block */}
            <div className="relative inline-block">
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-2xl mx-auto border-2 border-amber-500/50 bg-slate-950"
              />
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-amber-500 to-yellow-600 border border-gray-950 rounded-lg p-1">
                <Award className="w-4 h-4 text-slate-950" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-extrabold text-lg text-white">
                {userProfile.displayName}
              </h3>
              <p className="text-xs font-mono text-gray-500 leading-normal truncate px-4">
                {userProfile.email || 'SANDBOX GUEST SESSION'}
              </p>
              
              {/* Profile ID with copy button */}
              <div className="flex items-center justify-center gap-2 mt-2 bg-slate-950 border border-gray-900 rounded-xl px-3 py-1.5 w-max mx-auto">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">My Arena ID:</span>
                <span className="text-xs font-mono text-amber-500 font-extrabold tracking-wider">
                  {getFormattedUserId(userProfile.uid)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(getFormattedUserId(userProfile.uid));
                    setIdCopied(true);
                    setTimeout(() => setIdCopied(false), 2000);
                  }}
                  className="p-1 hover:text-white transition duration-150 rounded cursor-pointer"
                  title="Copy my ID"
                >
                  {idCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold">
              <Check className="w-3.5 h-3.5" /> Checked Arena Gladiator
            </div>

            {/* Current Large Naira Wallet and Arena Rating */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 rounded-xl p-3.5 border border-gray-900 text-center">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Balance</span>
                <span className="text-base font-mono font-extrabold text-emerald-400 mt-1 block truncate" title={`₦${userProfile.balance.toLocaleString()}`}>
                  ₦{userProfile.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-slate-950 rounded-xl p-3.5 border border-gray-900 text-center">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Rating</span>
                <span className="text-base font-mono font-extrabold text-amber-500 mt-1 block">
                  🛡️ {userProfile.rating ?? 1200}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Navigation Buttons & Stats Block (7 cols) */}
        <div className="md:col-span-12 lg:col-span-7 space-y-6">
          
          {/* Menu Action Cards: Withdraw and Clearance */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="font-display font-bold text-xs text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-800 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Financial Settlement Suite
            </h4>

            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveSubView('withdraw')}
                className="flex flex-col items-center justify-center text-center p-5 bg-slate-950 hover:bg-slate-900 border border-gray-900 hover:border-emerald-500/30 rounded-2xl transition cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 duration-150">
                  <Landmark className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-200">Withdraw Funds</span>
                <span className="text-[9px] text-gray-500 font-mono mt-1">Inter-bank CBN clearances</span>
              </button>

              <button
                onClick={() => setActiveSubView('clearance')}
                className="flex flex-col items-center justify-center text-center p-5 bg-slate-950 hover:bg-slate-900 border border-gray-900 hover:border-amber-500/30 rounded-2xl transition cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3 group-hover:scale-110 duration-150">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-200">Clearance Logs</span>
                <span className="text-[9px] text-gray-500 font-mono mt-1">Audit historic statement ledger</span>
              </button>
            </div>
          </div>

          {/* Detailed Chess Achievements */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="font-display font-bold text-xs text-gray-300 uppercase tracking-wider pb-2 border-b border-gray-800 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-500" />
              Arena Battle Record
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-gray-900 text-center">
                <span className="text-[10px] font-mono text-gray-400 block font-bold">WINS</span>
                <span className="text-xl font-mono font-bold text-emerald-400 mt-0.5 block">{userProfile.wins}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-gray-900 text-center">
                <span className="text-[10px] font-mono text-gray-400 block font-bold">LOSSES</span>
                <span className="text-xl font-mono font-bold text-red-400 mt-0.5 block">{userProfile.losses}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-gray-900 text-center">
                <span className="text-[10px] font-mono text-gray-400 block font-bold">DRAWS</span>
                <span className="text-xl font-mono font-bold text-zinc-400 mt-0.5 block">{userProfile.draws}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-gray-900 text-center">
                <span className="text-[10px] font-mono text-gray-400 block font-bold">WIN RATIO</span>
                <span className="text-xl font-mono font-bold text-yellow-500 mt-0.5 block">{winRatio}%</span>
              </div>
            </div>
          </div>

          {/* Top Arena Gladiators Rankings inside Profile */}
          <div className="block">
            <Leaderboard users={leaderboardUsers} currentUserId={currentUserId} onViewProfile={onViewProfile} />
          </div>

          {/* Logout Action: Always visible on Profile Page as requested */}
          {onLogout && (
            <div className="block mt-4 border-t border-gray-900 pt-4">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-950/20 hover:bg-red-950/35 border border-red-900/30 text-red-450 hover:text-red-400 font-mono text-xs rounded-xl transition cursor-pointer font-bold"
              >
                <LogOut className="w-4 h-4" />
                Logout Current Session
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
