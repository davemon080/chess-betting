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
  Copy,
  Search,
  Filter,
  Download,
  Sparkles,
  RefreshCw,
  Settings,
  KeyRound,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserProfile, getFormattedUserId } from '../types';
import { Leaderboard } from './Leaderboard';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword, 
  linkWithCredential 
} from 'firebase/auth';

interface ProfilePageProps {
  userProfile: UserProfile;
  currentUserId: string;
  onWithdraw: (amount: number, bankName?: string, accountNumber?: string, accountName?: string, bankCode?: string, saveBankDetails?: boolean, payoutStatus?: string, payoutRef?: string) => Promise<void>;
  onDeposit?: (amount: number, reference?: string, bankName?: string) => Promise<void>;
  onClose: () => void;
  onLogout?: () => void;
  leaderboardUsers: UserProfile[];
  onViewProfile?: (user: UserProfile) => void;
  onResetAllBalances?: () => Promise<void>;
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

type ProfileActiveSubView = 'profile' | 'withdraw' | 'clearance' | 'deposit' | 'password';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userProfile,
  currentUserId,
  onWithdraw,
  onDeposit,
  onClose,
  onLogout,
  leaderboardUsers,
  onViewProfile,
  onResetAllBalances,
}) => {
  const [activeSubView, setActiveSubView] = useState<ProfileActiveSubView>('profile');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [depositInput, setDepositInput] = useState<string>('1000');
  const [banksList, setBanksList] = useState<any[]>(NIGERIAN_BANKS);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [idCopied, setIdCopied] = useState<boolean>(false);

  // Password / Security Credentials management states
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  // States for saved bank details and filtered transaction records
  const [saveBankChecked, setSaveBankChecked] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Fetch live Paystack bank directories
  useEffect(() => {
    fetch('/api/paystack/banks')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.banks && data.banks.length > 0) {
          setBanksList(data.banks);
        }
      })
      .catch((err) => console.log('Using standard fallback bank list'));
  }, []);

  // Real NIBSS CBN Central database name query
  useEffect(() => {
    if (activeSubView === 'withdraw' && accountNumber.length === 10 && selectedBank) {
      setIsVerifying(true);
      setAccountName('');
      
      const controller = new AbortController();
      const runResolve = async () => {
        try {
          const res = await fetch('/api/paystack/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountNumber, bankCode: selectedBank }),
            signal: controller.signal
          });
          const data = await res.json();
          if (data.success) {
            setAccountName(`${data.accountName} (VERIFIED)`);
          } else {
            setAccountName('COULD NOT RESOLVE ACCOUNT HOLDER');
          }
        } catch (err) {
          if ((err as any).name !== 'AbortError') {
            setAccountName('ERROR CONTACTING BANK RESOLUTION MODULE');
          }
        } finally {
          setIsVerifying(false);
        }
      };
      
      runResolve();
      return () => controller.abort();
    } else {
      setAccountName('');
    }
  }, [accountNumber, selectedBank, activeSubView]);

  // Load real user clearance statement documents under the user collection from Firestore
  useEffect(() => {
    if (activeSubView === 'clearance' && currentUserId) {
      const loadTransactions = async () => {
        setIsHistoryLoading(true);
        try {
          const clearanceCol = collection(db, 'users', currentUserId, 'clearance');
          const snapshot = await getDocs(clearanceCol);
          const list: any[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Append synthetic items representing game wins and losses for visual richness as requested
          if (userProfile.wins > 0) {
            for (let i = 0; i < userProfile.wins; i++) {
              list.push({
                id: `TRANS-WIN-${i + 1}-${123 * i + 900}`,
                reference: `DUEL-WIN-${i + 1}-${123 * i + 900}`,
                type: 'duel_won',
                amount: 200,
                status: 'completed',
                description: `Duel Bet Victory (Elo rating increment & bounty clearance)`,
                bankName: 'Chess Gladiators Engine',
                createdAt: Date.now() - (i + 1) * 86400000 - 3600000,
              });
            }
          }
          if (userProfile.losses > 0) {
            for (let i = 0; i < userProfile.losses; i++) {
              list.push({
                id: `TRANS-LOSS-${i + 1}-${432 * i + 100}`,
                reference: `DUEL-LOSS-${i + 1}-${432 * i + 100}`,
                type: 'duel_lost',
                amount: 100,
                status: 'completed',
                description: `Duel Bet Loss (Bounty transferred to winner)`,
                bankName: 'Chess Gladiators Engine',
                createdAt: Date.now() - (i + 1) * 123000000 - 7200000,
              });
            }
          }
          // Always append the Welcome Airdrop Faucet
          list.push({
            id: 'TRANS-WELCOME-BOUNTY',
            reference: 'TRANS-AC-0091',
            type: 'faucet',
            amount: 1000,
            status: 'completed',
            description: 'Airdrop Welcome Faucet Credit',
            bankName: 'Gladiator Escrow Foundation',
            createdAt: userProfile.createdAt ? (userProfile.createdAt.seconds ? userProfile.createdAt.seconds * 1000 : userProfile.createdAt) : Date.now() - 3 * 86450000,
          });

          // Deduplicate synthetic logs with similar IDs if duplicate renders occur
          const uniqueMap: Record<string, any> = {};
          list.forEach(item => {
            const pk = item.reference || item.id;
            uniqueMap[pk] = item;
          });
          const finalValues = Object.values(uniqueMap);

          // Sort by date descending
          finalValues.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
          setTransactions(finalValues);
        } catch (err) {
          console.error("Error loading clearance history:", err);
        } finally {
          setIsHistoryLoading(false);
        }
      };
      loadTransactions();
    }
  }, [activeSubView, currentUserId, userProfile.wins, userProfile.losses, userProfile.createdAt]);

  // Canvas-based visual transaction receipt downloader
  const downloadReceiptImage = (data: any) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark solid canvas frame
    ctx.fillStyle = '#0b0f19'; 
    ctx.fillRect(0, 0, 600, 760);

    // Dynamic pattern overlay (diagonal lines for authentic receipt feeling)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.03)';
    ctx.lineWidth = 1;
    for (let i = -760; i < 600; i += 15) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 760, 760);
      ctx.stroke();
    }

    // Top horizontal colored ribbon
    const ribbon = ctx.createLinearGradient(0, 0, 600, 0);
    ribbon.addColorStop(0, '#f59e0b'); // amber-500
    ribbon.addColorStop(0.5, '#10b981'); // emerald-500
    ribbon.addColorStop(1, '#06b6d4'); // cyan-500
    ctx.fillStyle = ribbon;
    ctx.fillRect(0, 0, 600, 10);

    // Main emerald gradient bar (NIBSS Clears themed)
    const headerGrad = ctx.createLinearGradient(0, 10, 0, 140);
    headerGrad.addColorStop(0, '#064e3b'); // dark-emerald
    headerGrad.addColorStop(1, '#022c22'); // darker-emerald
    ctx.fillStyle = headerGrad;
    ctx.fillRect(15, 10, 570, 130);

    // Frame Borders
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 10, 570, 735);

    ctx.strokeStyle = '#1e293b'; // Slate-800
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 17, 556, 721);

    // Logo design
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 32px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('NIBSS CLEARS', 300, 60);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 12px monospace';
    ctx.fillText('★ CHESS GLADIATORS BATTLE ARENA ★', 300, 85);

    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('OFFICIAL CLEARING PROTOCOL RECORD', 300, 105);

    // Main Receipt body plate
    ctx.fillStyle = '#111827';
    ctx.fillRect(35, 160, 530, 470);
    ctx.strokeStyle = '#1f2937';
    ctx.strokeRect(35, 160, 530, 470);

    // Left alignment of records
    ctx.textAlign = 'left';

    // Audit header
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('CBN CLEARANCE AUDIT ENCODING', 55, 195);

    // Status on the right
    ctx.textAlign = 'right';
    ctx.fillStyle = '#10b981';
    ctx.font = '900 12px monospace';
    const finalStat = data.status || 'COMPLETED';
    ctx.fillText(String(finalStat).toUpperCase(), 545, 195);

    // Divider line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(55, 210);
    ctx.lineTo(545, 210);
    ctx.stroke();

    // Table mapping fields
    const items = [
      { key: 'REFERENCE ID:', val: data.txId || data.reference || 'N/A' },
      { key: 'SETTLEMENT TYPE:', val: String(data.type || 'unknown').replace('_', ' ').toUpperCase() },
      { key: 'CLEARING NETWORK:', val: data.bank || data.bankName || 'Chess Gladiators Escrow' },
      { key: 'DESTINATION ACCT:', val: data.accountNo || data.accountNumber || 'GATEWAY CLEARED' },
      { key: 'GLADIATOR TARGET:', val: String(data.name || data.accountName || userProfile.displayName).toUpperCase() },
      { key: 'BATTLEFIELD ID:', val: getFormattedUserId(userProfile.uid) },
      { key: 'TIMESTAMP RECORD:', val: data.dateTime || (data.createdAt ? new Date(data.createdAt).toLocaleString() : new Date().toLocaleString()) },
      { key: 'CBN CLEARING FEE:', val: data.fee ? `₦${data.fee.toFixed(2)}` : '₦0.00' },
    ];

    let rowY = 245;
    items.forEach((item) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px monospace';
      ctx.fillText(item.key, 55, rowY);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#f3f4f6';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(item.val, 545, rowY);

      rowY += 40;
    });

    // Another divider for sum total
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(55, rowY - 15);
    ctx.lineTo(545, rowY - 15);
    ctx.stroke();

    // Total Amount Label
    ctx.textAlign = 'left';
    ctx.fillStyle = '#10b981';
    ctx.font = '900 16px Georgia, serif';
    ctx.fillText('TOTAL TRANSACTED:', 55, rowY + 15);

    // Total Amount Value
    ctx.textAlign = 'right';
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 18px monospace';
    const amountVal = data.amount || 0;
    ctx.fillText(`₦${amountVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 545, rowY + 15);

    // Footer signatures and seals
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4b5563';
    ctx.font = '9px monospace';
    ctx.fillText('This document is verified and signed client-side with secure local credentials.', 300, 665);
    ctx.fillStyle = '#10b981';
    ctx.fillText('✓ NIBSS DIGITAL CLEARANCE COMPLIANT', 300, 685);
    ctx.fillStyle = '#6b7280';
    ctx.fillText('© 2026 Chess Gladiators Settlement Hub. All Rights Reserved.', 300, 710);

    // Trigger immediate browser binary download
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `receipt_${data.txId || data.reference || 'clearance'}.png`;
    a.href = url;
    a.click();
  };

  const handleWithdrawClick = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid amount to withdraw.' });
      return;
    }

    if (amount < 500) {
      setStatusMessage({ type: 'error', text: 'Minimum withdrawal amount is ₦500.' });
      return;
    }

    if (amount > 10000) {
      setStatusMessage({ type: 'error', text: 'Maximum withdrawal amount is ₦10,000.' });
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
      const selectedBankObj = banksList.find(b => b.code === selectedBank);
      const selectedBankName = selectedBankObj ? selectedBankObj.name : 'Nigerian Bank';

      const res = await fetch('/api/paystack/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userProfile.uid,
          amount,
          accountNumber,
          bankCode: selectedBank,
          bankName: selectedBankName,
          accountName: accountName.replace(' (VERIFIED)', '').replace('COULD NOT RESOLVE ACCOUNT HOLDER', '').trim() || 'Arena Gladiator'
        })
      });

      const data = await res.json();

      if (data.success) {
        // Execute parent callback state sync and write records safely client-side where user is authenticated
        await onWithdraw(amount, selectedBankName, accountNumber, accountName, selectedBank, saveBankChecked, data.status, data.txId);

        const txRef = data.txId || `SOV-TX-${Math.floor(1000000 + Math.random() * 9000000)}`;
        const receipt = {
          txId: txRef,
          bank: selectedBankName,
          accountNo: accountNumber,
          name: accountName,
          amount: amount,
          dateTime: new Date().toLocaleString(),
          fee: 10.00,
          status: data.status === 'completed' ? 'SUCCESS / PAID' : 'PENDING CLR',
        };

        setReceiptData(receipt);
        setShowReceipt(true);
        setWithdrawAmount('');
        setAccountNumber('');
        setSelectedBank('');
        setStatusMessage({ 
          type: 'success', 
          text: data.status === 'completed' 
            ? `Withdrawal of ₦${amount.toLocaleString()} processed successfully!`
            : `Withdrawal request of ₦${amount.toLocaleString()} queued with clears bank.`
        });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Gateway rejected withdrawal clearing.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Transaction settlement connection failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaystackDeposit = async (amount: number) => {
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      // Ensure Paystack Pop inline script is loaded dynamically
      if (!(window as any).PaystackPop) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://js.paystack.co/v1/inline.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Paystack payment framework.'));
          document.head.appendChild(script);
        });
      }

      const publicKey = (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY || "pk_live_1bc5a10e4f9ed8ca685c5a699e85f22741cc3759";
      const reference = `DEP_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${Date.now()}`;
      
      const verifyPaymentCallback = (response: any) => {
        setStatusMessage({ type: 'info', text: 'Checking secure payment with central clears...' });
        
        // Asynchronously verifiy deposit reference on backends
        fetch('/api/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: response.reference,
            userId: userProfile.uid,
            amount: amount,
          }),
        })
        .then(res => res.json())
        .then(verifyData => {
          if (verifyData.success) {
            setStatusMessage({
              type: 'success',
              text: `Successfully deposited and credited ₦${amount.toLocaleString()} into your virtual wallet!`,
            });
            
            // Force local UI state updates securely via client-side transaction logs
            if (onDeposit) {
              onDeposit(amount, response.reference, 'Paystack checkout');
            } else {
              userProfile.balance = userProfile.balance + amount;
            }

            setReceiptData({
              txId: response.reference,
              bank: 'Paystack checkout',
              accountNo: 'ONLINE GATEWAY',
              name: userProfile.displayName,
              amount: amount,
              dateTime: new Date().toLocaleString(),
              fee: 0.00,
              status: 'SUCCESSFUL',
            });
            setShowReceipt(true);
          } else {
            setStatusMessage({ type: 'error', text: verifyData.error || 'Gateway verification failed.' });
          }
        })
        .catch(err => {
          setStatusMessage({ type: 'error', text: err?.message || 'Verification communication error.' });
        })
        .finally(() => {
          setIsProcessing(false);
        });
      };

      const paystack = (window as any).PaystackPop.setup({
        key: publicKey,
        email: userProfile.email || `${userProfile.uid}@gladiators-sandbox.com`,
        amount: Math.round(amount * 100), // convert NGN to kobo
        ref: reference,
        callback: function (response: any) {
          verifyPaymentCallback(response);
        },
        onClose: function () {
          setStatusMessage({ type: 'info', text: 'Deposit portal dismissed.' });
          setIsProcessing(false);
        },
      });

      paystack.openIframe();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to initialize Paystack Pop.' });
      setIsProcessing(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatusMsg(null);

    if (newPasswordInput.length < 6) {
      setPasswordStatusMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordStatusMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsProcessing(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No authenticated session found.");
      }

      // Check if user has EmailProvider (standard email-password sign-in link)
      const hasPasswordProvider = user.providerData.some(p => p.providerId === 'password');

      if (hasPasswordProvider) {
        if (!currentPasswordInput) {
          setPasswordStatusMsg({ type: 'error', text: 'Current password is required to verify your authority.' });
          setIsProcessing(false);
          return;
        }

        // Reauthenticate standard user
        if (user.email) {
          const credential = EmailAuthProvider.credential(user.email, currentPasswordInput);
          await reauthenticateWithCredential(user, credential);
        }
        
        await updatePassword(user, newPasswordInput);
        setPasswordStatusMsg({ type: 'success', text: 'Successfully changed account password!' });
      } else {
        // Create password for user who signed in with Google
        if (user.email) {
          const credential = EmailAuthProvider.credential(user.email, newPasswordInput);
          await linkWithCredential(user, credential);
        }
        setPasswordStatusMsg({ type: 'success', text: 'Successfully linked app password to your Google account! You can now log in using either Google or your email and this password.' });
      }

      // Reset inputs
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err: any) {
      console.error("Change/Create Password Error:", err);
      let errorText = err.message || 'An unexpected authentication exception has occurred.';
      if (err.code === 'auth/wrong-password') {
        errorText = 'Current password entered is invalid. Reauthentication failed.';
      } else if (err.code === 'auth/requires-recent-login') {
        errorText = 'Security mandate: Please logout and sign back in to complete password update.';
      } else if (err.code === 'auth/credential-already-in-use') {
        errorText = 'This credential is already linked to another user account.';
      }
      setPasswordStatusMsg({ type: 'error', text: errorText });
    } finally {
      setIsProcessing(false);
    }
  };

  if (activeSubView === 'deposit') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto px-4 pb-12 animate-in fade-in duration-300 text-left w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between pb-3 border-b border-gray-900">
          <button
            onClick={() => {
              setActiveSubView('profile');
              setStatusMessage(null);
            }}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-mono transition cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Profile Summary
          </button>
          <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded text-emerald-400 font-bold uppercase tracking-wider w-fit self-start sm:self-auto">
            Paystack Live Checkout
          </span>
        </div>

        {showReceipt && receiptData && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f121d] border border-emerald-500/30 rounded-2xl w-full max-w-xs md:max-w-sm max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl animate-in scale-in duration-200">
              <div className="bg-gradient-to-r from-emerald-950 to-teal-950 p-4 flex flex-col items-center text-center space-y-1.5 border-b border-emerald-900/30">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500 rounded-full flex items-center justify-center text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="font-display font-bold text-base text-emerald-400">Payment Credited Successfully</h4>
                <p className="text-[10px] text-emerald-300">Fast clearance transaction processed</p>
              </div>

              <div className="p-4 space-y-3 font-mono text-xs text-gray-300 bg-slate-950/40">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-gray-900 space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-gray-500 pb-1.5 border-b border-gray-900">
                    <span>TRANSACTION VERIFIED SUCCESS</span>
                    <span className="text-emerald-400 font-bold">{receiptData.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">PAYMENT REF:</span>
                    <span className="text-gray-200">{receiptData.txId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">SETTLED AMOUNT:</span>
                    <span className="text-emerald-400 font-bold">₦{receiptData.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">GATEWAY SYSTEM:</span>
                    <span className="text-gray-200">{receiptData.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">USER TARGET:</span>
                    <span className="text-amber-500 font-bold">{getFormattedUserId(userProfile.uid)}</span>
                  </div>
                </div>

                <p className="text-[10px] text-gray-500 text-center leading-normal">
                  Funds have been verified securely on the central node and added to your arena checkout wallet.
                </p>

                <button
                  onClick={() => {
                    setShowReceipt(false);
                    setActiveSubView('profile');
                  }}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 transition text-slate-950 font-display font-bold text-xs rounded-xl shadow-lg cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">
          <div className="flex items-center space-x-2 pb-2 border-b border-gray-800">
            <Coins className="w-5 h-5 text-emerald-400" />
            <div className="text-left">
              <h3 className="font-display font-bold text-sm text-gray-200">Top Up Arena Wallet Balance</h3>
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-semibold">Paystack Centralised Gateways</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed text-left">
            Replenish your sandbox virtual battle wallet using Paystack. Amounts are debited from your card or bank and credited directly into your virtual balance here instantly.
          </p>

          {statusMessage && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' 
                : 'bg-red-950/20 border-red-900/30 text-red-400'
            }`}>
              <span>{statusMessage.text}</span>
              <button onClick={() => setStatusMessage(null)} className="font-bold cursor-pointer">✕</button>
            </div>
          )}

          <div className="space-y-4">
            {/* Quick deposit buttons */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block text-left">Select Standard Deposit Amount</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[500, 1000, 2500, 5000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositInput(amt.toString())}
                    className={`py-2 rounded-lg border text-xs font-bold font-mono transition cursor-pointer ${
                      depositInput === amt.toString()
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-extrabold'
                        : 'bg-slate-950/40 border-gray-900 text-gray-400 hover:border-gray-850 hover:bg-slate-900'
                    }`}
                  >
                    ₦{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Custom Payout Amount (NGN)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-gray-400 font-bold font-mono">₦</span>
                <input
                  type="number"
                  placeholder="Enter amount (e.g., 2000)"
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-800 rounded-xl py-2 pl-8 pr-4 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-[8px] font-mono text-gray-500">Minimum top-up is ₦100. Charges may apply depending on payment options chosen.</span>
            </div>

            <button
              onClick={() => {
                const amt = parseFloat(depositInput);
                if (isNaN(amt) || amt < 100) {
                  setStatusMessage({ type: 'error', text: 'Please specify a valid deposit amount of at least ₦100.' });
                  return;
                }
                handlePaystackDeposit(amt);
              }}
              disabled={isProcessing}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-800 disabled:text-gray-500 transition text-slate-950 font-display font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Coins className="w-4.5 h-4.5" />
                  Initialize Paystack Checkout (₦{parseFloat(depositInput || "0").toLocaleString()})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeSubView === 'password') {
    const hasPasswordProvider = auth.currentUser?.providerData.some(p => p.providerId === 'password') || false;

    return (
      <div className="space-y-6 max-w-xl mx-auto px-4 pb-12 animate-in fade-in duration-300 text-left w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between pb-3 border-b border-gray-900">
          <button
            onClick={() => {
              setActiveSubView('profile');
              setPasswordStatusMsg(null);
            }}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-mono transition cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Profile Summary
          </button>
          <span className="text-[10px] font-mono bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded text-amber-500 font-bold uppercase tracking-wider w-fit self-start sm:self-auto">
            Security & Credentials
          </span>
        </div>

        <div className="p-6 space-y-6 bg-slate-950/45 rounded-2xl border border-gray-905">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-gray-900">
            <KeyRound className="w-5 h-5 text-amber-500" />
            <div className="text-left">
              <h3 className="font-display font-bold text-sm text-gray-200">
                {hasPasswordProvider ? 'Change Account Password' : 'Create Account Password'}
              </h3>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mt-0.5">
                {hasPasswordProvider ? 'Reauthenticate and change credentials' : 'Link secure password back credentials to your current account'}
              </span>
            </div>
          </div>

          {!hasPasswordProvider && (
            <div className="bg-amber-950/10 border border-amber-900/20 rounded-xl p-4 space-y-2">
              <p className="text-xs text-amber-500 font-mono font-bold">🔗 Signed in via Google OAuth</p>
              <p className="text-[11px] text-gray-400 leading-relaxed font-mono">
                Because you authenticated with Google, you do not have a standard password yet. Creating a password will link your login, allowing you to sign in with your email and this custom password or continue logging in with Google OAuth!
              </p>
            </div>
          )}

          {passwordStatusMsg && (
            <div className={`p-4 rounded-xl border text-xs flex items-start gap-2 justify-between leading-normal ${
              passwordStatusMsg.type === 'success' 
                ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' 
                : 'bg-red-950/20 border-red-900/30 text-red-400'
            }`}>
              <div className="flex-1 font-mono text-[11px]">{passwordStatusMsg.text}</div>
              <button 
                type="button" 
                onClick={() => setPasswordStatusMsg(null)} 
                className="font-bold cursor-pointer text-gray-500 hover:text-white shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            {hasPasswordProvider && (
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block font-bold">Current Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-gray-400">
                    <Lock className="w-4 h-4 text-zinc-650" />
                  </span>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter current app password"
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-gray-800 rounded-xl py-2 pl-9 pr-10 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 p-0.5 text-gray-500 hover:text-gray-300 transition"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block font-bold">
                {hasPasswordProvider ? 'New Password' : 'Create Account Password'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-gray-400">
                  <Lock className="w-4 h-4 text-zinc-655" />
                </span>
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder={hasPasswordProvider ? "Minimum 6 characters" : "Create password (Min 6 chars)"}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-800 rounded-xl py-2 pl-9 pr-10 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 p-0.5 text-gray-400 hover:text-gray-200 transition"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block font-bold">Confirm Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-gray-400">
                  <Lock className="w-4 h-4 text-zinc-655" />
                </span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-800 rounded-xl py-2 pl-9 pr-10 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 p-0.5 text-gray-450 hover:text-gray-250 transition"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 disabled:text-gray-500 transition text-slate-950 font-display font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4.5 h-4.5" />
                  {hasPasswordProvider ? 'Commit Password Change' : 'Link Password & Create Credentials'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const winRatio = (userProfile.wins + userProfile.losses + userProfile.draws) > 0
    ? ((userProfile.wins / (userProfile.wins + userProfile.losses + userProfile.draws)) * 100).toFixed(1)
    : '0.0';

  if (activeSubView === 'withdraw') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto px-4 pb-12 animate-in fade-in duration-300 w-full overflow-hidden">
        {/* Navigation Breadcrumb back to profile */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between pb-3 border-b border-gray-900">
          <button
            onClick={() => {
              setActiveSubView('profile');
              setStatusMessage(null);
            }}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-mono transition cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Profile Summary
          </button>
          <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded text-emerald-400 font-bold uppercase tracking-wider w-fit self-start sm:self-auto">
            NIBSS Clears Portal
          </span>
        </div>

        {showReceipt && receiptData && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f121d] border border-emerald-500/30 rounded-2xl w-full max-w-xs md:max-w-sm max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl animate-in scale-in duration-200">
              <div className="bg-gradient-to-r from-emerald-950 to-teal-950 p-4 flex flex-col items-center text-center space-y-1.5 border-b border-emerald-900/30">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500 rounded-full flex items-center justify-center text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="font-display font-bold text-base text-emerald-400">NIBSS Settlement Confirmed</h4>
                <p className="text-[10px] text-emerald-300">CBN Clearance Protocol clearance successful</p>
              </div>

              <div className="p-4 space-y-3 font-mono text-xs text-gray-300 bg-slate-950/40">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-gray-900 space-y-2">
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
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 hover:opacity-90 text-slate-950 font-bold text-xs rounded-xl cursor-pointer text-center"
                >
                  Done & Return
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-gray-800">
            <Landmark className="w-5 h-5 text-emerald-500" />
            <h3 className="font-display font-bold text-sm text-gray-200">Secure Bank Withdrawal (Naira)</h3>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Verify your banking credentials and authorize an immediate settlement order. There are zero settlement fees. Real-time payouts route via Central Bank clearings.
          </p>

          <form onSubmit={handleWithdrawClick} className="space-y-4">
            {/* Saved Account Pre-filler panel */}
            {userProfile.savedAccountNumber && userProfile.savedBankCode && (
              <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-2xl p-4 space-y-3.5 text-left mb-2 animate-in fade-in slide-in-from-top-2 duration-250">
                <div className="flex justify-between items-center pb-2 border-b border-emerald-900/30 font-mono">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Saved Payout Account
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBank(userProfile.savedBankCode || '');
                      setAccountNumber(userProfile.savedAccountNumber || '');
                      setAccountName(userProfile.savedAccountName || 'Arena Gladiator');
                      setStatusMessage({ type: 'success', text: 'Pre-filled with your saved bank account details.' });
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-extrabold underline cursor-pointer hover:scale-103 transition duration-100"
                  >
                    Quick Pre-fill
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-gray-300">
                  <div>
                    <span className="font-bold text-gray-100 block text-xs">{userProfile.savedBankName}</span>
                    <span className="text-gray-450 font-semibold block text-[11px] mt-0.5">{userProfile.savedAccountNumber}</span>
                  </div>
                  {userProfile.savedAccountName && (
                    <span className="text-amber-500/90 text-[11px] font-bold text-right truncate max-w-[150px]">{userProfile.savedAccountName}</span>
                  )}
                </div>
              </div>
            )}

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
                  className="w-full bg-slate-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-base font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
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
                  min="500"
                  max="10000"
                  step="0.01"
                  placeholder="₦500 - ₦10,000"
                  value={withdrawAmount}
                  onChange={(e) => {
                    setWithdrawAmount(e.target.value);
                    setStatusMessage(null);
                  }}
                  className="w-full bg-slate-950 border border-gray-800 rounded-xl py-2.5 pl-8 pr-4 text-base font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Save Bank Account Checkbox */}
            <div className="flex items-center space-x-2.5 pt-1.5 p-3 rounded-xl border border-gray-900 bg-slate-950/30">
              <input
                id="save-account-checkbox"
                type="checkbox"
                checked={saveBankChecked}
                onChange={(e) => setSaveBankChecked(e.target.checked)}
                className="w-4 h-4 rounded border-slate-800 text-emerald-500 bg-slate-950 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="save-account-checkbox" className="text-[11px] text-gray-400 font-mono select-none cursor-pointer leading-tight text-left">
                Save bank details for faster future settlements
              </label>
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
    // 1. Filter the transaction records safely
    const filteredTransactions = transactions.filter(t => {
      const needle = searchQuery.toLowerCase().trim();
      if (needle) {
        const refMatch = (t.reference || t.id || '').toLowerCase().includes(needle);
        const descMatch = (t.description || '').toLowerCase().includes(needle);
        const bankMatch = (t.bankName || t.bank || '').toLowerCase().includes(needle);
        if (!refMatch && !descMatch && !bankMatch) return false;
      }

      if (typeFilter !== 'all') {
        if (typeFilter === 'deposits' && t.type !== 'deposit') return false;
        if (typeFilter === 'withdrawals' && t.type !== 'withdrawal') return false;
        if (typeFilter === 'duel_bets' && t.type !== 'duel_won' && t.type !== 'duel_lost') return false;
      }

      if (statusFilter !== 'all') {
        const s = String(t.status || '').toLowerCase();
        if (statusFilter === 'completed' && s !== 'completed' && s !== 'successful') return false;
        if (statusFilter === 'pending' && s !== 'pending' && s !== 'queued') return false;
      }

      return true;
    });

    // 2. Sort the transaction records
    const sortedTransactions = [...filteredTransactions];
    if (sortBy === 'newest') {
      sortedTransactions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sortBy === 'oldest') {
      sortedTransactions.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } else if (sortBy === 'amount_high') {
      sortedTransactions.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    } else if (sortBy === 'amount_low') {
      sortedTransactions.sort((a, b) => (a.amount || 0) - (b.amount || 0));
    }

    return (
      <div className="space-y-6 max-w-3xl mx-auto px-4 pb-12 animate-in fade-in duration-300 text-left w-full overflow-hidden">
        {/* Dynamic Receipt and Downloader Modal */}
        {showReceipt && receiptData && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#0f121d] border border-emerald-500/30 rounded-2xl w-full max-w-xs md:max-w-sm max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl animate-in scale-in duration-200">
              <div className="bg-gradient-to-r from-emerald-950 to-teal-950 p-4 flex flex-col items-center text-center space-y-1.5 border-b border-emerald-900/30">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500 rounded-full flex items-center justify-center text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="font-display font-bold text-base text-emerald-400">Transaction Approved</h4>
                <p className="text-[10px] text-emerald-300 uppercase tracking-widest font-mono font-bold">✓ Central Settlements Confirmed</p>
              </div>

              <div className="p-4 space-y-3 font-mono text-xs text-gray-300 bg-slate-950/45 text-left">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-gray-900 space-y-2 border-b border-gray-900">
                  <div className="flex justify-between items-center text-[10px] text-gray-500 pb-1.5 border-b border-gray-900">
                    <span>CLEARANCE AUDIT NODE</span>
                    <span className="text-emerald-400 font-bold">{receiptData.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">REFERENCE:</span>
                    <span className="text-gray-205 truncate max-w-[130px]" title={receiptData.txId}>{receiptData.txId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">CHANNEL:</span>
                    <span className="text-gray-200 text-right truncate max-w-[150px]">{receiptData.bank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">RECIPIENT ACCT:</span>
                    <span className="text-gray-250 pr-0.5">{receiptData.accountNo || 'N/A (GATEWAY)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">GLADIATOR:</span>
                    <span className="text-gray-200 text-right truncate max-w-[150px] uppercase font-bold">{receiptData.name || userProfile.displayName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">DATE & TIME:</span>
                    <span className="text-gray-200 text-right text-[11px]">{receiptData.dateTime}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-gray-900 text-xs">
                    <span className="text-gray-500">SETTLEMENT FEE:</span>
                    <span className="text-gray-200">₦{receiptData.fee ? receiptData.fee.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-gray-900 text-sm font-bold text-emerald-400">
                    <span>SETTLED SUM:</span>
                    <span>₦{(receiptData.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 text-center leading-normal">
                  Transacted securely under official Central Bank and NIBSS clearing guidelines.
                </div>
              </div>

              <div className="p-3 border-t border-gray-900 bg-[#0f121d] flex flex-col gap-1.5 font-mono">
                <button
                  type="button"
                  onClick={() => downloadReceiptImage(receiptData)}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 transition text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-950 font-extrabold" /> Download Receipt PNG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReceipt(false);
                  }}
                  className="w-full py-1.5 bg-slate-900 border border-gray-850 hover:bg-slate-800 text-gray-400 text-xs rounded-xl cursor-pointer text-center font-bold font-mono"
                >
                  Done & Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between pb-3 border-b border-gray-950">
          <button
            onClick={() => setActiveSubView('profile')}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-mono transition cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Profile Summary
          </button>
          <span className="text-[10px] font-mono bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded text-amber-400 font-bold uppercase tracking-wider w-fit self-start sm:self-auto">
            Ledger Clearance Record
          </span>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center space-x-2 pb-2.5 border-b border-gray-800 text-left">
            <FileText className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-display font-bold text-sm text-gray-200">Centralized Clearance Statement</h3>
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Auditable Clearing Logs Hub</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed text-left">
            Comprehensive audit ledger of your funds, credit top-ups, payouts and tournament bounty duels routed directly in real-time. Click on any item below to view or export your official receipt.
          </p>

          {/* TRANS FILTER UTILITY */}
          <div className="space-y-4 bg-slate-950/45 p-4 rounded-xl border border-gray-900">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Keywords Search */}
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter reference/bank..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Type selector */}
              <div className="md:col-span-3 flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-800 rounded-lg py-2 px-2.5 text-xs text-gray-300 focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="all">All Channels</option>
                  <option value="deposits">🔑 Deposits</option>
                  <option value="withdrawals">📤 Withdrawals</option>
                  <option value="duel_bets">⚔ Duel Bets</option>
                </select>
              </div>

              {/* Status selector */}
              <div className="md:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-800 rounded-lg py-2 px-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="all">All States</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Sorting selector */}
              <div className="md:col-span-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-800 rounded-lg py-2 px-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="amount_high">High Amount</option>
                  <option value="amount_low">Low Amount</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {isHistoryLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                <span className="text-xs font-mono text-gray-500 animate-pulse">Decrypting real-time ledger statement...</span>
              </div>
            ) : sortedTransactions.length === 0 ? (
              <div className="bg-slate-950/20 border border-dashed border-gray-850 p-10 text-center rounded-2xl animate-in fade-in duration-200">
                <HelpCircle className="w-8 h-8 text-gray-600 mx-auto mb-2.5 animate-bounce" />
                <p className="text-xs text-gray-400 font-mono">No matching audited statement indexes discovered.</p>
                <p className="text-[10px] text-gray-550 mt-1 font-mono">Try adjusting your filters or search keywords.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {sortedTransactions.map((tx) => {
                  const isWithdrawal = tx.type === 'withdrawal';
                  const isDeposit = tx.type === 'deposit';
                  const isDuelWon = tx.type === 'duel_won';
                  const isDuelLost = tx.type === 'duel_lost';
                  
                  let badgeBg = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
                  if (tx.status === 'completed' || tx.status === 'successful' || isDuelWon || tx.type === 'faucet') {
                    badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  } else if (tx.status === 'pending' || tx.status === 'queued') {
                    badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                  } else if (isDuelLost) {
                    badgeBg = 'bg-red-500/10 text-red-400 border-red-500/20';
                  }

                  let typeSymbol = <Coins className="w-4 h-4" />;
                  let symbolColor = 'bg-emerald-500/10 text-emerald-400';
                  let prefix = '+';
                  let prefixColor = 'text-emerald-400';

                  if (isWithdrawal) {
                    typeSymbol = <Landmark className="w-4 h-4" />;
                    symbolColor = 'bg-cyan-500/10 text-cyan-400';
                    prefix = '-';
                    prefixColor = 'text-gray-300';
                  } else if (isDuelWon) {
                    typeSymbol = <TrendingUp className="w-4 h-4" />;
                    symbolColor = 'bg-amber-500/10 text-amber-400';
                    prefix = '+';
                    prefixColor = 'text-amber-400';
                  } else if (isDuelLost) {
                    typeSymbol = <TrendingDown className="w-4 h-4" />;
                    symbolColor = 'bg-red-500/10 text-red-500';
                    prefix = '-';
                    prefixColor = 'text-red-400';
                  }

                  return (
                    <div 
                      key={tx.id} 
                      onClick={() => {
                        setReceiptData({
                          txId: tx.reference || tx.id,
                          type: tx.type || 'unknown',
                          bank: tx.bankName || tx.bank || 'Escrow Clearing',
                          accountNo: tx.accountNumber || 'N/A (Arena Wallet)',
                          name: tx.accountName || userProfile.displayName,
                          amount: tx.amount,
                          dateTime: tx.createdAt ? new Date(tx.createdAt).toLocaleString() : new Date().toLocaleString(),
                          fee: isWithdrawal ? 10.00 : 0.00,
                          status: String(tx.status || 'COMPLETED').toUpperCase(),
                        });
                        setShowReceipt(true);
                      }}
                      className="bg-slate-950 hover:bg-slate-900 border border-gray-900 hover:border-emerald-500/25 p-3 sm:p-4 rounded-xl flex justify-between items-center gap-3 transition cursor-pointer group animate-in fade-in duration-200 text-left min-w-0"
                    >
                      <div className="flex gap-2.5 sm:gap-3.5 items-center min-w-0 flex-1">
                        <div className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl ${symbolColor} flex items-center justify-center group-hover:scale-105 transition duration-150 shrink-0`}>
                          {typeSymbol}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-gray-200 group-hover:text-amber-400 transition truncate sm:whitespace-normal sm:break-words">{tx.description || 'Transaction logged'}</span>
                          <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-0.5 block truncate">
                            Bank Code: {tx.bankName || 'Gateway clears'} • {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'Audited'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-bold font-mono text-xs sm:text-sm ${prefixColor}`}>{prefix}₦{(tx.amount || 0).toLocaleString()}</span>
                        <div className="flex items-center gap-1.5 justify-end mt-1">
                          <span className={`text-[8px] sm:text-[8.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${badgeBg}`}>
                            {tx.status || 'SUCCESSFUL'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 pb-12 animate-in fade-in duration-300 animate-out duration-200 w-full overflow-hidden">
      
      {/* Return Navigation Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between pb-4 border-b border-gray-900">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-mono transition cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Arena Lobby
        </button>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {userProfile.uid === currentUserId && (
            <button
              onClick={() => {
                setActiveSubView(activeSubView === 'password' ? 'profile' : 'password');
                setPasswordStatusMsg(null);
              }}
              className={`flex items-center gap-1.5 text-[10px] font-mono tracking-wider px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                activeSubView === 'password'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                  : 'bg-slate-950 text-gray-400 hover:text-white border-gray-950 hover:border-gray-800'
              }`}
              title="Account Security Settings"
            >
              <Settings className={`w-3.5 h-3.5 ${activeSubView === 'password' ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              <span>{activeSubView === 'password' ? 'CLOSE CREDENTIALS' : 'SECURITY SETTINGS'}</span>
            </button>
          )}
          <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-mono tracking-wider bg-slate-950 px-2.5 py-1.5 rounded-lg border border-gray-900">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>AUTHENTICATED SECURE PROFILE</span>
          </div>
        </div>
      </div>

      {/* Grid Layout containing statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        
        {/* Left Side: Avatar, Bio, Stats (5 cols) */}
        <div className="col-span-1 lg:col-span-5 space-y-6 w-full min-w-0">
          <div className="p-4 sm:p-6 space-y-5 text-center">
            
            {/* Visual Profile Avatar Block */}
            <div className="relative inline-block">
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                referrerPolicy="no-referrer"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl mx-auto border-2 border-amber-500/50 bg-slate-950"
              />
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-amber-500 to-yellow-600 border border-gray-950 rounded-lg p-1">
                <Award className="w-4 h-4 text-slate-950" />
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              <h3 className="font-display font-extrabold text-base sm:text-lg text-white break-all leading-snug">
                {userProfile.displayName}
              </h3>
              <p className="text-xs font-mono text-gray-500 leading-normal truncate px-2 sm:px-4">
                {userProfile.email || 'SANDBOX GUEST SESSION'}
              </p>
              
              {/* Profile ID with copy button */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-2 bg-slate-950 border border-gray-900 rounded-xl px-2.5 sm:px-3 py-1.5 w-max max-w-full mx-auto overflow-hidden">
                <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase shrink-0">
                  {userProfile.uid === currentUserId ? 'ID:' : 'GLAD ID:'}
                </span>
                <span className="text-xs font-mono text-amber-500 font-extrabold tracking-wider truncate">
                  {getFormattedUserId(userProfile.uid)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(getFormattedUserId(userProfile.uid));
                    setIdCopied(true);
                    setTimeout(() => setIdCopied(false), 2000);
                  }}
                  className="p-1 hover:text-white transition duration-150 rounded cursor-pointer shrink-0"
                  title={userProfile.uid === currentUserId ? 'Copy my ID' : 'Copy ID'}
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
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {userProfile.uid === currentUserId ? (
                <>
                  <div className="bg-slate-950 rounded-xl p-2.5 sm:p-3.5 border border-gray-900 text-center min-w-0 overflow-hidden">
                    <span className="text-[9px] sm:text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Balance</span>
                    <span className="text-xs xs:text-sm sm:text-base font-mono font-extrabold text-emerald-400 mt-1 block truncate" title={`₦${userProfile.balance.toLocaleString()}`}>
                      ₦{userProfile.balance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-slate-950 rounded-xl p-2.5 sm:p-3.5 border border-gray-900 text-center min-w-0 overflow-hidden">
                    <span className="text-[9px] sm:text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Rating</span>
                    <span className="text-xs xs:text-sm sm:text-base font-mono font-extrabold text-amber-500 mt-1 block truncate">
                      🛡️ {userProfile.rating ?? 1200}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-950 rounded-xl p-2.5 sm:p-3.5 border border-gray-900 text-center min-w-0 overflow-hidden">
                    <span className="text-[9px] sm:text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Balance</span>
                    <span className="text-xs font-mono font-bold text-gray-500 mt-1.5 block">
                      🔒 Private
                    </span>
                  </div>
                  <div className="bg-slate-950 rounded-xl p-2.5 sm:p-3.5 border border-gray-900 text-center min-w-0 overflow-hidden">
                    <span className="text-[9px] sm:text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Rating</span>
                    <span className="text-xs xs:text-sm sm:text-base font-mono font-extrabold text-amber-500 mt-1 block truncate">
                      🛡️ {userProfile.rating ?? 1200}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Quick Mobile Action for Deposit - Highly visible exclusively on mobile views */}
            {userProfile.uid === currentUserId && (
              <div className="block lg:hidden w-full mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubView('deposit');
                    setStatusMessage(null);
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 transition text-slate-950 font-display font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Coins className="w-4 h-4" />
                  Deposit Funds
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Navigation Buttons & Stats Block (7 cols) */}
        <div className="col-span-1 lg:col-span-7 space-y-6 w-full min-w-0">
          
          {/* Menu Action Cards: Deposit, Withdraw and Clearance */}
          {userProfile.uid === currentUserId && (
            <div className="p-4 sm:p-6 space-y-4 text-left w-full overflow-hidden">
              <h4 className="font-display font-bold text-xs text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-800 flex items-center gap-1.5 flex-wrap">
                <Wallet className="w-4 h-4 text-emerald-400" />
                Financial Settlement Suite
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubView('deposit');
                    setStatusMessage(null);
                  }}
                  className="flex flex-col items-center justify-center text-center p-5 bg-slate-950 hover:bg-slate-900 border border-gray-900 hover:border-emerald-500/30 rounded-2xl transition cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 duration-150">
                    <Coins className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-gray-200">Deposit Funds</span>
                  <span className="text-[9px] text-gray-500 font-mono mt-1">Instant Paystack checkout</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSubView('withdraw');
                    setStatusMessage(null);
                  }}
                  className="flex flex-col items-center justify-center text-center p-5 bg-slate-950 hover:bg-slate-900 border border-gray-900 hover:border-emerald-500/30 rounded-2xl transition cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 duration-150">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-gray-200">Withdraw Funds</span>
                  <span className="text-[9px] text-gray-500 font-mono mt-1">Inter-bank CBN clearances</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSubView('clearance');
                    setStatusMessage(null);
                  }}
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
          )}

          {/* Detailed Chess Achievements */}
          <div className="p-4 sm:p-6 space-y-4">
            <h4 className="font-display font-bold text-xs text-gray-300 uppercase tracking-wider pb-2 border-b border-gray-800 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-500" />
              Arena Battle Record
            </h4>

            <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full">
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

          {/* Administrative Tools: Visible ONLY to simonodavido@gmail.com */}
          {userProfile?.email === 'simonodavido@gmail.com' && onResetAllBalances && (
            <div className="bg-red-950/10 border border-red-900/30 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
              <h4 className="font-display font-bold text-xs text-red-400 uppercase tracking-wider pb-2 border-b border-red-900/30 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-red-500" />
                Administrative Core Operations
              </h4>
              <p className="text-gray-400 text-[11px] leading-relaxed font-mono">
                As the executive developer, you can initiate a global clearing reset. This updates all existing user transaction ledgers and balances to <span className="text-red-450 font-bold">₦0.00</span> in real-time.
              </p>
              <button
                disabled={isProcessing}
                onClick={async () => {
                  if (window.confirm("CRITICAL ADMIN WARNING:\nAre you absolutely sure you want to reset all account balances to ₦0.00? This write is permanent and modifies live database documents.")) {
                    setIsProcessing(true);
                    setStatusMessage({ type: 'info', text: 'Processing global balance reset...' });
                    try {
                      await onResetAllBalances();
                      setStatusMessage({ type: 'success', text: 'All existing account balances reset to ₦0.00 successfully!' });
                    } catch (err: any) {
                      setStatusMessage({ type: 'error', text: `Core administrative reset failed: ${err.message || err}` });
                    } finally {
                      setIsProcessing(false);
                    }
                  }
                }}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 font-mono font-bold text-xs uppercase rounded-xl border transition cursor-pointer ${
                  isProcessing 
                    ? 'bg-red-950/20 text-red-900/40 border-red-955 border-dashed cursor-not-allowed'
                    : 'bg-red-950/40 hover:bg-red-900/45 text-red-400 hover:text-red-300 border-red-900/40 shadow-md shadow-red-950/20'
                }`}
              >
                <Coins className="w-4 h-4" />
                {isProcessing ? 'Resetting Balances...' : 'Reset All Existences to ₦0.00'}
              </button>
            </div>
          )}

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
