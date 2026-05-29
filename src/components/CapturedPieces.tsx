import React from 'react';
import { renderPiece } from './ChessVectors';

interface CapturedPiecesProps {
  captured: string[]; // List of piece types (e.g., ['q', 'r', 'b', 'n', 'p'])
  color: 'w' | 'b'; // The color of the captured pieces themselves
  advantage: number; // Positive number if the player holding these pieces is leading
  className?: string;
}

// Map piece short letters to standard ordering weight (higher value first)
const PIECE_ORDER: Record<string, number> = { q: 5, r: 4, b: 3, n: 2, p: 1 };

export const CapturedPiecesList: React.FC<CapturedPiecesProps> = ({
  captured,
  color,
  advantage,
  className = '',
}) => {
  // Sophisticated sorting of captured pieces (highest value Queen first, down to Pawn last)
  const sortedPieces = [...captured].sort((a, b) => {
    const valA = PIECE_ORDER[a.toLowerCase()] || 0;
    const valB = PIECE_ORDER[b.toLowerCase()] || 0;
    return valB - valA;
  });

  if (captured.length === 0) {
    return (
      <div className={`flex items-center space-x-1.5 opacity-30 ${className}`}>
        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
          No captures
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center flex-wrap gap-1 bg-slate-900/30 px-2 py-1 rounded-lg border border-gray-800/40 shadow-sm ${className}`}>
      {/* Captured piece SVGs stacked horizontally with light overlaps to save space */}
      <div className="flex -space-x-1 mb-0.5 items-center">
        {sortedPieces.map((piece, idx) => (
          <div
            key={`${piece}-${idx}`}
            className={`w-5 h-5 rounded flex items-center justify-center hover:z-10 transition-all hover:scale-115 cursor-help ${
              color === 'b'
                ? 'bg-zinc-150 border border-zinc-300/80 shadow-[0_0_6px_rgba(255,255,255,0.15)]'
                : 'bg-zinc-950/90 border border-zinc-800/80'
            }`}
            title={`Captured ${piece.toUpperCase()}`}
          >
            {renderPiece(piece, color, "w-4 h-4")}
          </div>
        ))}
      </div>
    </div>
  );
};

// Calculates missing pieces by comparing the current FEN string to the starting pieces
export function parseCapturedPieces(fen: string) {
  const defaultCounts = {
    // White pieces (Active on board initially)
    P: 8, R: 2, N: 2, B: 2, Q: 1,
    // Black pieces (Active on board initially)
    p: 8, r: 2, n: 2, b: 2, q: 1
  };

  const currentCounts = {
    P: 0, R: 0, N: 0, B: 0, Q: 0,
    p: 0, r: 0, n: 0, b: 0, q: 0
  };

  if (!fen) {
    return {
      capturedWhite: [],
      capturedBlack: [],
      whiteLead: 0,
      blackLead: 0,
      whiteVal: 0,
      blackVal: 0,
    };
  }

  // Parse the piece placement (the first section of the FEN string)
  const boardPart = fen.split(' ')[0];
  for (const char of boardPart) {
    if (char in currentCounts) {
      currentCounts[char as keyof typeof currentCounts]++;
    }
  }

  const capturedWhite: string[] = []; // White pieces captured by Black
  const capturedBlack: string[] = []; // Black pieces captured by White

  // Compare starting counts vs current counts
  for (let i = 0; i < defaultCounts.P - currentCounts.P; i++) capturedWhite.push('p');
  for (let i = 0; i < defaultCounts.R - currentCounts.R; i++) capturedWhite.push('r');
  for (let i = 0; i < defaultCounts.N - currentCounts.N; i++) capturedWhite.push('n');
  for (let i = 0; i < defaultCounts.B - currentCounts.B; i++) capturedWhite.push('b');
  for (let i = 0; i < defaultCounts.Q - currentCounts.Q; i++) capturedWhite.push('q');

  for (let i = 0; i < defaultCounts.p - currentCounts.p; i++) capturedBlack.push('p');
  for (let i = 0; i < defaultCounts.r - currentCounts.r; i++) capturedBlack.push('r');
  for (let i = 0; i < defaultCounts.n - currentCounts.n; i++) capturedBlack.push('n');
  for (let i = 0; i < defaultCounts.b - currentCounts.b; i++) capturedBlack.push('b');
  for (let i = 0; i < defaultCounts.q - currentCounts.q; i++) capturedBlack.push('q');

  // Let's also calculate point material differential
  // P/p = 1, N/n = 3, B/b = 3, R/r = 5, Q/q = 9
  const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  let whiteCapturedScore = 0; // Cumulative value of white pieces captured
  let blackCapturedScore = 0; // Cumulative value of black pieces captured

  capturedWhite.forEach(p => { whiteCapturedScore += pieceValues[p.toLowerCase()] || 0; });
  capturedBlack.forEach(p => { blackCapturedScore += pieceValues[p.toLowerCase()] || 0; });

  let whiteLead = 0; // Amount by which white is leading in material advantage
  let blackLead = 0; // Amount by which black is leading

  if (blackCapturedScore > whiteCapturedScore) {
    whiteLead = blackCapturedScore - whiteCapturedScore; // White has captured more of black's material
  } else if (whiteCapturedScore > blackCapturedScore) {
    blackLead = whiteCapturedScore - blackCapturedScore; // Black has captured more of white's material
  }

  return {
    capturedWhite, // array of white piece characters (captured by Black)
    capturedBlack, // array of black piece characters (captured by White)
    whiteLead,
    blackLead,
    whiteCapturedScore,
    blackCapturedScore
  };
}
