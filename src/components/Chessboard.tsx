import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { renderPiece } from './ChessVectors';

interface ChessboardProps {
  fen: string;
  turn: 'w' | 'b';
  playerColor: 'w' | 'b' | null; // w, b, or null (watcher)
  onMove: (from: string, to: string, promotion?: string) => void;
  isInteractive: boolean;
}

export const Chessboard: React.FC<ChessboardProps> = ({
  fen,
  playerColor,
  onMove,
  isInteractive,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleDestinations, setPossibleDestinations] = useState<string[]>([]);
  const [game, setGame] = useState<Chess>(new Chess(fen));
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);

  // Sync state machine when FEN changes externally
  useEffect(() => {
    try {
      setGame(new Chess(fen));
      setSelectedSquare(null);
      setPossibleDestinations([]);
    } catch (e) {
      console.error("Invalid FEN passed to board: ", fen);
    }
  }, [fen]);

  const activeColor = playerColor || 'w';
  const isFlipped = activeColor === 'b';

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = isFlipped ? [...files].reverse() : files;
  const displayRanks = isFlipped ? [...ranks].reverse() : ranks;

  // Board pieces array
  const boardMatrix = game.board();

  // Helper helper to get square coordinate from row, col index (standard matrix maps A8 as 0,0 and H1 as 7,7)
  const getSquareName = (rowIndex: number, colIndex: number): string => {
    // If board is flipped, the matrix is indexed differently?
    // Wait, the FEN matrix corresponds index directly to coordinate ranks/files:
    // row 0 is rank 8, row 1 is rank 7... row 7 is rank 1
    // col 0 is file a, col 1 is file b... col 7 is file h
    const f = files[colIndex];
    const r = ranks[rowIndex];
    return f + r;
  };

  const getPieceAtSquare = (squareName: string) => {
    try {
      // Find row and col for square
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
    
    // Check destination rank
    const toRank = toSquare[1];
    if (piece.color === 'w' && toRank === '8') return true;
    if (piece.color === 'b' && toRank === '1') return true;
    
    return false;
  };

  const handleSquareClick = (squareName: string) => {
    if (!isInteractive) return;

    // Check if player clicked a valid target option
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

    // If click matches current player color, select it
    if (clickedPiece && clickedPiece.color === activeColor) {
      setSelectedSquare(squareName);
      
      // Calculate possible destinations using chess.js
      try {
        const moves = game.moves({ square: squareName as any, verbose: true });
        const dests = moves.map(m => m.to);
        setPossibleDestinations(dests);
      } catch (e) {
        setPossibleDestinations([]);
      }
    } else {
      // Clear selection if they clicked elsewhere
      setSelectedSquare(null);
      setPossibleDestinations([]);
    }
  };

  // Find checking square to highlight
  const inCheck = game.inCheck();
  let checkedKingSquare: string | null = null;
  if (inCheck) {
    const activeTurn = game.turn();
    // Scan board to locate the active king
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

  return (
    <div className="relative w-full aspect-square bg-[#1a202c] border border-gray-800 rounded-lg overflow-hidden select-none shadow-2xl">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {displayRanks.map((rankName, displayRowIdx) => {
          // Find standard row index in FEN matrix
          const actualRowIdx = ranks.indexOf(rankName);

          return displayFiles.map((fileName, displayColIdx) => {
            const actualColIdx = files.indexOf(fileName);
            const squareName = fileName + rankName;
            const piece = boardMatrix[actualRowIdx][actualColIdx];
            
            const isLight = (actualRowIdx + actualColIdx) % 2 === 0;
            const isSelected = selectedSquare === squareName;
            const isDot = possibleDestinations.includes(squareName);
            const isChecking = checkedKingSquare === squareName;

            return (
              <div
                key={squareName}
                id={`square-${squareName}`}
                onClick={() => handleSquareClick(squareName)}
                className={`relative flex items-center justify-center transition-all duration-150 cursor-pointer aspect-square ${
                  isLight ? 'chess-square-light' : 'chess-square-dark'
                } ${isSelected ? 'chess-square-selected' : ''} ${
                  isChecking ? 'chess-square-check' : ''
                }`}
              >
                {/* Visual coordinate labels on corners */}
                {displayColIdx === 0 && (
                  <span className={`absolute top-1 left-1.5 text-[9px] font-bold font-mono pointer-events-none ${
                    isLight ? 'text-[#739552]' : 'text-[#ececd7]'
                  }`}>
                    {rankName}
                  </span>
                )}
                {displayRowIdx === 7 && (
                  <span className={`absolute bottom-0.5 right-1 text-[9px] font-bold font-mono pointer-events-none ${
                    isLight ? 'text-[#739552]' : 'text-[#ececd7]'
                  }`}>
                    {fileName}
                  </span>
                )}

                {/* Show Chess Piece */}
                {piece && (
                  <div className="w-[82%] h-[82%] flex items-center justify-center z-10 transition-transform duration-200">
                    {renderPiece(piece.type, piece.color, "w-full h-full drop-shadow-md hover:scale-105 active:scale-95 transition-transform")}
                  </div>
                )}

                {/* Dot layer indicating valid move destinations */}
                {isDot && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    {piece ? (
                      // Highlight borders of occupied squares for capture moves
                      <div className="w-[78%] h-[78%] rounded-full border-[3.5px] border-amber-500 opacity-80" />
                    ) : (
                      // Display simple center dots for open moves
                      <div className="w-3 h-3 rounded-full bg-amber-500 opacity-85 shadow" />
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
              <p className="text-[9px] text-gray-400 mt-0.5">Select a replacement class below:</p>
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
