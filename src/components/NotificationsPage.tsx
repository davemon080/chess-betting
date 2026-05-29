import React from 'react';
import { Bell, ArrowLeft, Trash2, CheckCircle2, AlertTriangle, Swords, Coins, ShieldCheck, Trophy } from 'lucide-react';
import { NotificationItem } from '../types';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onDeleteSingle: (id: string) => void;
  onClose: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  onMarkAllRead,
  onClearAll,
  onDeleteSingle,
  onClose,
}) => {
  const getNotificationIcon = (type: string, message: string) => {
    const msgLower = message.toLowerCase();
    
    if (msgLower.includes('bet') || msgLower.includes('won') || msgLower.includes('victory') || msgLower.includes('wins')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500">
          <Trophy className="w-5 h-5 animate-pulse" />
        </div>
      );
    }
    if (msgLower.includes('credited') || msgLower.includes('balance') || msgLower.includes('deposit') || msgLower.includes('naira')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
          <Coins className="w-5 h-5 animate-pulse" />
        </div>
      );
    }
    if (msgLower.includes('challenge') || msgLower.includes('oppon') || msgLower.includes('duel')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
          <Swords className="w-5 h-5 animate-pulse" />
        </div>
      );
    }

    switch (type) {
      case 'success':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'alert':
        return (
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-gray-800 flex items-center justify-center text-zinc-400">
            <Bell className="w-5 h-5" />
          </div>
        );
    }
  };

  const formatDistance = (date: Date) => {
    try {
      const elapsed = Date.now() - date.getTime();
      const seconds = Math.floor(elapsed / 1000);
      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Return Navigation Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-900">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-mono transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Arena Lobby
        </button>
        <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-mono tracking-wider bg-slate-950 px-2.5 py-1 rounded-lg border border-gray-901">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
          <span>REAL-TIME NOTIFICATIONS CLEARINGS</span>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Module Title controls */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-gray-150">Gladiator Notifications Page</h3>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mt-0.5">
                Total Logs • {notifications.length} Record Ledger
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={onMarkAllRead}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-gray-400 hover:text-emerald-400 border border-gray-850 hover:border-emerald-500/30 text-[10px] font-mono rounded-lg transition cursor-pointer"
              >
                Mark Read
              </button>
              <button
                onClick={onClearAll}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-gray-450 hover:text-red-400 border border-gray-850 hover:border-red-500/35 text-[10px] font-mono rounded-lg transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Logs
              </button>
            </div>
          )}
        </div>

        {/* List render */}
        {notifications.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-800 rounded-2xl bg-slate-950/10">
            <span className="text-3xl block mb-2 opacity-40">🔔</span>
            <h4 className="font-display font-semibold text-xs text-zinc-400 uppercase tracking-wider">No Alerts Registered</h4>
            <p className="text-[11px] text-gray-500 mt-1 max-w-[280px] mx-auto">
              Your security protocol is safe. You will be pinged here when bets resolve or system matching offers arrive.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                id={`notification-feed-${n.id}`}
                className={`p-4 rounded-xl border flex gap-3.5 items-start justify-between transition duration-150 ${
                  n.read 
                    ? 'bg-slate-950/20 border-gray-900/60 opacity-75 hover:opacity-100' 
                    : 'bg-slate-950 border-gray-850 shadow-md border-l-2 border-l-amber-500/70'
                }`}
              >
                <div className="flex gap-3.5 items-start min-w-0">
                  {getNotificationIcon(n.type, n.message)}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold leading-tight ${n.read ? 'text-gray-400' : 'text-zinc-100'}`}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 leading-normal font-sans pr-2">
                      {n.message}
                    </p>
                    <span className="text-[9px] font-mono text-gray-600 block pt-0.5">
                      {formatDistance(n.createdAt)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteSingle(n.id)}
                  className="p-1.5 text-zinc-650 hover:text-red-400 transition cursor-pointer rounded-lg hover:bg-slate-900/40"
                  title="Remove Notification Record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
