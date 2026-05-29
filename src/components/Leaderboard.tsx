import React from 'react';
import { Trophy, Star, TrendingUp, Award, ShieldAlert } from 'lucide-react';
import { UserProfile } from '../types';

interface LeaderboardProps {
  users: UserProfile[];
  currentUserId?: string;
  onViewProfile?: (user: UserProfile) => void;
}

interface Tier {
  name: string;
  value: number; // Primary weight for sorting
  color: string;
  badgeClass: string;
}

// Map competitive Elo ratings dynamically to standard high-fidelity tournament divisions
export function getUserTier(rating: number): Tier {
  const r = rating ?? 1200;
  if (r >= 1800) {
    return { 
      name: 'Grandmaster', 
      value: 4, 
      color: 'text-amber-400 text-shadow-sm', 
      badgeClass: 'bg-amber-500/12 border border-amber-500/30 text-amber-400' 
    };
  }
  if (r >= 1500) {
    return { 
      name: 'Master', 
      value: 3, 
      color: 'text-purple-400', 
      badgeClass: 'bg-purple-500/12 border border-purple-500/30 text-purple-400' 
    };
  }
  if (r >= 1200) {
    return { 
      name: 'Expert', 
      value: 2, 
      color: 'text-cyan-400', 
      badgeClass: 'bg-cyan-500/12 border border-cyan-500/30 text-cyan-400' 
    };
  }
  return { 
    name: 'Challenger', 
    value: 1, 
    color: 'text-zinc-500', 
    badgeClass: 'bg-zinc-805/30 border border-zinc-800 text-zinc-400' 
  };
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ users, currentUserId, onViewProfile }) => {
  // Sort players primarily by rank (explicit rank property or rating/tier fallback), 
  // then by wins when ranks are identical (descending), and by losses if wins are also identical (ascending, fewer losses is better)
  const sorted = [...users]
    .sort((a, b) => {
      const rankValA = a.rank !== undefined && a.rank !== null ? Number(a.rank) : (a.rating || 1200);
      const rankValB = b.rank !== undefined && b.rank !== null ? Number(b.rank) : (b.rating || 1200);
      
      if (rankValB !== rankValA) {
        return rankValB - rankValA;
      }
      
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      
      return a.losses - b.losses;
    })
    .slice(0, 30);

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col h-full select-none">
      <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-4">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-display font-bold text-base text-gray-150">Top Arena Gladiators</h3>
        </div>
        <span className="text-[9px] font-mono bg-slate-950 px-2 py-0.5 border border-gray-900 rounded-full text-gray-500 uppercase tracking-widest">
          Season 1
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[500px]">
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500 font-mono">
            Scanning combat rosters...
          </div>
        ) : (
          sorted.map((u, idx) => {
            const isMe = u.uid === currentUserId;
            const rank = idx + 1;
            const tier = getUserTier(u.rating || 1200);
            
            let badgeBg = "bg-slate-900 text-gray-400 border border-gray-800/40";
            if (rank === 1) badgeBg = "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 shadow-[0_0_8px_rgba(234,179,8,0.1)]";
            if (rank === 2) badgeBg = "bg-zinc-400/10 text-zinc-400 border border-zinc-400/30";
            if (rank === 3) badgeBg = "bg-amber-700/10 text-amber-700 border border-amber-700/30";

            return (
              <div 
                key={u.uid}
                onClick={() => onViewProfile && onViewProfile(u)}
                className={`flex justify-between items-center p-2.5 rounded-xl transition duration-155 border cursor-pointer ${
                  isMe 
                    ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15' 
                    : 'bg-slate-950/40 border-transparent hover:border-gray-850 hover:bg-slate-900/60'
                }`}
                title="Click to view Gladiator Profile"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {/* Position Badge */}
                  <div className={`w-6 h-6 rounded-lg font-mono text-xs font-bold shrink-0 flex items-center justify-center ${badgeBg}`}>
                    {rank}
                  </div>
                  
                  {/* Avatar img */}
                  <img 
                    src={u.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.uid}`}
                    alt={u.displayName}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-md bg-slate-800 border border-gray-800 shrink-0"
                  />
                  
                  {/* Name and competitive badge rows */}
                  <div className="truncate flex-1 min-w-0 pr-1">
                    <span className={`text-xs font-medium block truncate ${isMe ? 'text-amber-400 font-extrabold' : 'text-gray-200'}`}>
                      {u.displayName}
                    </span>
                    
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {/* Explicit Rank/Tier Label Badge */}
                      <span className={`text-[8px] font-mono leading-none px-1 py-0.5 rounded uppercase font-bold tracking-wider ${tier.badgeClass}`}>
                        {tier.name}
                      </span>
                      
                      {/* Wins indicators */}
                      <span className="text-[9px] text-gray-400 font-mono leading-none">
                        🏆 <span className="text-gray-200 font-semibold">{u.wins} Wins</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score & Asset Private values */}
                <div className="text-right shrink-0 flex flex-col justify-center items-end pl-2">
                  <span className="text-xs font-mono font-bold text-gray-300">
                    🛡️ {u.rating || 1200}
                  </span>
                  
                  {isMe ? (
                    <span className="text-[10px] font-mono font-extrabold text-emerald-400 block mt-0.5 animate-pulse">
                      ₦{u.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  ) : (
                    <span className="text-[8px] font-mono text-gray-500 block mt-0.5 uppercase tracking-widest bg-slate-950/80 px-1 py-0.2 border border-gray-900/50 rounded">
                      Gladiator
                    </span>
                  )}
                  {rank === 1 && (
                    <span className="text-[8px] font-mono text-amber-500 uppercase tracking-widest flex items-center gap-0.5 justify-end mt-0.5 font-bold">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-550" /> Crown
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-900 flex justify-between items-center text-[10px] font-mono text-gray-500">
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          Active Rating Tier Engine
        </span>
        <span>Sandbox Net</span>
      </div>
    </div>
  );
};
