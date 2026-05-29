import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Search, 
  User, 
  Coins, 
  TrendingUp, 
  RotateCcw, 
  Sliders, 
  X, 
  Check, 
  Plus, 
  Minus,
  AlertTriangle,
  Award,
  Sparkles,
  RefreshCw,
  Mail,
  UserCheck,
  Database,
  ArrowRight,
  CheckCircle2,
  Terminal,
  Loader2
} from 'lucide-react';
import { UserProfile, getFormattedUserId } from '../types';

import { db as mainDb } from '../firebase';

interface AdminPanelProps {
  users: UserProfile[];
  currentUserId: string;
  onUpdateUserBalance: (userId: string, newBalance: number) => Promise<void>;
  onUpdateUserStats: (userId: string, wins: number, losses: number, draws: number, rating: number) => Promise<void>;
  onResetAllBalances: () => Promise<void>;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  users,
  currentUserId,
  onUpdateUserBalance,
  onUpdateUserStats,
  onResetAllBalances,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'migration'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Edit fields for selected user stats & balance
  const [editBalance, setEditBalance] = useState<string>('0');
  const [editWins, setEditWins] = useState<number>(0);
  const [editLosses, setEditLosses] = useState<number>(0);
  const [editDraws, setEditDraws] = useState<number>(0);
  const [editRating, setEditRating] = useState<number>(1200);

  // MIGRATION SECURE STATES
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ users: 0, notifications: 0, clearance: 0, withdrawals: 0, games: 0, messages: 0 });
  const [currentStats, setCurrentStats] = useState({ users: 0, notifications: 0, clearance: 0, withdrawals: 0, games: 0, messages: 0 });
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Filter users based on search
  const filteredUsers = users.filter(u => {
    const s = searchTerm.toLowerCase();
    const formattedId = getFormattedUserId(u.uid).toLowerCase();
    return (
      u.displayName?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.uid.toLowerCase().includes(s) ||
      formattedId.includes(s)
    );
  });

  // Handle selecting a user to edit
  const handleSelectUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditBalance(user.balance.toString());
    setEditWins(user.wins || 0);
    setEditLosses(user.losses || 0);
    setEditDraws(user.draws || 0);
    setEditRating(user.rating || 1200);
    setActionStatus(null);
  };

  // Submit single user balance update
  const handleSaveBalance = async () => {
    if (!selectedUser) return;
    const numericBalance = parseFloat(editBalance);
    if (isNaN(numericBalance) || numericBalance < 0) {
      setActionStatus({ type: 'error', text: 'Please enter a valid balance amount (0 or greater)' });
      return;
    }

    setIsProcessing(true);
    setActionStatus({ type: 'info', text: 'Updating account wallet balance...' });
    try {
      await onUpdateUserBalance(selectedUser.uid, numericBalance);
      setActionStatus({ type: 'success', text: `Wallets updated! New balance for ${selectedUser.displayName} is ₦${numericBalance.toLocaleString()}` });
      setSelectedUser({
        ...selectedUser,
        balance: numericBalance
      });
    } catch (err: any) {
      setActionStatus({ type: 'error', text: err.message || 'Balance updates failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit stats updates for user
  const handleSaveStats = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    setActionStatus({ type: 'info', text: 'Updating competitive rating dynamics...' });
    try {
      await onUpdateUserStats(
        selectedUser.uid,
        editWins,
        editLosses,
        editDraws,
        editRating
      );
      setActionStatus({ type: 'success', text: `Arena performance updated for ${selectedUser.displayName}` });
      setSelectedUser({
        ...selectedUser,
        wins: editWins,
        losses: editLosses,
        draws: editDraws,
        rating: editRating
      });
    } catch (err: any) {
      setActionStatus({ type: 'error', text: err.message || 'Rating sync failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick action presets for single balance
  const handleQuickAdjustBalance = async (adjustment: number, type: 'add' | 'set') => {
    if (!selectedUser) return;
    let targetVal = 0;
    if (type === 'add') {
      targetVal = Math.max(0, selectedUser.balance + adjustment);
    } else {
      targetVal = adjustment;
    }

    setIsProcessing(true);
    setActionStatus({ type: 'info', text: 'Executing quick capital routing...' });
    try {
      await onUpdateUserBalance(selectedUser.uid, targetVal);
      setEditBalance(targetVal.toString());
      setActionStatus({ type: 'success', text: `Adjusted ledger! New balance: ₦${targetVal.toLocaleString()}` });
      setSelectedUser({
        ...selectedUser,
        balance: targetVal
      });
    } catch (err: any) {
      setActionStatus({ type: 'error', text: err.message || 'Ledger routing failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle mass purge reset
  const handleMassPurge = async () => {
    setActionStatus(null);
    if (window.confirm("🚨 CRITICAL CORE SECURITY AUDIT WARNING:\nThis operation permanently rewrites all registered players' balances to ₦0.00 instantly.\nDo you wish to pursue?")) {
      setIsProcessing(true);
      setActionStatus({ type: 'info', text: 'Initializing global ledger reset cascade...' });
      try {
        await onResetAllBalances();
        setActionStatus({ type: 'success', text: 'Cascade successful! All existing player wallets cleared to ₦0.00.' });
        if (selectedUser) {
          setSelectedUser({
            ...selectedUser,
            balance: 0
          });
          setEditBalance('0');
        }
      } catch (err: any) {
        setActionStatus({ type: 'error', text: err.message || 'Global reset execution failed.' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Secure Database Hot Migration Handler (Server-Side Pipeline)
  const handleStartMigration = async () => {
    if (migrationStatus === 'running') return;
    setMigrationStatus('running');
    setLogs([
      '[System] Initializing Server-Side Multi-Project Migrator...',
      '[System] Pipelining connection requests securely to the cloud environment...'
    ]);
    
    const newStats = { users: 0, notifications: 0, clearance: 0, withdrawals: 0, games: 0, messages: 0 };
    setCurrentStats({ ...newStats });
    
    try {
      const response = await fetch("/api/admin/migrate-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const result = await response.json();
      
      if (result.logs && Array.isArray(result.logs)) {
        setLogs(result.logs);
      }
      
      if (result.success) {
        setMigrationStatus('success');
        if (result.stats) {
          setCurrentStats(result.stats);
          setStats(result.stats);
        }
      } else {
        setMigrationStatus('failed');
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Migration failed: ${result.error || 'Server error'}`]);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Network error: ${err.message}`]);
      setMigrationStatus('failed');
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-950/40 border border-red-500/20 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-red-450 tracking-tight font-sans">Administrative Control Council</h2>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Authorized Developers Only</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-900 border border-transparent hover:border-gray-800 rounded-lg transition text-gray-400 hover:text-white cursor-pointer animate-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* NEW TAB NAVIGATION TAB-BAR */}
      <div className="flex border border-gray-900 p-1 bg-slate-950 rounded-xl gap-2 max-w-md">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 text-center rounded-lg font-mono text-[10px] sm:text-xs uppercase font-bold tracking-wider transition duration-150 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-red-950/40 border border-red-500/20 text-red-400 shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Gladiator Registry
        </button>
        <button
          onClick={() => setActiveTab('migration')}
          className={`flex-1 py-2 text-center rounded-lg font-mono text-[10px] sm:text-xs uppercase font-bold tracking-wider transition duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'migration'
              ? 'bg-amber-950/40 border border-amber-500/20 text-amber-500 shadow-md'
              : 'text-gray-400 hover:text-amber-400'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Firebase Migrator
        </button>
      </div>

      {/* CONDITIONALLY RENDER REGISTRY TAB VS MIGRATOR TAB */}
      {activeTab === 'users' ? (
        <>
          {actionStatus && (
            <div className={`p-4 rounded-xl border font-mono text-xs flex justify-between items-start ${
              actionStatus.type === 'success' 
                ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' 
                : actionStatus.type === 'error'
                  ? 'bg-red-950/20 border-red-900/30 text-red-400'
                  : 'bg-zinc-950/40 border-gray-800 text-amber-500 animate-pulse'
            }`}>
              <div className="flex gap-2.5">
                <span className="font-bold">[{actionStatus.type.toUpperCase()}]</span>
                <span>{actionStatus.text}</span>
              </div>
              <button onClick={() => setActionStatus(null)} className="text-[10px] opacity-60 hover:opacity-100 font-bold ml-2">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* User Picker column list */}
            <div className="lg:col-span-12 xl:col-span-5 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter by Name, Email, or UID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950/80 border border-gray-900 rounded-xl py-2.5 pl-9 pr-4 text-xs font-mono placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition text-gray-200"
                />
                <Search className="w-4 h-4 text-gray-600 absolute left-3 top-3.5" />
              </div>

              <div className="bg-slate-950/40 border border-gray-900/80 rounded-xl p-1 max-h-[420px] overflow-y-auto space-y-1">
                <div className="p-2 border-b border-gray-900/60 flex justify-between items-center bg-slate-950/80 rounded-lg">
                  <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest pl-1">Accounts ({filteredUsers.length})</span>
                  <button 
                    onClick={handleMassPurge}
                    disabled={isProcessing}
                    className="text-[9px] font-mono font-bold bg-red-950/20 hover:bg-red-950/45 border border-red-900/40 text-red-450 hover:text-red-400 px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Reset All NGN
                  </button>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-600 font-mono">
                    No matching accounts registered.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUser?.uid === u.uid;
                    const formattedId = getFormattedUserId(u.uid);
                    return (
                      <div
                        key={u.uid}
                        onClick={() => handleSelectUser(u)}
                        className={`flex items-center justify-between p-2.5 rounded-lg transition border cursor-pointer ${
                          isSelected 
                            ? 'bg-red-950/15 border-red-500/40 hover:bg-red-950/20' 
                            : 'bg-transparent border-transparent hover:bg-slate-900/40 hover:border-gray-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <img 
                            src={u.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.uid}`}
                            alt={u.displayName}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-md bg-slate-800 border border-gray-800 flex-shrink-0 overlay-hidden"
                          />
                          <div className="truncate min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-semibold truncate ${isSelected ? 'text-red-400' : 'text-gray-200'}`}>
                                {u.displayName || 'Anonymous User'}
                              </span>
                              <span className="text-[8px] font-mono bg-slate-900 px-1 rounded text-zinc-500">
                                {formattedId}
                              </span>
                            </div>
                            <span className="text-[9px] text-gray-500 font-mono truncate block">
                              {u.email || 'No email attached'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-mono font-extrabold text-emerald-400 block">
                            ₦{u.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[8px] text-zinc-550 block font-mono">
                            {u.wins}W - {u.losses}L - {u.draws}D
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected User Management Workspace */}
            <div className="lg:col-span-12 xl:col-span-7">
              {selectedUser ? (
                <div className="bg-slate-950/30 border border-gray-900 rounded-xl p-5 space-y-6 animate-in fade-in duration-200">
                  
                  {/* User Identity Banner */}
                  <div className="flex flex-col sm:flex-row items-start justify-between pb-4 border-b border-gray-900/80 gap-4">
                    <div className="flex items-center space-x-3 min-w-0">
                      <img 
                        src={selectedUser.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${selectedUser.uid}`}
                        alt={selectedUser.displayName}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl bg-slate-800 border border-gray-800 shadow flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display font-extrabold text-sm text-white truncate">{selectedUser.displayName}</h3>
                          <span className="text-[9px] font-mono font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase">
                            {getFormattedUserId(selectedUser.uid)}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-gray-500 truncate flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-gray-650" /> {selectedUser.email || 'N/A'}
                        </p>
                        <p className="text-[9px] font-mono text-gray-650 truncate mt-0.5">
                          UID: {selectedUser.uid}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest leading-none">Live Wallet Balance</p>
                      <p className="text-lg font-mono font-extrabold text-emerald-400 tracking-tight mt-1">
                        ₦{selectedUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* SECTION A: Wallet Ledger Management */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-medium text-xs text-gray-300 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-emerald-500" />
                        Manage Wallet Balance (Ledger adjustments)
                      </h4>
                      <span className="text-[9px] font-mono text-gray-500">Fast presets below</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-8">
                        <div className="relative">
                          <span className="absolute left-3 top-3 font-mono text-xs text-gray-500 font-bold">₦</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={editBalance}
                            onChange={(e) => setEditBalance(e.target.value)}
                            className="w-full bg-slate-950 border border-gray-900 rounded-xl py-2.5 pl-8 pr-4 text-xs font-mono focus:outline-none focus:border-red-500/40 text-gray-200"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-4">
                        <button
                          onClick={handleSaveBalance}
                          disabled={isProcessing}
                          className="w-full h-full bg-emerald-600 hover:bg-emerald-500/95 text-slate-950 font-mono font-bold text-xs uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md py-2.5 sm:py-0"
                        >
                          <Check className="w-4 h-4" />
                          Set Balance
                        </button>
                      </div>
                    </div>

                    {/* Instant adjustment actions */}
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-900/60 pb-1">
                      <button
                        onClick={() => handleQuickAdjustBalance(1000, 'add')}
                        className="flex-1 bg-[#162031] hover:bg-[#1f2c42] border border-blue-900/30 text-blue-400 py-2 rounded-lg text-[10px] font-mono font-bold transition flex items-center justify-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> ₦1k
                      </button>
                      <button
                        onClick={() => handleQuickAdjustBalance(5000, 'add')}
                        className="flex-1 bg-[#162031] hover:bg-[#1f2c42] border border-blue-900/30 text-blue-400 py-2 rounded-lg text-[10px] font-mono font-bold transition flex items-center justify-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> ₦5k
                      </button>
                      <button
                        onClick={() => handleQuickAdjustBalance(10000, 'add')}
                        className="flex-1 bg-[#162031] hover:bg-[#1f2c42] border border-blue-900/30 text-blue-400 py-2 rounded-lg text-[10px] font-mono font-bold transition flex items-center justify-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> ₦10k
                      </button>
                      <button
                        onClick={() => handleQuickAdjustBalance(0, 'set')}
                        className="bg-red-950/25 hover:bg-red-950/45 border border-red-900/30 text-red-400 py-2 px-3 rounded-lg text-[10px] font-mono font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Set to ₦0
                      </button>
                    </div>
                  </div>

                  {/* SECTION B: Gladiator Performance Stats */}
                  <div className="space-y-4 pt-4 border-t border-gray-900">
                    <h4 className="font-display font-medium text-xs text-gray-300 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-amber-500" />
                      Performance Registry & Rating Model
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-950/80 border border-gray-900 rounded-xl p-2 text-center text-xs">
                        <label className="block text-[8px] font-mono text-gray-500 uppercase tracking-wider mb-1">Wins</label>
                        <input 
                          type="number" 
                          value={editWins} 
                          onChange={(e) => setEditWins(parseInt(e.target.value) || 0)}
                          className="w-full bg-transparent text-center font-mono font-extrabold text-sm text-emerald-400 focus:outline-none"
                        />
                      </div>
                      <div className="bg-slate-950/80 border border-gray-900 rounded-xl p-2 text-center text-xs">
                        <label className="block text-[8px] font-mono text-gray-500 uppercase tracking-wider mb-1">Losses</label>
                        <input 
                          type="number" 
                          value={editLosses} 
                          onChange={(e) => setEditLosses(parseInt(e.target.value) || 0)}
                          className="w-full bg-transparent text-center font-mono font-extrabold text-sm text-red-400 focus:outline-none"
                        />
                      </div>
                      <div className="bg-slate-950/80 border border-gray-900 rounded-xl p-2 text-center text-xs">
                        <label className="block text-[8px] font-mono text-gray-500 uppercase tracking-wider mb-1">Draws</label>
                        <input 
                          type="number" 
                          value={editDraws} 
                          onChange={(e) => setEditDraws(parseInt(e.target.value) || 0)}
                          className="w-full bg-transparent text-center font-mono font-extrabold text-sm text-blue-400 focus:outline-none"
                        />
                      </div>
                      <div className="bg-slate-950/80 border border-gray-900 rounded-xl p-2 text-center text-xs">
                        <label className="block text-[8px] font-mono text-gray-500 uppercase tracking-wider mb-1">ELO Rating</label>
                        <input 
                          type="number" 
                          value={editRating} 
                          onChange={(e) => setEditRating(parseInt(e.target.value) || 0)}
                          className="w-full bg-transparent text-center font-mono font-extrabold text-sm text-yellow-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      disabled={isProcessing}
                      onClick={handleSaveStats}
                      className="w-full py-2.5 bg-[#231a10] hover:bg-[#322312] border border-amber-500/30 text-amber-500 font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-inner"
                    >
                      <Award className="w-3.5 h-3.5" />
                      Update Competitive Registry Record
                    </button>
                  </div>

                </div>
              ) : (
                <div className="bg-slate-950/20 border border-gray-950 border-dashed rounded-2xl p-12 text-center flex flex-col justify-center items-center h-full min-h-[365px]">
                  <div className="w-12 h-12 bg-slate-950 border border-gray-900 rounded-2xl flex items-center justify-center mb-4 text-gray-600">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <p className="text-gray-400 text-xs font-mono max-w-sm leading-relaxed">
                    Select a Chess Gladiator from the account search ledger column on the left to initialize live document manipulation and ledger allocation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* FIREBASE LIVE MIGRATION TAB */
        <div className="bg-slate-950/40 border border-gray-900 rounded-2xl p-6 text-left space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-900">
            <div className="space-y-1">
              <span className="text-amber-500 font-mono text-[10px] uppercase tracking-widest font-extrabold">Dual-Project Target Bridge</span>
              <h3 className="text-white font-display font-extrabold text-base">Firebase Zero-Downtime Data Replicator</h3>
              <p className="text-gray-400 text-xs font-sans">
                Transfers user profiles, wallets, notification records, matches, and chats client-side under your active admin session credentials.
              </p>
            </div>
            <button
              onClick={handleStartMigration}
              disabled={migrationStatus === 'running'}
              className={`px-5 py-3 rounded-xl font-mono text-xs font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-lg select-none duration-150 active:scale-98 ${
                migrationStatus === 'running'
                  ? 'bg-amber-600/20 border border-amber-500/30 text-amber-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-amber-500/10'
              }`}
            >
              {migrationStatus === 'running' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing Databases...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Initiate Absolute Database Migration
                </>
              )}
            </button>
          </div>

          {/* SATELLITE BRIDGE ILLUSTRATION */}
          <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-4 py-2 px-1 rounded-xl bg-slate-950/20">
            <div className="md:col-span-2 bg-[#162031]/30 border border-blue-900/30 rounded-xl p-4 text-center">
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest block mb-1 font-bold">SOURCE DATABASE</span>
              <span className="text-xs font-semibold text-gray-200 block">pacific-impulse-rcf5x</span>
              <span className="text-[9px] font-mono text-zinc-500 block mt-1">Status: Read Active (Admin auth)</span>
            </div>
            
            <div className="flex flex-col items-center justify-center">
              <ArrowRight className="w-6 h-6 text-amber-500 animate-pulse hidden md:block" />
              <div className="h-6 w-[1.5px] bg-amber-500/50 block md:hidden animate-pulse my-1" />
            </div>

            <div className="md:col-span-2 bg-amber-950/10 border border-amber-500/20 rounded-xl p-4 text-center">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block mb-1 font-bold">TARGET DATABASE</span>
              <span className="text-xs font-semibold text-gray-200 block">chess-497dd (New)</span>
              <span className="text-[9px] font-mono text-zinc-500 block mt-1">Status: Awaiting Data Pipeline</span>
            </div>
          </div>

          {/* PROGRESS METRICS LEDGER */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-slate-950 border border-gray-900 rounded-xl p-3 text-center">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Profiles</span>
              <span className="text-sm font-mono font-extrabold text-white mt-1 block">
                {currentStats.users} <span className="text-zinc-650">/ {stats.users || '?'}</span>
              </span>
            </div>
            <div className="bg-slate-950 border border-gray-900 rounded-xl p-3 text-center">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Notifications</span>
              <span className="text-sm font-mono font-extrabold text-white mt-1 block">
                {currentStats.notifications} <span className="text-zinc-650">/ {stats.notifications || '?'}</span>
              </span>
            </div>
            <div className="bg-slate-950 border border-gray-900 rounded-xl p-3 text-center">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Ledgers</span>
              <span className="text-sm font-mono font-extrabold text-white mt-1 block">
                {currentStats.clearance} <span className="text-zinc-650">/ {stats.clearance || '?'}</span>
              </span>
            </div>
            <div className="bg-slate-950 border border-gray-900 rounded-xl p-3 text-center">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Limits</span>
              <span className="text-sm font-mono font-extrabold text-white mt-1 block">
                {currentStats.withdrawals} <span className="text-zinc-650">/ {stats.withdrawals || '?'}</span>
              </span>
            </div>
            <div className="bg-slate-950 border border-gray-900 rounded-xl p-3 text-center">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Matches</span>
              <span className="text-sm font-mono font-extrabold text-white mt-1 block">
                {currentStats.games} <span className="text-zinc-650">/ {stats.games || '?'}</span>
              </span>
            </div>
            <div className="bg-slate-950 border border-gray-900 rounded-xl p-3 text-center">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Chats</span>
              <span className="text-sm font-mono font-extrabold text-white mt-1 block">
                {currentStats.messages} <span className="text-zinc-650">/ {stats.messages || '?'}</span>
              </span>
            </div>
          </div>

          {/* VERIFY / SUCCESS NOTICE */}
          {migrationStatus === 'success' && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/25 rounded-xl text-emerald-400 font-mono text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-extrabold text-sm uppercase">Migration Pipeline fully completed !</span>
              </div>
              <p className="font-sans leading-relaxed text-[11px] text-emerald-300">
                Excellent work! All database users and game documents are fully backed up and cloned into your target project: <strong>chess-497dd</strong>. 
                Now, please let the developer know in the chat, and we will update the internal configuration files to point to this new project permanently.
              </p>
            </div>
          )}

          {/* CONSOLE TERMINAL FEED */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-mono tracking-wide text-gray-400 font-semibold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Real-time Migration logs & telemetry stream
            </label>
            <div className="w-full bg-slate-950 border border-gray-900 rounded-xl p-4 font-mono text-[10px] text-emerald-500 h-64 overflow-y-auto space-y-1.5 scrollbar-thin shadow-inner select-text">
              {logs.length === 0 ? (
                <div className="text-gray-600 italic">Waiting to hook data pipeline... Ready to replicate.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="leading-relaxed break-all">
                    {log}
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* FOOTER SECTION */}
      <div className="pt-4 border-t border-gray-900 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-gray-600 gap-2">
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-red-500" />
          Secured Firebase Write Enforcer (Active Session: Admin)
        </span>
        <span>Sovereign Chess &copy; 2026</span>
      </div>

    </div>
  );
};
