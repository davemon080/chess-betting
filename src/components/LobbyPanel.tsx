import React, { useState } from 'react';
import { Plus, Users, Landmark, Zap, ShieldCheck, Coins, Timer, HelpCircle, Gamepad2, Copy, Check } from 'lucide-react';
import { ChessMatch, UserProfile } from '../types';

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy text:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 hover:bg-slate-800 rounded transition duration-200 text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer ml-2 border border-transparent hover:border-slate-700 bg-slate-900"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-[8px] text-emerald-400 font-bold font-mono">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 opacity-80" />
          <span className="text-[8px] text-gray-400 font-medium font-mono hover:text-white">Copy</span>
        </>
      )}
    </button>
  );
};

interface LobbyPanelProps {
  matches: ChessMatch[];
  userBalance: number;
  onCreateMatch: (betAmount: number, timeControl: string, colorPref: 'w' | 'b' | 'random') => Promise<void>;
  onJoinMatch: (matchId: string) => Promise<void>;
  isLoading: boolean;
  currentUserId?: string;
  onCancelMatch?: (matchId: string) => Promise<void>;
  onSpectateMatch?: (match: ChessMatch) => void;
  onStartComputerMatch?: () => void;
  users?: UserProfile[];
}

export const LobbyPanel: React.FC<LobbyPanelProps> = ({
  matches,
  userBalance,
  onCreateMatch,
  onJoinMatch,
  isLoading,
  currentUserId,
  onCancelMatch,
  onSpectateMatch,
  onStartComputerMatch,
  users = [],
}) => {
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [betAmount, setBetAmount] = useState<number | "">(50);
  const [timeControl, setTimeControl] = useState<string>('15m');
  const [colorPref, setColorPref] = useState<'w' | 'b' | 'random'>('random');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'live'>('open');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const isUserOnline = (userId: string | null) => {
    if (!userId) return false;
    const found = users.find(u => u.uid === userId);
    if (!found) return false;
    return found.status === 'online' && (Date.now() - (found.lastActiveAt || 0) < 180000);
  };

  const activeWaitingMatches = matches.filter(m => m.status === 'waiting' && !m.challengedUserId);
  
  // Exclude user's own games from live battles list, and filter by optional searched ID
  const liveMatches = matches.filter(m => {
    const isPlaying = m.status === 'playing';
    const notMyGame = m.whitePlayerId !== currentUserId && m.blackPlayerId !== currentUserId;
    if (!isPlaying || !notMyGame) return false;
    
    if (searchTerm) {
      return m.id.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    
    const actualBet = betAmount === "" ? 0 : betAmount;
    if (actualBet < 0) {
      setErrorText("Bet size cannot be negative!");
      return;
    }

    if (userBalance < actualBet) {
      setErrorText(`Insufficient balance. You have ₦${userBalance.toFixed(2)}, but you need ₦${actualBet.toFixed(2)} to host this match.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateMatch(actualBet, timeControl, colorPref);
      setShowCreateForm(false);
    } catch (err: any) {
      setErrorText(err?.message || "Error creating lobby room");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="battle-lobby-panel" className="space-y-6">
      
      {/* Lobby Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Gamepad2 className="w-5 h-5 text-emerald-500" />
          <h2 className="font-display font-bold text-base text-gray-150">Battle Lobby</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {onStartComputerMatch && !showCreateForm && (
            <button
              onClick={onStartComputerMatch}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-[#1a2233] text-amber-500 border border-gray-800 font-display font-medium text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-md"
            >
              🎮 Play Computer
            </button>
          )}
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 font-display font-extrabold text-xs px-4 py-2 rounded-xl transition hover:opacity-90 active:scale-95 cursor-pointer shadow-lg shadow-emerald-950/20"
            >
              <Plus className="w-4 h-4" />
              Create Match
            </button>
          )}
        </div>
      </div>

      {/* Lobby Tab Choice */}
      {!showCreateForm && (
        <div className="flex bg-slate-950/80 p-1 rounded-xl border border-gray-900 max-w-sm">
          <button
            type="button"
            onClick={() => {
              setActiveTab('open');
              setSearchTerm('');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
              activeTab === 'open'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Open Bets ({activeWaitingMatches.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('live');
              setSearchTerm('');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
              activeTab === 'live'
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/10'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Live Battles ({liveMatches.length})
          </button>
        </div>
      )}

      {showCreateForm ? (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-950/60 rounded-2xl border border-gray-800/80 space-y-5 animate-in slide-in-from-top duration-200">
          <div className="flex justify-between items-center pb-2">
            <h3 className="font-display font-bold text-xs text-amber-500 uppercase tracking-widest">Setup New Stakes</h3>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setErrorText(null);
              }}
              className="text-gray-400 hover:text-white text-xs font-mono"
            >
              Cancel
            </button>
          </div>

          {/* Bet size input */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Bet Size (Virtual Naira)</label>
            <div className="flex gap-2">
              {[0, 10, 50, 200, 500].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBetAmount(amt)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-bold font-mono transition cursor-pointer ${
                    betAmount === amt 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                      : 'bg-[#1f2937]/50 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  {amt === 0 ? 'No Bet' : `₦${amt}`}
                </button>
              ))}
            </div>
            <div className="relative mt-2">
              <span className="absolute left-3 top-2.5 text-xs text-gray-500 font-mono font-bold">₦</span>
              <input
                type="number"
                min="0"
                value={betAmount === 0 && isFocused ? "" : betAmount}
                onFocus={() => {
                  if (betAmount === 0 || betAmount === 50) setBetAmount("");
                  setIsFocused(true);
                }}
                onBlur={() => {
                  setIsFocused(false);
                  if (betAmount === "") setBetAmount(0);
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setBetAmount('');
                  } else {
                    setBetAmount(Math.max(0, parseFloat(val) || 0));
                  }
                }}
                className="w-full bg-slate-950 border border-gray-800 rounded-xl py-2 pl-7 pr-4 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Time constraints */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Game Clocks</label>
              <select
                value={timeControl}
                onChange={(e) => setTimeControl(e.target.value)}
                className="w-full bg-slate-950 border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="5m">5 Min (Blitz)</option>
                <option value="10m">10 Min (Rapid)</option>
                <option value="15m">15 Min (Standard)</option>
                <option value="30m">30 Min (Classical)</option>
                <option value="unlimited">Unlimited Clocks</option>
              </select>
            </div>

            {/* Side preference */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Play Side</label>
              <div className="grid grid-cols-3 gap-1">
                {(['w', 'random', 'b'] as const).map(colorVal => {
                  let label = 'Random';
                  if (colorVal === 'w') label = 'White';
                  if (colorVal === 'b') label = 'Black';

                  return (
                    <button
                      key={colorVal}
                      type="button"
                      onClick={() => setColorPref(colorVal)}
                      className={`py-2 rounded-lg border text-[10px] font-bold transition uppercase tracking-wide cursor-pointer ${
                        colorPref === colorVal
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                          : 'bg-[#1f2937]/50 border-gray-800 text-gray-400 hover:border-gray-750'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {errorText && (
            <div className="p-2.5 bg-red-950/20 border border-red-900/40 text-red-500 text-[11px] rounded-lg">
              {errorText}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 disabled:text-gray-500 transition text-slate-950 font-display font-extrabold text-xs py-2.5 rounded-xl cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <span className="w-4.5 h-4.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Coins className="w-4 h-4" />
                {(!betAmount || betAmount === 0) ? 'Start Game' : 'Deduct & Authorize Stakes'}
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          
          {/* Specific Match ID Search bar displayed on Live Battles */}
          {activeTab === 'live' && (
            <div className="bg-slate-950/65 p-3.5 rounded-xl border border-gray-900 shadow-inner flex flex-col sm:flex-row gap-2.5 items-center">
              <div className="flex-grow w-full">
                <input
                  type="text"
                  placeholder="Enter specific Match ID (e.g. nhf-dnd-ncjd)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value.toLowerCase().trim())}
                  className="w-full bg-[#111827] border border-gray-850 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono text-base sm:text-xs"
                />
              </div>
              <button
                onClick={() => {
                  if (!searchTerm) return;
                  const match = matches.find(m => m.id === searchTerm);
                  if (match) {
                    if (match.status === 'playing') {
                      onSpectateMatch && onSpectateMatch(match);
                    } else if (match.status === 'waiting') {
                      onJoinMatch(match.id);
                    }
                  } else {
                    alert("No live matches matching this ID were found. Enter a valid ID.");
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 text-slate-950 font-display font-bold text-xs rounded-xl cursor-pointer hover:bg-amber-450 transition text-center shadow"
              >
                Join / Spectate
              </button>
            </div>
          )}

          {activeTab === 'open' ? (
            activeWaitingMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border border-dashed border-gray-800 rounded-2xl text-center space-y-3 bg-slate-950/20">
                <div className="w-12 h-12 bg-[#1f2937] rounded-xl flex items-center justify-center border border-gray-800">
                  <Users className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs text-gray-400 uppercase tracking-widest">Lobby is Clear</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-[260px]">
                    No active matches awaiting players. Be the first to establish a board!
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="text-xs text-amber-500 font-mono font-bold hover:underline py-1 px-3 bg-amber-500/5 hover:bg-amber-500/10 rounded-lg"
                >
                  + Propose Game Duel
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                {activeWaitingMatches.map((m) => {
                  const isHost = m.creatorId === currentUserId;
                  const sideName = m.whitePlayerId ? 'White Pieces' : 'Black Pieces';
                  const creatorName = m.whitePlayerId ? m.whitePlayerName : m.blackPlayerName;

                  return (
                    <div 
                      key={m.id}
                      className="p-4 bg-slate-950/60 border border-gray-800 hover:border-gray-700 transition rounded-2xl space-y-4 shadow-xl"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          <div className="relative">
                            <img 
                              src={m.whitePlayerPhoto || m.blackPlayerPhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${m.creatorId}`}
                              alt="avatar"
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-lg bg-slate-800 border border-gray-800"
                            />
                            {isUserOnline(m.creatorId) ? (
                              <span className="absolute -bottom-0.5 -right-0.5 block h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-slate-950 animate-pulse" title="Creator Online" />
                            ) : (
                              <span className="absolute -bottom-0.5 -right-0.5 block h-2 w-2 rounded-full bg-gray-600 ring-1 ring-slate-950" title="Creator Offline" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-200 block truncate max-w-[120px]">
                              {creatorName}
                            </span>
                            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block">
                              Matches Creator {isHost && "(You)"}
                            </span>
                          </div>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold text-emerald-400">
                          {m.betAmount === 0 ? 'FREE DUEL' : `₦${m.betAmount.toFixed(0)} STAKE`}
                        </div>
                      </div>

                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-gray-900 flex justify-between items-center text-[10px] font-mono text-gray-450">
                        <span className="text-gray-550">LOBBY ID:</span>
                        <div className="flex items-center">
                          <span className="font-bold text-amber-500 tracking-wider bg-slate-900 px-1.5 py-0.5 rounded select-all selection:bg-amber-500/20">{m.id}</span>
                          <CopyButton text={m.id} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-2 rounded-xl text-[10px] font-mono text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Timer className="w-3.5 h-3.5 text-amber-500/70" />
                          <span>Clocks: {m.timeControl === 'unlimited' ? 'None' : m.timeControl}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Landmark className="w-3.5 h-3.5 text-amber-500/70" />
                          <span>Host pieces: {m.whitePlayerId ? 'White' : 'Black'}</span>
                        </div>
                      </div>

                      {isHost ? (
                        <button
                          onClick={() => onCancelMatch && onCancelMatch(m.id)}
                          disabled={isLoading}
                          className="w-full bg-red-950/40 hover:bg-red-950/60 border border-red-900/30 text-red-400 hover:text-red-300 transition font-display font-semibold text-[11px] py-1.5 rounded-xl h-9 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          {m.betAmount === 0 ? 'Cancel Match Lobby' : 'Cancel Stakes & Refund'}
                        </button>
                      ) : (
                        <button
                          onClick={() => onJoinMatch(m.id)}
                          disabled={isLoading}
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 hover:opacity-90 disabled:bg-gray-800 disabled:text-gray-500 transition font-display font-extrabold text-[11px] py-1.5 rounded-xl h-9 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          {isLoading ? 'Joining...' : (m.betAmount === 0 ? 'Join Match' : 'Match Bet & Start')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            liveMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-800 rounded-2xl text-center space-y-3 bg-slate-950/20">
                <div className="w-12 h-12 bg-[#1f2937] rounded-xl flex items-center justify-center border border-gray-800">
                  <Gamepad2 className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs text-gray-400 uppercase tracking-widest">No Active Battles</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-[260px]">
                    No duel-boards are currently in direct confrontation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1 animate-in fade-in duration-200">
                {liveMatches.map((m) => {
                  const isEngaged = m.whitePlayerId === currentUserId || m.blackPlayerId === currentUserId;

                  return (
                    <div 
                      key={m.id}
                      className="p-3 bg-slate-950/60 border border-gray-850 hover:border-gray-750 transition rounded-xl space-y-3 shadow-md flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-duration-1000"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest font-extrabold truncate">
                              Conflict Live 
                            </span>
                          </div>
                          <div className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-mono font-bold text-amber-400 shrink-0">
                            {m.betAmount ? `₦${m.betAmount.toFixed(0)} STAKE` : 'FREE DUEL'}
                          </div>
                        </div>

                        {/* Responsive Showdown Versus Block */}
                        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-1 font-sans text-xs w-full">
                          <div className="flex items-center justify-between bg-slate-900/90 border border-gray-800/80 px-2 py-1 rounded-lg truncate flex-1" title={m.whitePlayerName || 'White'}>
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="shrink-0 text-[10px]">⚪</span>
                              <span className="text-gray-155 font-bold truncate text-[11px]">{m.whitePlayerName || 'White'}</span>
                            </div>
                            {m.whitePlayerId && (
                              <span 
                                className={`h-1.5 w-1.5 rounded-full shrink-0 ${isUserOnline(m.whitePlayerId) ? 'bg-emerald-500 animate-pulse' : 'bg-gray-700'}`}
                                title={isUserOnline(m.whitePlayerId) ? 'Online' : 'Offline'}
                              />
                            )}
                          </div>
                          <span className="text-[9px] text-amber-500 font-mono font-extrabold uppercase shrink-0 text-center align-middle px-0.5 select-none">VS</span>
                          <div className="flex items-center justify-between bg-slate-900/90 border border-gray-800/80 px-2 py-1 rounded-lg truncate flex-1" title={m.blackPlayerName || 'Black'}>
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="shrink-0 text-[10px]">⚫</span>
                              <span className="text-gray-155 font-bold truncate text-[11px]">{m.blackPlayerName || 'Black'}</span>
                            </div>
                            {m.blackPlayerId && (
                              <span 
                                className={`h-1.5 w-1.5 rounded-full shrink-0 ${isUserOnline(m.blackPlayerId) ? 'bg-emerald-500 animate-pulse' : 'bg-gray-700'}`}
                                title={isUserOnline(m.blackPlayerId) ? 'Online' : 'Offline'}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2.5 border-t border-gray-905/30">
                        <div className="bg-slate-950/40 p-2 py-1 rounded-lg border border-gray-905/70 flex justify-between items-center text-[10px] font-mono text-gray-450 gap-2 min-w-0">
                          <span className="text-gray-550 shrink-0 text-[9px]">MATCH ID:</span>
                          <div className="flex items-center min-w-0 flex-1 justify-end gap-1">
                            <span 
                              className="font-bold text-amber-500 tracking-wider bg-slate-900 px-1 py-0.5 rounded select-all selection:bg-amber-500/20 truncate text-[9px] text-right"
                              title={m.id}
                            >
                              {m.id}
                            </span>
                            <CopyButton text={m.id} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-0.5 bg-slate-900/60 p-1.5 rounded-lg text-[9px] font-mono text-gray-400 items-center justify-between text-center">
                          <div className="flex flex-col xxs:flex-row items-center justify-center gap-0.5 xxs:gap-1">
                            <Timer className="w-3 h-3 text-amber-500/70" />
                            <span>{m.timeControl === 'unlimited' ? 'None' : m.timeControl}</span>
                          </div>
                          <div className="flex flex-col xxs:flex-row items-center justify-center gap-0.5 xxs:gap-1 border-x border-gray-800/50">
                            <Coins className="w-3 h-3 text-amber-500/70" />
                            <span>{m.moves?.length || 0} MV</span>
                          </div>
                          <div className="flex flex-col xxs:flex-row items-center justify-center gap-0.5 xxs:gap-1 text-cyan-400 font-bold">
                            <span>👥 {m.spectatorsList?.length || 0}</span>
                          </div>
                        </div>

                        {isEngaged ? (
                          <button
                            onClick={() => onJoinMatch(m.id)}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 transition font-display font-extrabold text-[10px] py-1 rounded-lg h-8 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Resume Your Game
                          </button>
                        ) : (
                          <button
                            onClick={() => onSpectateMatch && onSpectateMatch(m)}
                            className="w-full bg-slate-900 hover:bg-[#1a2233] border border-gray-800 text-gray-200 hover:text-white transition font-display font-semibold text-[10px] py-1 rounded-lg h-8 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Spectate Board
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* Trust guarantees badge line */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-900 text-[9px] font-mono text-gray-500 text-center">
        <span className="flex items-center gap-1 justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" /> Multi-user Live
        </span>
        <span className="flex items-center gap-1 justify-center">
          <Zap className="w-3.5 h-3.5 text-amber-500/70" /> Rapid Turns
        </span>
        <span className="flex items-center gap-1 justify-center">
          <HelpCircle className="w-3.5 h-3.5 text-teal-500/70" /> Escrow Safe
        </span>
      </div>
    </div>
  );
};
