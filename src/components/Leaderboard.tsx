import React from 'react';
import { Trophy, Star, TrendingUp, Award } from 'lucide-react';
import { UserProfile } from '../types';

interface LeaderboardProps {
  users: UserProfile[];
  currentUserId?: string;
  onViewProfile?: (user: UserProfile) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ users, currentUserId, onViewProfile }) => {
  // Sort users by battle points (Wins = 3 points, Draws = 1 point)
  const sorted = [...users]
    .sort((a, b) => {
      const scoreA = (a.wins * 3) + a.draws;
      const scoreB = (b.wins * 3) + b.draws;
      return scoreB - scoreA;
    })
    .slice(0, 20);

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
      <div className="flex items-center space-x-2 pb-4 border-b border-gray-800 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="font-display font-bold text-base text-gray-150">Top Arena Gladiators</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[500px]">
        {sorted.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500 font-mono">
            Scanning block histories...
          </div>
        ) : (
          sorted.map((u, idx) => {
            const isMe = u.uid === currentUserId;
            const rank = idx + 1;
            
            let badgeBg = "bg-slate-900 text-gray-400";
            if (rank === 1) badgeBg = "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
            if (rank === 2) badgeBg = "bg-zinc-400/10 text-zinc-400 border border-zinc-400/20";
            if (rank === 3) badgeBg = "bg-amber-700/10 text-amber-700 border border-amber-700/20";

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
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center ${badgeBg}`}>
                    {rank}
                  </div>
                  <img 
                    src={u.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.uid}`}
                    alt={u.displayName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-md bg-slate-800 border border-gray-800"
                  />
                  <div className="max-w-[124px] truncate">
                    <span className={`text-xs font-medium block truncate ${isMe ? 'text-amber-400 font-bold' : 'text-gray-200'}`}>
                      {u.displayName}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {u.wins}W - {u.losses}L (🛡️ {u.rating || 1200})
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {isMe ? (
                    <span className="text-xs font-mono font-bold text-emerald-400 block animate-pulse">
                      ₦{u.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-semibold text-gray-500 block bg-slate-950 px-1.5 py-0.5 rounded border border-gray-900">
                      🔒 Private
                    </span>
                  )}
                  {rank === 1 && (
                    <span className="text-[8px] font-mono text-amber-500 uppercase tracking-widest flex items-center gap-0.5 justify-end mt-0.5">
                      <Star className="w-2 h-2 fill-amber-500" /> Crown
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
          Volume Active
        </span>
        <span>Sandbox Net</span>
      </div>
    </div>
  );
};
