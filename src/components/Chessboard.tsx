import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { renderPiece } from './ChessVectors';

// Single shared AudioContext to prevent exhaustion and latency
let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    return sharedAudioCtx;
  } catch (err) {
    console.warn("AudioContext setup failed:", err);
    return null;
  }
};

// Proactively resume/unlock context upon user event
export const unlockAudio = () => {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch((err) => console.warn('AudioContext resume failed on user gesture:', err));
    }
  } catch (err) {
    console.warn('Audio unlock warning:', err);
  }
};

// Global auto-unlock on first user touch or click
if (typeof window !== 'undefined') {
  const handleInteraction = () => {
    unlockAudio();
    window.removeEventListener('click', handleInteraction);
    window.removeEventListener('touchstart', handleInteraction);
    window.removeEventListener('keydown', handleInteraction);
  };
  window.addEventListener('click', handleInteraction, { passive: true });
  window.addEventListener('touchstart', handleInteraction, { passive: true });
  window.addEventListener('keydown', handleInteraction, { passive: true });
}

// Satisfying high-fidelity physical key audio response via Web Audio API
export const playClickSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    // Ensure we start from current time or offset
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    // Frequency sweep from 600Hz down to 100Hz in 0.08 seconds
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (err) {
    console.warn("Web audio playback failed:", err);
  }
};

export const playCaptureSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(180, now);
    osc1.frequency.exponentialRampToValueAtTime(45, now + 0.16);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(360, now);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.13);
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.16);
    osc2.stop(now + 0.16);
  } catch (err) {
    console.warn("Capture sound playback failed:", err);
  }
};

export const sayCheckSpeech = () => {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Check');
      utterance.rate = 1.15;
      utterance.pitch = 1.05;
      utterance.volume = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  } catch (err) {
    console.warn("Speech synthesis failed:", err);
  }
};

export interface BoardTheme {
  id: string;
  name: string;
  light: string;
  dark: string;
  lightLabel: string;
  darkLabel: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: 'classic', name: 'Classic Green', light: '#f0ebd4', dark: '#2e5033', lightLabel: '#2e5033', darkLabel: '#f0ebd4' },
  { id: 'gold', name: 'Empire Gold', light: '#fafaf9', dark: '#0f172a', lightLabel: '#d97706', darkLabel: '#fafaf9' },
  { id: 'wood', name: 'Warm Mahogany', light: '#fed7aa', dark: '#7c2d12', lightLabel: '#7c2d12', darkLabel: '#fed7aa' },
  { id: 'cosmic', name: 'Cosmic Slate', light: '#f1f5f9', dark: '#0c0a09', lightLabel: '#06b6d4', darkLabel: '#f1f5f9' },
];

interface ChessboardProps {
  fen: string;
  turn: 'w' | 'b';
  playerColor: 'w' | 'b' | null; // w, b, or null (watcher)
  onMove: (from: string, to: string, promotion?: string) => void;
  isInteractive: boolean;
  boardTheme?: string;
  moves?: string[];
}

export const Chessboard: React.FC<ChessboardProps> = ({
  fen,
  playerColor,
  onMove,
  isInteractive,
  boardTheme = 'classic',
  moves,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleDestinations, setPossibleDestinations] = useState<string[]>([]);
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);

  // Memoize Chess instance matching active FEN and move history sequences to prevent rendering lag
  const game = useMemo(() => {
    try {
      const nextGame = new Chess();
      let success = true;

      if (moves && moves.length > 0) {
        try {
          for (const m of moves) {
            nextGame.move(m);
          }
        } catch (err) {
          console.warn("Failed to replay full move list, falling back to direct FEN loading:", err);
          success = false;
        }
      } else {
        success = false;
      }

      if (!success) {
        return new Chess(fen);
      }
      return nextGame;
    } catch (e) {
      console.error("Invalid state loading in Chessboard useMemo: ", fen, e);
      return new Chess(fen);
    }
  }, [fen, JSON.stringify(moves)]);

  // Reset local interactive targets when Board state updates externally
  useEffect(() => {
    setSelectedSquare(null);
    setPossibleDestinations([]);
  }, [game]);

  // Robust, highly responsive, edge-triggered sound synchronization
  const lastMovesCountRef = useRef<number>(0);
  const lastMoveSignatureRef = useRef<string>('');

  useEffect(() => {
    if (!game) return;
    const history = game.history({ verbose: true });
    const currentMovesCount = history.length;
    const lastMoveObj = currentMovesCount > 0 ? history[currentMovesCount - 1] : null;
    const currentSignature = lastMoveObj 
      ? `${lastMoveObj.from}-${lastMoveObj.to}-${lastMoveObj.piece}-${lastMoveObj.captured || ''}` 
      : '';

    if (!hasInitialized) {
      // Warm boot: set current counts without firing sound sequence
      lastMovesCountRef.current = currentMovesCount;
      lastMoveSignatureRef.current = currentSignature;
      setHasInitialized(true);
      return;
    }

    // Only play move audio if the moves list expanded or the latest move fingerprint is unique
    const movesExpanded = currentMovesCount > lastMovesCountRef.current;
    const signatureChanged = currentSignature !== lastMoveSignatureRef.current && currentSignature !== '';

    if (movesExpanded || signatureChanged) {
      const isCheck = game.inCheck();
      if (isCheck) {
        sayCheckSpeech();
      }

      const isCapture = lastMoveObj && (
        lastMoveObj.captured || 
        lastMoveObj.flags?.includes('c') || 
        lastMoveObj.flags?.includes('e')
      );

      if (isCapture) {
        playCaptureSound();
      } else {
        playClickSound();
      }
    }

    lastMovesCountRef.current = currentMovesCount;
    lastMoveSignatureRef.current = currentSignature;
  }, [game, hasInitialized]);

  const activeColor = playerColor || 'w';
  const isFlipped = activeColor === 'b';

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = isFlipped ? [...files].reverse() : files;
  const displayRanks = isFlipped ? [...ranks].reverse() : ranks;

  // Board pieces array
  const boardMatrix = game.board();

  // Helper helper to get square coordinate from row, col index
  const getSquareName = (rowIndex: number, colIndex: number): string => {
    const f = files[colIndex];
    const r = ranks[rowIndex];
    return f + r;
  };

  const getPieceAtSquare = (squareName: string) => {
    try {
      const fIdx = files.indexOf(squareName[0]);
      const rIdx = ranks.indexOf(squareName[1]);
      if (fIdx !== -1 && rIdx !== -1) {
        return boardMatrix[rIdx][fIdx];
      }
    } catch {
      return null;
    }
    return null;
  };

  const checkIfPromotion = (fromSquare: string, toSquare: string): boolean => {
    const piece = getPieceAtSquare(fromSquare);
    if (!piece || piece.type !== 'p') return false;
    
    const toRank = toSquare[1];
    if (piece.color === 'w' && toRank === '8') return true;
    if (piece.color === 'b' && toRank === '1') return true;
    
    return false;
  };

  const handleSquareClick = (squareName: string) => {
    // Proactively unlock active audio context upon physical tap/touch gesture
    unlockAudio();
    if (!isInteractive) return;

    if (possibleDestinations.includes(squareName)) {
      if (selectedSquare) {
        if (checkIfPromotion(selectedSquare, squareName)) {
          setPromotionPending({ from: selectedSquare, to: squareName });
          return;
        }
        onMove(selectedSquare, squareName);
        setSelectedSquare(null);
        setPossibleDestinations([]);
      }
      return;
    }

    const clickedPiece = getPieceAtSquare(squareName);

    if (clickedPiece && clickedPiece.color === activeColor) {
      setSelectedSquare(squareName);
      
      try {
        const moves = game.moves({ square: squareName as any, verbose: true });
        const dests = moves.map(m => m.to);
        setPossibleDestinations(dests);
      } catch (e) {
        setPossibleDestinations([]);
      }
    } else {
      setSelectedSquare(null);
      setPossibleDestinations([]);
    }
  };

  const inCheck = game.inCheck();
  let checkedKingSquare: string | null = null;
  if (inCheck) {
    const activeTurn = game.turn();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = boardMatrix[r][c];
        if (p && p.type === 'k' && p.color === activeTurn) {
          checkedKingSquare = getSquareName(r, c);
          break;
        }
      }
      if (checkedKingSquare) break;
    }
  }

  // Get matching theme configurations
  const currentTheme = BOARD_THEMES.find(t => t.id === boardTheme) || BOARD_THEMES[0];

  // Retrieve the very last move coordinate to show the departure and destination indicator
  const historyList = game.history({ verbose: true });
  const lastPlayedMove = historyList.length > 0 ? historyList[historyList.length - 1] : null;
  const lastMoveColor = lastPlayedMove?.color; // 'w' or 'b'
  const isOpponentLastMove = playerColor ? (lastMoveColor !== playerColor) : true;

  return (
    <div className="relative w-full aspect-square bg-[#0c0d13] ring-4 sm:ring-[14px] ring-slate-950/90 ring-offset-1 sm:ring-offset-2 ring-offset-zinc-950/80 border-[#2e2f38] border-[3px] sm:border-[6px] rounded-2xl overflow-hidden select-none shadow-[0_45px_100px_rgba(0,0,0,0.98),0_0_80px_rgba(234,179,8,0.04)] before:absolute before:inset-0 before:bg-gradient-to-tr before:from-transparent before:via-white/[0.04] before:to-white/[0.08] before:pointer-events-none before:z-20">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {displayRanks.map((rankName, displayRowIdx) => {
          const actualRowIdx = ranks.indexOf(rankName);

          return displayFiles.map((fileName, displayColIdx) => {
            const actualColIdx = files.indexOf(fileName);
            const squareName = fileName + rankName;
            const piece = boardMatrix[actualRowIdx][actualColIdx];
            
            const isLight = (actualRowIdx + actualColIdx) % 2 === 0;
            const isSelected = selectedSquare === squareName;
            const isDot = possibleDestinations.includes(squareName);
            const isChecking = checkedKingSquare === squareName;

            const isLastMoveFrom = lastPlayedMove && lastPlayedMove.from === squareName && isOpponentLastMove;
            const isLastMoveTo = lastPlayedMove && lastPlayedMove.to === squareName && isOpponentLastMove;

            // Compute background color according to status modifiers
            let bgStyle = isLight ? currentTheme.light : currentTheme.dark;
            if (isSelected) {
              bgStyle = 'rgba(234, 179, 8, 0.42)';
            } else if (isChecking) {
              bgStyle = 'rgba(239, 68, 68, 0.45)';
            }

            // Real-world physical tile edge shadows and highlights
            const customBoxShadow = isLight
              ? 'inset 0 1.5px 3px rgba(255, 255, 255, 0.48), inset 0 -2px 3px rgba(0, 0, 0, 0.08)'
              : 'inset 0 1.5px 2px rgba(255, 255, 255, 0.04), inset 0 -2px 4.5px rgba(0, 0, 0, 0.42)';

            return (
              <div
                key={squareName}
                id={`square-${squareName}`}
                onClick={() => handleSquareClick(squareName)}
                className={`relative flex items-center justify-center transition-all duration-200 cursor-pointer aspect-square ${
                  isSelected ? 'chess-square-selected' : ''
                } ${isChecking ? 'chess-square-check' : ''}`}
                style={{ backgroundColor: bgStyle, boxShadow: customBoxShadow }}
              >
                {/* 1. OPPONENT LAST MOVE HIGHLIGHT: DEPARTURE OUTLINE (WARNING CRIMSON NEON) */}
                {isLastMoveFrom && (
                  <div className="absolute inset-x-[1px] inset-y-[1px] rounded-[6px] border-2 border-dashed border-rose-500/70 bg-gradient-to-tr from-rose-500/10 via-transparent to-transparent shadow-[inset_0_0_12px_rgba(244,63,94,0.15),0_0_14px_rgba(244,63,94,0.2)] pointer-events-none animate-move-from-pulse z-0" />
                )}

                {/* 2. OPPONENT LAST MOVE HIGHLIGHT: DESTINATION OUTLINE (CRIMSON RED GLOW + RIPPLE) */}
                {isLastMoveTo && (
                  <div className="absolute inset-x-[1px] inset-y-[1px] rounded-[6px] border-2 border-rose-500 bg-gradient-to-tr from-rose-500/20 via-rose-500/05 to-transparent shadow-[inset_0_0_16px_rgba(244,63,94,0.4),0_0_20px_rgba(244,63,94,0.35)] pointer-events-none animate-move-to-pulse z-0">
                    <div className="absolute inset-0 rounded-[4px] border border-rose-450/40 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50" />
                  </div>
                )}

                {/* Visual coordinate labels on corners */}
                {displayColIdx === 0 && (
                  <span 
                    className="absolute top-1 left-1.5 text-[9px] font-bold font-mono pointer-events-none drop-shadow"
                    style={{ color: isLight ? currentTheme.lightLabel : currentTheme.darkLabel }}
                  >
                    {rankName}
                  </span>
                )}
                {displayRowIdx === 7 && (
                  <span 
                    className="absolute bottom-0.5 right-1 text-[9px] font-bold font-mono pointer-events-none drop-shadow"
                    style={{ color: isLight ? currentTheme.lightLabel : currentTheme.darkLabel }}
                  >
                    {fileName}
                  </span>
                )}

                {/* Show Chess Piece with 3D Hover elevation and physics-matched drop shadows */}
                {piece && (
                  <div 
                    className={`relative w-[85%] h-[85%] flex items-center justify-center z-10 transition-all duration-300 group ${
                      isInteractive && piece.color === activeColor
                        ? 'hover:-translate-y-2 hover:scale-108 cursor-grab active:cursor-grabbing'
                        : 'hover:scale-103'
                    } ${isLastMoveTo ? 'animate-piece-landing' : ''}`}
                  >
                    {/* Soft interactive physical body sub-shadow */}
                    <div 
                      className={`absolute bottom-[0.5px] w-4/6 h-1.5 bg-black/45 rounded-full blur-[2px] transition-all duration-300 opacity-90 ${
                        isInteractive && piece.color === activeColor
                          ? 'group-hover:opacity-30 group-hover:scale-x-65 group-hover:scale-y-40 group-hover:blur-[4px]'
                          : ''
                      }`} 
                    />
                    
                    {/* The 3D Render block */}
                    <div className="w-full h-full drop-shadow-[0_8px_8px_rgba(0,0,0,0.48)] group-hover:drop-shadow-[0_20px_16px_rgba(0,0,0,0.58)] transition-all duration-300">
                      {renderPiece(piece.type, piece.color, "w-full h-full")}
                    </div>
                  </div>
                )}

                {/* Dot layer indicating valid move destinations */}
                {isDot && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    {piece ? (
                      <div className="w-[78%] h-[78%] rounded-full border-[3.5px] border-amber-500 opacity-80 animate-destination-pulse select-none" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-500 opacity-85 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-destination-pulse select-none" />
                    )}
                  </div>
                )}
              </div>
            );
          });
        })}
      </div>

      {promotionPending && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center z-40 p-4 transition-all duration-200">
          <div className="bg-slate-900 border border-gray-800 p-4 rounded-xl max-w-[240px] w-full text-center space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div>
              <h4 className="text-[11px] font-mono font-bold text-amber-500 uppercase tracking-widest">Gladiator Promotion</h4>
              <p className="text-[9px] text-gray-400 mt-0.5">Select a replacement class:</p>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { type: 'q', label: 'Queen' },
                { type: 'r', label: 'Rook' },
                { type: 'b', label: 'Bishop' },
                { type: 'n', label: 'Knight' },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => {
                    onMove(promotionPending.from, promotionPending.to, item.type);
                    setPromotionPending(null);
                    setSelectedSquare(null);
                    setPossibleDestinations([]);
                  }}
                  className="p-1.5 bg-slate-950 hover:bg-zinc-850 border border-gray-850 hover:border-amber-500/50 rounded-lg transition flex flex-col items-center justify-center cursor-pointer aspect-square outline-none group"
                  title={item.label}
                >
                  <div className="w-7 h-7 flex items-center justify-center group-hover:scale-110 transition duration-150">
                    {renderPiece(item.type, activeColor)}
                  </div>
                  <span className="text-[7px] font-mono text-gray-500 mt-1 uppercase font-bold group-hover:text-amber-500 truncate w-full">{item.label}</span>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => {
                setPromotionPending(null);
              }}
              className="w-full py-1 bg-zinc-950 hover:bg-zinc-900 border border-gray-800 hover:text-red-400 text-[9px] font-mono font-bold rounded-lg transition cursor-pointer text-gray-400"
            >
              Cancel Move
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
