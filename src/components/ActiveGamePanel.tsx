import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Flag, 
  RefreshCw, 
  MessageSquare, 
  ListMusic, 
  Coins, 
  ArrowLeft, 
  Timer, 
  Check, 
  X,
  Volume2,
  LogOut
} from 'lucide-react';
import { ChessMatch, MatchMessage } from '../types';
import { Chessboard } from './Chessboard';

interface ActiveGamePanelProps {
  match: ChessMatch;
  userId: string;
  playerColor: 'w' | 'b' | null;
  messages: MatchMessage[];
  onMakeMove: (from: string, to: string) => void;
  onResign: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onSendMessage: (text: string) => void;
  onExitGame: () => void;
  onTimeout?: (lostColor: 'w' | 'b') => void;
  onCancelMatch?: (matchId: string) => Promise<void>;
}

export const ActiveGamePanel: React.FC<ActiveGamePanelProps> = ({
  match,
  userId,
  playerColor,
  messages,
  onMakeMove,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onSendMessage,
  onExitGame,
  onTimeout,
  onCancelMatch,
}) => {
  const [chatInput, setChatInput] = useState<string>('');
  const [showChatDrawer, setShowChatDrawer] = useState<boolean>(false);
  const [lastMessageCount, setLastMessageCount] = useState<number>(0);
  const [hasNewMessageAlert, setHasNewMessageAlert] = useState<boolean>(false);
  const [hideChatSpectator, setHideChatSpectator] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // Clocks in seconds
  const [whiteTime, setWhiteTime] = useState<number>(900); // Default to 15m
  const [blackTime, setBlackTime] = useState<number>(900);

  // Parse original time limit
  useEffect(() => {
    if (match.timeControl && match.timeControl !== 'unlimited') {
      const minutes = parseInt(match.timeControl);
      if (!isNaN(minutes)) {
        setWhiteTime(minutes * 60);
        setBlackTime(minutes * 60);
      }
    }
  }, [match.timeControl]);

  // Keep track of new chat messages for unread indicator badge
  const [hasInitializedMessages, setHasInitializedMessages] = useState<boolean>(false);

  useEffect(() => {
    if (!hasInitializedMessages) {
      setLastMessageCount(messages.length);
      setHasInitializedMessages(true);
      return;
    }

    if (messages.length > lastMessageCount) {
      const latestMessage = messages[messages.length - 1];
      // Only set alert if the chat is closed and the message comes from the opponent!
      if (!showChatDrawer && latestMessage && latestMessage.userId !== userId) {
        setHasNewMessageAlert(true);
      }
      setLastMessageCount(messages.length);
    }
  }, [messages, showChatDrawer, lastMessageCount, hasInitializedMessages, userId]);

  // Clock countdown interval - triggers auto forfeiture on timeout
  useEffect(() => {
    if (match.status !== 'playing' || match.timeControl === 'unlimited') return;

    const interval = setInterval(() => {
      if (match.turn === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            if (onTimeout) {
              onTimeout('w');
            }
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            if (onTimeout) {
              onTimeout('b');
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [match.status, match.turn, match.timeControl, onTimeout]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, showChatDrawer]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  const formatTime = (totalSecs: number): string => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isMyTurn = playerColor === match.turn && match.status === 'playing';

  // Group move history into standard PGN blocks
  const renderMoveHistory = () => {
    const moves = match.moves || [];
    const paired: string[][] = [];
    for (let i = 0; i < moves.length; i += 2) {
      paired.push([moves[i], moves[i + 1] || '']);
    }

    if (paired.length === 0) {
      return (
        <div className="text-center py-4 text-[10px] text-gray-600 font-mono italic">
          No moves recorded.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono text-gray-400">
        {paired.map((p, idx) => (
          <div key={idx} className="flex justify-between border-b border-gray-900/40 pb-0.5">
            <span className="text-gray-600 font-bold">{idx + 1}.</span>
            <span className="text-gray-300 flex-1 pl-1 text-left">{p[0]}</span>
            <span className="text-amber-500/85 flex-1 text-right font-medium">{p[1]}</span>
          </div>
        ))}
      </div>
    );
  };

  // Utility flags & colors
  const isSpectator = playerColor === null;

  const opponentName = isSpectator 
    ? (match.blackPlayerName || 'Black Player')
    : (playerColor === 'w' ? (match.blackPlayerName || 'Opponent Joining...') : (match.whitePlayerName || 'Opponent'));

  const opponentPhoto = isSpectator
    ? (match.blackPlayerPhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=blackPlayer`)
    : (playerColor === 'w' 
        ? (match.blackPlayerPhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=blackPlayer`)
        : (match.whitePlayerPhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=whitePlayer`));

  const myName = isSpectator 
    ? (match.whitePlayerName || 'White Player')
    : (playerColor === 'b' ? match.blackPlayerName : match.whitePlayerName);

  const myPhoto = isSpectator
    ? (match.whitePlayerPhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=whitePlayer`)
    : (playerColor === 'b'
        ? (match.blackPlayerPhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=self`)
        : (match.whitePlayerPhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=self`));

  return (
    <div className="w-full flex flex-col min-h-[calc(100vh-140px)] animate-in fade-in duration-300 relative">
      
      {/* 1. Header Control bar with quick action icons */}
      <div className="flex justify-between items-center p-4 bg-[#111827] border border-gray-800 rounded-2xl mb-6 shadow-xl relative z-20">
        
        {/* Left Side: Exit/Leave Icon Action */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (match.status === 'playing' && playerColor) {
                setShowExitConfirm(true);
              } else {
                onExitGame();
              }
            }}
            className="p-2.5 bg-slate-950 hover:bg-zinc-900 border border-gray-800 text-gray-400 hover:text-white rounded-xl transition cursor-pointer flex items-center justify-center"
            title="Leave Match block"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-xs font-bold text-gray-200">Chess Arena Duel</h3>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">
              Escrow Active
            </span>
          </div>
        </div>

        {/* Center: Escrow Multiplier badge */}
        <div className="bg-slate-950/80 px-4 py-1.5 rounded-xl border border-gray-900 flex items-center gap-1.5 shadow-inner">
          <Coins className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-xs font-mono font-extrabold text-emerald-400">
            ₦{(match.betAmount * 2).toLocaleString()}
          </span>
          <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider hidden sm:inline border-l border-gray-800 pl-1.5">
            Stake: ₦{match.betAmount} each
          </span>
        </div>

        {/* Right Side: Tab Icons (Chat drawer toggle, Propose Draw, Resign) */}
        <div className="flex items-center space-x-2">
          
          {/* Propose Draw action link */}
          {match.status === 'playing' && playerColor && (
            <>
              {match.isDrawOfferedBy ? (
                match.isDrawOfferedBy !== userId ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-bounce">
                    <span className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-wider text-center">Draw Offered!</span>
                    <button
                      onClick={onAcceptDraw}
                      className="p-1 bg-emerald-600 text-slate-950 rounded-md text-[10px] font-extrabold px-2 cursor-pointer"
                    >
                      Accept
                    </button>
                    <button
                      onClick={onDeclineDraw}
                      className="p-1 bg-red-850 text-red-200 rounded-md text-[10px] font-extrabold px-2 cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <span className="text-[9px] font-mono bg-[#1f2937] text-zinc-500 px-3 py-1.5 rounded-xl border border-gray-800">
                    Draw proposed...
                  </span>
                )
              ) : (
                <button
                  onClick={onOfferDraw}
                  className="p-2.5 bg-slate-950 hover:bg-zinc-900 border border-gray-800 text-gray-400 hover:text-amber-500 rounded-xl transition cursor-pointer flex items-center justify-center"
                  title="Propose Draw agreement"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              {/* Resign stakes button */}
              <button
                onClick={onResign}
                className="p-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 rounded-xl transition cursor-pointer flex items-center justify-center"
                title="Resign Stakes"
              >
                <Flag className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Spectator Chat Option Toggle */}
          {isSpectator && (
            <button
              onClick={() => {
                const nextVal = !hideChatSpectator;
                setHideChatSpectator(nextVal);
                if (nextVal) {
                  setShowChatDrawer(false);
                }
              }}
              className={`text-xs font-mono font-bold px-3 py-2 border rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                hideChatSpectator
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/15'
                  : 'bg-slate-950 hover:bg-zinc-900 border-gray-800 text-gray-400 hover:text-white'
              }`}
              title="Toggle focus board (hides chat drawer completely)"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{hideChatSpectator ? 'Show Chat' : 'Hide Chat (Focus Board)'}</span>
            </button>
          )}

          {/* Interactive Chat overlay Drawer toggle with counts */}
          {!hideChatSpectator && (
            <button
              onClick={() => {
                setShowChatDrawer(!showChatDrawer);
                setHasNewMessageAlert(false);
              }}
              className={`p-2.5 border rounded-xl transition cursor-pointer flex items-center justify-center relative ${
                showChatDrawer 
                  ? 'bg-emerald-600 border-emerald-600 text-slate-950 shadow-md' 
                  : 'bg-slate-950 hover:bg-zinc-900 border-gray-800 text-gray-400 hover:text-white'
              }`}
              title="Lobby Bander Live Chat"
            >
              <MessageSquare className="w-4 h-4" />
              {hasNewMessageAlert && !showChatDrawer && (
                <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse border border-slate-950" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 2. Primary Chessboard screen layout focus centered fully */}
      <div className="grid lg:grid-cols-12 gap-6 items-stretch flex-1">
        
        {/* Left Focus Block containing Large full Chessboard (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          
          {/* Opponent Player HUD label cards */}
          <div className="flex justify-between items-center p-3 bg-slate-950 border border-gray-900 rounded-xl max-w-2xl mx-auto w-full">
            <div className="flex items-center space-x-2.5">
              <img
                src={opponentPhoto}
                alt="opponent"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg border border-gray-900 bg-[#111827]"
              />
              <div>
                <span className="text-xs font-bold text-gray-200 block truncate max-w-[150px] sm:max-w-[220px]">
                  {opponentName}
                </span>
                <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider font-semibold">
                  {isSpectator ? 'Black Player' : (playerColor === 'w' ? 'Black System' : 'White System')}
                </span>
              </div>
            </div>

            {/* Timers countdown clocks */}
            {match.timeControl !== 'unlimited' && (
              <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border font-mono text-xs font-bold ${
                ((isSpectator && match.turn === 'b') || (!isSpectator && match.turn === (playerColor === 'w' ? 'b' : 'w'))) && match.status === 'playing'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-500 animate-pulse'
                  : 'bg-slate-900 border-gray-950 text-gray-400'
              }`}>
                <Timer className="w-3.5 h-3.5" />
                <span>{isSpectator || playerColor === 'w' ? formatTime(blackTime) : formatTime(whiteTime)}</span>
              </div>
            )}
          </div>

          {/* Majestic full size Chessboard stage */}
          <div className="relative max-w-[500px] w-full mx-auto aspect-square bg-[#0f121d] border border-gray-800 rounded-2xl shadow-2xl p-2 flex items-center justify-center">
            
            <div className="w-full h-full max-h-[460px] max-w-[460px] flex items-center justify-center">
              <Chessboard
                fen={match.fen}
                turn={match.turn}
                playerColor={playerColor}
                onMove={onMakeMove}
                isInteractive={isMyTurn}
              />
            </div>

            {/* Waiting for Challenger connecting */}
            {match.status === 'waiting' && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col justify-center items-center rounded-2xl space-y-4 z-30 p-6">
                <span className="w-8 h-8 border-[3px] border-amber-500 border-t-transparent rounded-full animate-spin animate-duration-1000" />
                <div className="text-center">
                  <h4 className="font-display font-medium text-xs text-amber-500 uppercase tracking-widest font-bold">Awaiting Opponent</h4>
                  <p className="text-[11px] text-gray-400 mt-2 max-w-[280px] leading-relaxed">
                    Waiting for players to allocate stakes. Shared link allows immediate matches entering!
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-[220px] pt-3">
                  <button
                    onClick={onExitGame}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-gray-205 transition text-xs font-bold font-mono rounded-xl cursor-pointer text-center"
                  >
                    Leave Room (Keep Open)
                  </button>
                  {match.creatorId === userId && onCancelMatch && (
                    <button
                      onClick={async () => {
                        try {
                          await onCancelMatch(match.id);
                          onExitGame();
                        } catch (err) {
                          console.error("Cancel matched error:", err);
                        }
                      }}
                      className="w-full py-2 bg-red-950/40 hover:bg-red-950/60 border border-red-900/30 text-red-400 hover:text-red-300 transition text-xs font-bold font-mono rounded-xl cursor-pointer text-center"
                    >
                      Cancel stakes & delete
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Finished states overlays */}
            {match.status === 'completed' && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col justify-center items-center rounded-2xl space-y-3 z-30 p-6 text-center">
                <span className="text-2xl animate-bounce">🏆</span>
                <span className="text-xs font-mono text-amber-500 uppercase tracking-widest font-bold">Battle Completed</span>
                <p className="text-xs text-gray-300 font-sans max-w-[300px] leading-relaxed">
                  {match.endReason}
                </p>
                <button
                  onClick={onExitGame}
                  className="bg-gray-800 hover:bg-gray-700 transition px-4 py-1.5 rounded-lg text-xs font-mono font-bold font-semibold cursor-pointer text-gray-200 mt-1"
                >
                  Return to Dashboard
                </button>
              </div>
            )}

            {match.status === 'draw' && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col justify-center items-center rounded-2xl space-y-3 z-30 p-6 text-center">
                <span className="text-2xl">🤝</span>
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest font-bold">Stalemate Draw</span>
                <p className="text-xs text-gray-300 font-sans max-w-[300px] leading-relaxed">
                  The gladiator duel has settled in a draw agreement. Stakes refunded.
                </p>
                <button
                  onClick={onExitGame}
                  className="bg-gray-800 hover:bg-gray-700 transition px-4 py-1.5 rounded-lg text-xs font-mono font-bold font-semibold cursor-pointer text-gray-200 mt-1"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>

          {/* Self Player HUD label cards */}
          <div className="flex justify-between items-center p-3 bg-slate-950 border border-gray-900 rounded-xl max-w-2xl mx-auto w-full">
            <div className="flex items-center space-x-2.5">
              <img
                src={myPhoto}
                alt="me"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg border border-gray-900 bg-[#111827]"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-200 block truncate max-w-[110px] sm:max-w-[180px]">
                    {myName}
                  </span>
                  {isSpectator ? (
                    <span className="text-[8px] font-mono bg-amber-500/10 border border-amber-500/20 rounded px-1 text-amber-400 font-bold uppercase tracking-wide">
                      Watching
                    </span>
                  ) : (
                    <span className="text-[8px] font-mono bg-emerald-500/10 border border-emerald-500/20 rounded px-1 text-emerald-400 font-bold uppercase tracking-wide">
                      You
                    </span>
                  )}
                </div>
                <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider font-semibold">
                  {isSpectator ? 'White Player' : (playerColor === 'b' ? 'Black System' : 'White System')}
                </span>
              </div>
            </div>

            {/* Timers countdown clocks */}
            <div className="flex items-center space-x-2">
              {match.timeControl !== 'unlimited' && (
                <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border font-mono text-xs font-bold ${
                  ((isSpectator && match.turn === 'w') || (!isSpectator && match.turn === playerColor)) && match.status === 'playing'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 animate-pulse'
                    : 'bg-slate-900 border-gray-950 text-gray-400'
                }`}>
                  <Timer className="w-3.5 h-3.5" />
                  <span>{isSpectator || playerColor === 'w' ? formatTime(whiteTime) : formatTime(blackTime)}</span>
                </div>
              )}
              
              <div className={`text-[8px] font-mono font-bold tracking-widest uppercase border px-2 py-1 rounded ${
                isMyTurn 
                  ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20 animate-pulse' 
                  : (isSpectator 
                      ? 'text-amber-550 border-amber-500/20 bg-amber-500/5' 
                      : 'text-zinc-600 bg-slate-900 border-transparent')
              }`}>
                {isMyTurn ? 'Your turn' : (isSpectator ? `TURN: ${match.turn.toUpperCase()}` : 'Thinking')}
              </div>
            </div>
          </div>
        </div>

        {/* Right column sidebar containing Move ledger history (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-start">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col h-full min-h-[180px] lg:min-h-[460px]">
            <div className="flex items-center space-x-2 pb-2.5 border-b border-gray-800 mb-4 flex-shrink-0">
              <ListMusic className="w-4 h-4 text-amber-500" />
              <h3 className="font-display font-bold text-xs text-gray-300 uppercase tracking-widest">Move Tracker Ledger</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1">
              {renderMoveHistory()}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sliding glassmorphism chat Room Drawer Panel (Floating Absolute Side panel) */}
      {showChatDrawer && (
        <>
          {/* Dismissible Backdrop overlay allowing clicking anywhere outside to close the chat */}
          <div 
            onClick={() => setShowChatDrawer(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px] z-30 transition-opacity duration-200"
          />
          <div className="fixed bottom-4 right-4 sm:top-0 sm:bottom-0 sm:right-0 w-[calc(100%-2rem)] max-w-sm sm:w-80 h-[460px] sm:h-auto bg-[#0c0f17]/98 sm:bg-[#0c0f17]/95 border border-gray-800/85 sm:border-t-0 sm:border-r-0 sm:border-b-0 sm:border-l rounded-2xl sm:rounded-none backdrop-blur-md shadow-2xl z-40 p-4 sm:p-5 flex flex-col justify-between animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <h4 className="font-display font-medium text-xs text-gray-200 uppercase tracking-widest font-bold">Arena Threat Chat</h4>
              </div>
              <button
                onClick={() => setShowChatDrawer(false)}
                className="px-2.5 py-1 bg-zinc-805 hover:bg-zinc-800 hover:text-red-400 rounded-lg text-gray-300 transition cursor-pointer font-mono text-[10px] font-bold shadow-sm flex items-center justify-center border border-gray-800/40"
              >
                ✕ Close
              </button>
            </div>

          {/* Banter Messages list body */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-4 my-4 pr-1 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-[10px] font-mono text-zinc-600 italic">
                Banter room is currently quiet. Drop matching warnings!
              </div>
            ) : (
              messages.map(m => {
                const isOp = m.userId !== userId;
                return (
                  <div key={m.id} className={`flex flex-col ${isOp ? 'items-start' : 'items-end'}`}>
                    <span className="text-[9px] font-mono text-zinc-500 mb-1 px-1">
                      {m.userName}
                    </span>
                    <span className={`px-3 py-1.5 rounded-2xl text-[11px] max-w-[85%] break-words leading-relaxed shadow ${
                      isOp 
                        ? 'bg-slate-950 text-gray-300 rounded-tl-sm border border-gray-900' 
                        : 'bg-emerald-600 text-slate-950 font-bold rounded-tr-sm'
                    }`}>
                      {m.text}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-1.5 pt-3 border-t border-gray-950">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Inject match banter..."
              className="flex-1 bg-slate-950 border border-gray-900 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 font-sans"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 p-2.5 rounded-xl flex items-center justify-center cursor-pointer transition shadow hover:opacity-90"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </>
    )}

      {/* Leave Game Warning Alert Popup Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f121d] border border-red-500/30 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl p-6 text-center space-y-4 animate-in scale-in duration-150">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-400 mx-auto font-bold text-lg animate-pulse">
              ⚠️
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-gray-200 uppercase tracking-wider">Leave Active Duel?</h4>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Warning! If you leave this active battleground, the current chess duel will close and you will immediately forfeit your stake of <span className="text-red-400 font-bold">₦{match.betAmount.toLocaleString()}</span> to your opponent! 
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2 bg-gray-850 hover:bg-gray-750 transition text-gray-205 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel & Stand
              </button>
              <button
                type="button"
                onClick={() => {
                  onResign();
                  onExitGame();
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 transition text-white font-bold text-xs rounded-xl cursor-pointer shadow-lg shadow-red-950/20"
              >
                Forfeit & Retreat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
