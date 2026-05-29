import React, { useState } from 'react';
import { Search, Swords, Award, Coins, Timer, ShieldAlert, Check, X, Copy } from 'lucide-react';
import { UserProfile, getFormattedUserId } from '../types';

interface ActiveUsersPanelProps {
  users: UserProfile[];
  currentUserId: string;
  currentUserBalance: number;
  onSendChallenge: (
    challengedUserId: string,
    challengedName: string,
    betAmount: number,
    timeControl: string,
    colorPref: 'w' | 'b' | 'random'
  ) => Promise<void>;
  isLoading: boolean;
  onViewProfile?: (user: UserProfile) => void;
}

export const ActiveUsersPanel: React.FC<ActiveUsersPanelProps> = ({
  users,
  currentUserId,
  currentUserBalance,
  onSendChallenge,
  isLoading,
  onViewProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeChallengeUserId, setActiveChallengeUserId] = useState<string | null>(null);
  
  // Challenge parameters
  const [challengeBet, setChallengeBet] = useState<number>(50);
  const [challengeTime, setChallengeTime] = useState<string>('15m');
  const [challengeColor, setChallengeColor] = useState<'w' | 'b' | 'random'>('random');
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currentUserCopied, setCurrentUserCopied] = useState<boolean>(false);

  // Filter out the current user and filter by search term.
  // Active only when search is empty, but searchable across general directory when typing (offline or active)
  const activeDirectory = users
    .filter(u => u.uid !== currentUserId)
    .filter(u => {
      const formattedId = getFormattedUserId(u.uid);
      const isOnlineRightNow = u.status === 'online' && (Date.now() - (u.lastActiveAt || 0) < 180000);
      
      if (!searchTerm.trim()) {
        // Show active/online users by default
        return isOnlineRightNow;
      }
      
      // Search matches by name, email, or formatted short ID (e.g. NX-DS01)
      const isSearchById = formattedId.toLowerCase().includes(searchTerm.toLowerCase().trim());
      const isSearchByName = u.displayName.toLowerCase().includes(searchTerm.toLowerCase().trim());
      const isSearchByEmail = u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase().trim());
      
      return isSearchById || isSearchByName || isSearchByEmail;
    });

  const handleOpenChallenge = (userId: string) => {
    setActiveChallengeUserId(userId === activeChallengeUserId ? null : userId);
    setChallengeError(null);
    setSuccessMsg(null);
  };

  const handleTriggerChallenge = async (challengedUser: UserProfile) => {
    setChallengeError(null);
    setSuccessMsg(null);

    if (challengeBet < 0) {
      setChallengeError("Stake amount cannot be negative!");
      return;
    }

    if (currentUserBalance < challengeBet) {
      setChallengeError(
        `Insufficient balance. You have ₦${currentUserBalance.toFixed(2)}, but you need ₦${challengeBet.toFixed(2)} to host this challenge.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSendChallenge(
        challengedUser.uid,
        challengedUser.displayName,
        challengeBet,
        challengeTime,
        challengeColor
      );
      setSuccessMsg(`Duel challenge dispatched to ${challengedUser.displayName}!`);
      setTimeout(() => {
        setActiveChallengeUserId(null);
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      setChallengeError(err?.message || "Failed to issue duel challenge");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="active-gladiators-panel" className="space-y-6">
      
      {/* Header with count */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-gray-800">
        <div className="flex items-center space-x-2.5">
          <Swords className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="font-display font-bold text-base text-gray-150">Active Gladiators Directory</h3>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold block mt-0.5">
              Refreshed Lives • {users.filter(u => u.status === 'online' && (Date.now() - (u.lastActiveAt || 0) < 180000) && u.uid !== currentUserId).length} Active Now
            </span>
          </div>
        </div>

        {/* Search Input block */}
        <div className="relative max-w-xs w-full">
          <span className="absolute left-3 top-2.5 text-gray-500">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search by ID (e.g., NX-DS01) or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-gray-800 rounded-xl py-1.5 pl-9 pr-4 text-xs font-sans text-white focus:outline-none focus:border-amber-500 placeholder-zinc-650"
          />
        </div>
      </div>

      {/* Interactive copy-own-id banner */}
      <div className="bg-slate-950/80 border border-gray-850 rounded-xl p-3.5 flex justify-between items-center text-xs backdrop-blur-sm shadow-inner transition hover:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="text-gray-400 font-mono text-[10px] uppercase">My Arena short-id:</span>
          <span className="font-mono font-extrabold text-amber-500 tracking-wider text-xs">
            {getFormattedUserId(currentUserId)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(getFormattedUserId(currentUserId));
            setCurrentUserCopied(true);
            setTimeout(() => setCurrentUserCopied(false), 2000);
          }}
          className="px-3 py-1 bg-slate-900 hover:bg-[#1a2233] text-gray-350 hover:text-white border border-gray-800 rounded-lg text-[10px] font-mono transition cursor-pointer flex items-center gap-1.5 font-bold"
        >
          {currentUserCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span>Copy My ID</span>
            </>
          )}
        </button>
      </div>

      {activeDirectory.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-800 rounded-2xl bg-slate-950/10">
          <span className="text-2xl block mb-2 opacity-50">🛡️</span>
          <h4 className="font-display font-semibold text-xs text-zinc-500 uppercase tracking-wider">No Gladiators Matching</h4>
          <p className="text-[11px] text-gray-650 mt-1 max-w-[240px] mx-auto">
            Try adjusting search terms (e.g. search for "{getFormattedUserId(currentUserId)}" format) or wait for new champions to come online.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-1">
          {activeDirectory.map((u) => {
            const isOnline = u.status === 'online' && (Date.now() - (u.lastActiveAt || 0) < 180000);
            
            return (
              <div 
                key={u.uid}
                id={`gladiator-card-${u.uid}`}
                className="p-4 rounded-2xl border transition duration-150 space-y-3 flex flex-col justify-between bg-slate-950/45 border-gray-800 hover:border-gray-700/80"
              >
                {/* User Snapshot display */}
                <div className="flex justify-between items-start">
                  <div 
                    onClick={() => onViewProfile && onViewProfile(u)}
                    className="flex items-center space-x-2.5 min-w-0 cursor-pointer group/item"
                    title="Click to view Gladiator Profile"
                  >
                    <div className="relative flex-shrink-0">
                      <img 
                        src={u.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.uid}`}
                        alt={u.displayName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl bg-slate-900 border border-gray-800 transition group-hover/item:scale-105 duration-100"
                      />
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950 animate-pulse" />
                      )}
                    </div>
                    <div className="truncate min-w-0">
                      <span className="text-xs font-bold text-gray-200 group-hover/item:text-amber-500 transition block truncate" title={u.displayName}>
                        {u.displayName}
                      </span>
                      <span className="text-[10px] font-mono text-amber-500/80 block uppercase font-extrabold tracking-widest mt-0.5">
                        {getFormattedUserId(u.uid)}
                      </span>
                      <span className="text-[9px] font-mono text-gray-500 block truncate mt-0.5">
                        Rating: <span className="text-amber-500 font-bold">🛡️ {u.rating ?? 1200} Elo</span>
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900 px-2 py-0.5 rounded border border-gray-800 text-[9px] font-mono text-zinc-500 font-semibold self-center flex-shrink-0">
                    {u.wins}W - {u.losses}L
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenChallenge(u.uid)}
                  className="w-full py-1.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/30 text-amber-500 transition text-[11px] font-mono font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Swords className="w-3.5 h-3.5" />
                  Issue Board Challenge
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Pop-up modal overlay for Challenge Configuration */}
      {activeChallengeUserId && (() => {
        const challengedUser = users.find(u => u.uid === activeChallengeUserId);
        if (!challengedUser) return null;

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setActiveChallengeUserId(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white cursor-pointer transition p-1 rounded-lg bg-slate-905 hover:bg-slate-900 border border-gray-850"
                title="Close popup"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-3 pb-3 border-b border-gray-800">
                <img
                  src={challengedUser.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${challengedUser.uid}`}
                  alt={challengedUser.displayName}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl bg-slate-900 border border-gray-800"
                />
                <div>
                  <h4 className="font-display font-black text-sm text-gray-150">Challenge Gladiator</h4>
                  <p className="text-xs text-amber-500 font-bold">{challengedUser.displayName}</p>
                </div>
              </div>

              {/* Challenge Bet presets */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Choose Bet Size (₦)</label>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 10, 50, 200, 500].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setChallengeBet(amt)}
                      className={`py-1.5 rounded-md border text-[10px] font-bold font-mono transition cursor-pointer text-center ${
                        challengeBet === amt 
                          ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-extrabold shadow-inner' 
                          : 'bg-[#1f2937]/35 border-gray-900 text-gray-500 hover:border-gray-800'
                      }`}
                    >
                      {amt === 0 ? "No" : `₦${amt}`}
                    </button>
                  ))}
                </div>
                <div className="relative mt-2">
                  <span className="absolute left-2.5 top-2 text-xs text-gray-500 font-mono font-bold">₦</span>
                  <input
                    type="number"
                    min="0"
                    value={challengeBet}
                    onChange={(e) => setChallengeBet(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-gray-900 rounded-lg py-1.5 pl-6 pr-3 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Game clocks */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-400 uppercase block">Game Clock</label>
                  <select
                    value={challengeTime}
                    onChange={(e) => setChallengeTime(e.target.value)}
                    className="w-full bg-slate-950 border border-gray-900 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="5m">5 Min</option>
                    <option value="10m">10 Min</option>
                    <option value="15m">15 Min</option>
                    <option value="30m">30 Min</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>

                {/* Side Preference */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-400 uppercase block">Play Color</label>
                  <select
                    value={challengeColor}
                    onChange={(e) => setChallengeColor(e.target.value as any)}
                    className="w-full bg-slate-950 border border-gray-900 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="random">Random</option>
                    <option value="w">White</option>
                    <option value="b">Black</option>
                  </select>
                </div>
              </div>

              {challengeError && (
                <div className="p-2.5 bg-red-950/30 border border-red-900/30 text-red-500 text-[11px] rounded-lg animate-pulse">
                  {challengeError}
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-[11px] rounded-lg flex items-center gap-1.5 animate-bounce">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2 border-t border-gray-900">
                <button
                  type="button"
                  onClick={() => setActiveChallengeUserId(null)}
                  className="flex-1 py-2 rounded-xl border border-gray-805 text-xs text-gray-400 hover:text-white transition cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerChallenge(challengedUser)}
                  disabled={isSubmitting || !!successMsg}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 disabled:text-gray-500 transition text-slate-950 font-display font-black text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-amber-950/40"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Swords className="w-4 h-4" />
                      Challenge
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
