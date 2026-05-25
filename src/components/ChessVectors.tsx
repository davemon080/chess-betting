import React from 'react';

interface PieceProps {
  className?: string;
}

// Beautiful custom minimalistic SVG chess pieces matching a highly pro visual theme
// White pieces: Polished glass reflection (Snow white to silver-gray linear gradient with sharp graphite stroke)
// Black pieces: Obsidian gem style (Deep indigo-carbon to rich onyx linear gradient with vibrant amber-gold stroke)

export const PawnWhite: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="whitePawnGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="65%" stopColor="#ECEEF4" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>
    </defs>
    <path 
      d="M22.5 9C24.433 9 26 10.567 26 12.5C26 13.9118 25.166 15.1292 23.9616 15.6841L26.5 25.5H18.5L21.0384 15.6841C19.834 15.1292 19 13.9118 19 12.5C19 10.567 20.567 9 22.5 9Z" 
      fill="url(#whitePawnGrad)" 
      stroke="#334155" 
      strokeWidth="1.8" 
      strokeLinejoin="round"
    />
    <path 
      d="M14 34C14 30.5 16.5 28 22.5 28C28.5 28 31 30.5 31 34H14Z" 
      fill="url(#whitePawnGrad)" 
      stroke="#334155" 
      strokeWidth="1.8" 
      strokeLinejoin="round"
    />
    <path 
      d="M12 36H33V38H12V36Z" 
      fill="#FFFFFF" 
      stroke="#334155" 
      strokeWidth="1.8"
    />
  </svg>
);

export const PawnBlack: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="blackPawnGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#313B4D" />
        <stop offset="60%" stopColor="#1C2331" />
        <stop offset="100%" stopColor="#080C14" />
      </linearGradient>
    </defs>
    <path 
      d="M22.5 9C24.433 9 26 10.567 26 12.5C26 13.9118 25.166 15.1292 23.9616 15.6841L26.5 25.5H18.5L21.0384 15.6841C19.834 15.1292 19 13.9118 19 12.5C19 10.567 20.567 9 22.5 9Z" 
      fill="url(#blackPawnGrad)" 
      stroke="#F59E0B" 
      strokeWidth="1.8" 
      strokeLinejoin="round"
    />
    <path 
      d="M14 34C14 30.5 16.5 28 22.5 28C28.5 28 31 30.5 31 34H14Z" 
      fill="url(#blackPawnGrad)" 
      stroke="#F59E0B" 
      strokeWidth="1.8" 
      strokeLinejoin="round"
    />
    <path 
      d="M12 36H33V38H12V36Z" 
      fill="#0B0F19" 
      stroke="#F59E0B" 
      strokeWidth="1.8"
    />
  </svg>
);

export const RookWhite: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="whiteRookGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="65%" stopColor="#ECEEF4" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>
    </defs>
    <path d="M12 36H33V38H12V36Z" fill="#FFFFFF" stroke="#334155" strokeWidth="1.8"/>
    <path d="M14 26H31V34H14V26Z" fill="url(#whiteRookGrad)" stroke="#334155" strokeWidth="1.8"/>
    <path d="M12 14L15 24H30L33 14H29V18H25V14H20V18H16V14H12Z" fill="url(#whiteRookGrad)" stroke="#334155" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
);

export const RookBlack: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="blackRookGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#313B4D" />
        <stop offset="60%" stopColor="#1C2331" />
        <stop offset="100%" stopColor="#080C14" />
      </linearGradient>
    </defs>
    <path d="M12 36H33V38H12V36Z" fill="#0B0F19" stroke="#F59E0B" strokeWidth="1.8"/>
    <path d="M14 26H31V34H14V26Z" fill="url(#blackRookGrad)" stroke="#F59E0B" strokeWidth="1.8"/>
    <path d="M12 14L15 24H30L33 14H29V18H25V14H20V18H16V14H12Z" fill="url(#blackRookGrad)" stroke="#F59E0B" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
);

export const KnightWhite: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="whiteKnightGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="65%" stopColor="#ECEEF4" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>
    </defs>
    <path d="M12 36H33V38H12V36Z" fill="#FFFFFF" stroke="#334155" strokeWidth="1.8"/>
    <path d="M33 34C33 30 31.5 25 29.5 21C27.5 17 24.5 13.5 24.5 13.5C24.5 13.5 25.5 11.5 24.5 9.5C23.5 7.5 21 6.5 21 6.5C21 6.5 21.5 8.5 20.5 9.5C19.5 10.5 16 11.5 14 13C12 14.5 11 17.5 11 20C11 22.5 12.5 24.5 13.5 24.5C14.5 24.5 15.5 23 15.5 21.5C15.5 20 16 17 19 17.5L20 22L17.5 26.5L14.5 28.5V34H33Z" fill="url(#whiteKnightGrad)" stroke="#334155" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
);

export const KnightBlack: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="blackKnightGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#313B4D" />
        <stop offset="60%" stopColor="#1C2331" />
        <stop offset="100%" stopColor="#080C14" />
      </linearGradient>
    </defs>
    <path d="M12 36H33V38H12V36Z" fill="#0B0F19" stroke="#F59E0B" strokeWidth="1.8"/>
    <path d="M33 34C33 30 31.5 25 29.5 21C27.5 17 24.5 13.5 24.5 13.5C24.5 13.5 25.5 11.5 24.5 9.5C23.5 7.5 21 6.5 21 6.5C21 6.5 21.5 8.5 20.5 9.5C19.5 10.5 16 11.5 14 13C12 14.5 11 17.5 11 20C11 22.5 12.5 24.5 13.5 24.5C14.5 24.5 15.5 23 15.5 21.5C15.5 20 16 17 19 17.5L20 22L17.5 26.5L14.5 28.5V34H33Z" fill="url(#blackKnightGrad)" stroke="#F59E0B" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
);

export const BishopWhite: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="whiteBishopGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="65%" stopColor="#ECEEF4" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>
    </defs>
    <path d="M12 36H33V38H12V36Z" fill="#FFFFFF" stroke="#334155" strokeWidth="1.8"/>
    <path d="M22.5 8C25.5 8 28 11.5 28 16C28 17.5 27.5 19 26 20.5C24.5 22 25.5 26.5 25.5 28.5H19.5C19.5 26.5 20.5 22 19 20.5C17.5 19 17 17.5 17 16C17 11.5 19.5 8 22.5 8Z" fill="url(#whiteBishopGrad)" stroke="#334155" strokeWidth="1.8" strokeLinejoin="round"/>
    <circle cx="22.5" cy="5.5" r="2" fill="url(#whiteBishopGrad)" stroke="#334155" strokeWidth="1.8"/>
    <path d="M20 14H25M22.5 11.5V16.5" stroke="#475569" strokeWidth="1.5"/>
  </svg>
);

export const BishopBlack: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="blackBishopGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#313B4D" />
        <stop offset="60%" stopColor="#1C2331" />
        <stop offset="100%" stopColor="#080C14" />
      </linearGradient>
    </defs>
    <path d="M12 36H33V38H12V36Z" fill="#0B0F19" stroke="#F59E0B" strokeWidth="1.8"/>
    <path d="M22.5 8C25.5 8 28 11.5 28 16C28 17.5 27.5 19 26 20.5C24.5 22 25.5 26.5 25.5 28.5H19.5C19.5 26.5 20.5 22 19 20.5C17.5 19 17 17.5 17 16C17 11.5 19.5 8 22.5 8Z" fill="url(#blackBishopGrad)" stroke="#F59E0B" strokeWidth="1.8" strokeLinejoin="round"/>
    <circle cx="22.5" cy="5.5" r="2" fill="url(#blackBishopGrad)" stroke="#F59E0B" strokeWidth="1.8"/>
    <path d="M20 14H25M22.5 11.5V16.5" stroke="#F59E0B" strokeWidth="1.5"/>
  </svg>
);

export const QueenWhite: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="whiteQueenGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="65%" stopColor="#ECEEF4" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>
    </defs>
    <path d="M12 36H33V38H12V36Z" fill="#FFFFFF" stroke="#334155" strokeWidth="1.8"/>
    <path d="M11 16L17 31H28L34 16L29 23L22.5 14L16 23L11 16Z" fill="url(#whiteQueenGrad)" stroke="#334155" strokeWidth="1.8" strokeLinejoin="round"/>
    <circle cx="11" cy="14" r="1.5" fill="url(#whiteQueenGrad)" stroke="#334155" strokeWidth="1.2"/>
    <circle cx="17" cy="14" r="1.5" fill="url(#whiteQueenGrad)" stroke="#334155" strokeWidth="1.2"/>
    <circle cx="22.5" cy="11.5" r="1.5" fill="url(#whiteQueenGrad)" stroke="#334155" strokeWidth="1.2"/>
    <circle cx="28" cy="14" r="1.5" fill="url(#whiteQueenGrad)" stroke="#334155" strokeWidth="1.2"/>
    <circle cx="34" cy="14" r="1.5" fill="url(#whiteQueenGrad)" stroke="#334155" strokeWidth="1.2"/>
    <path d="M14 34H31V32H14V34Z" fill="#FFFFFF" stroke="#334155" strokeWidth="1.5"/>
  </svg>
);

export const QueenBlack: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="blackQueenGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#313B4D" />
        <stop offset="60%" stopColor="#1C2331" />
        <stop offset="100%" stopColor="#080C14" />
      </linearGradient>
    </defs>
    <path d="M12 36H33V38H12V36Z" fill="#0B0F19" stroke="#F59E0B" strokeWidth="1.8"/>
    <path d="M11 16L17 31H28L34 16L29 23L22.5 14L16 23L11 16Z" fill="url(#blackQueenGrad)" stroke="#F59E0B" strokeWidth="1.8" strokeLinejoin="round"/>
    <circle cx="11" cy="14" r="1.5" fill="url(#blackQueenGrad)" stroke="#F59E0B" strokeWidth="1.2"/>
    <circle cx="17" cy="14" r="1.5" fill="url(#blackQueenGrad)" stroke="#F59E0B" strokeWidth="1.2"/>
    <circle cx="22.5" cy="11.5" r="1.5" fill="url(#blackQueenGrad)" stroke="#F59E0B" strokeWidth="1.2"/>
    <circle cx="28" cy="14" r="1.5" fill="url(#blackQueenGrad)" stroke="#F59E0B" strokeWidth="1.2"/>
    <circle cx="34" cy="14" r="1.5" fill="url(#blackQueenGrad)" stroke="#F59E0B" strokeWidth="1.2"/>
    <path d="M14 34H31V32H14V34Z" fill="#0B0F19" stroke="#F59E0B" strokeWidth="1.5"/>
  </svg>
);

export const KingWhite: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="whiteKingGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="65%" stopColor="#ECEEF4" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>
    </defs>
    <path d="M12 36H33V38H12V36Z" fill="#FFFFFF" stroke="#334155" strokeWidth="1.8"/>
    <path d="M14 20C14 15 17 11 22.5 11C28 11 31 15 31 20C31 25.5 28.5 32 28.5 34H16.5C16.5 32 14 25.5 14 20Z" fill="url(#whiteKingGrad)" stroke="#334155" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M22.5 5V11M19.5 8H25.5" stroke="#475569" strokeWidth="1.8"/>
    <path d="M14 34H31V32H14V34Z" fill="#FFFFFF" stroke="#334155" strokeWidth="1.5"/>
  </svg>
);

export const KingBlack: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="blackKingGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#313B4D" />
        <stop offset="60%" stopColor="#1C2331" />
        <stop offset="100%" stopColor="#080C14" />
      </linearGradient>
    </defs>
    <path d="M12 36H33V38H12V36Z" fill="#0B0F19" stroke="#F59E0B" strokeWidth="1.8"/>
    <path d="M14 20C14 15 17 11 22.5 11C28 11 31 15 31 20C31 25.5 28.5 32 28.5 34H16.5C16.5 32 14 25.5 14 20Z" fill="url(#blackKingGrad)" stroke="#F59E0B" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M22.5 5V11M19.5 8H25.5" stroke="#F59E0B" strokeWidth="1.8"/>
    <path d="M14 34H31V32H14V34Z" fill="#0B0F19" stroke="#F59E0B" strokeWidth="1.5"/>
  </svg>
);

export const renderPiece = (type: string, color: string, className?: string) => {
  const normType = type.toLowerCase();
  if (color === 'w') {
    switch (normType) {
      case 'p': return <PawnWhite className={className} />;
      case 'r': return <RookWhite className={className} />;
      case 'n': return <KnightWhite className={className} />;
      case 'b': return <BishopWhite className={className} />;
      case 'q': return <QueenWhite className={className} />;
      case 'k': return <KingWhite className={className} />;
    }
  } else {
    switch (normType) {
      case 'p': return <PawnBlack className={className} />;
      case 'r': return <RookBlack className={className} />;
      case 'n': return <KnightBlack className={className} />;
      case 'b': return <BishopBlack className={className} />;
      case 'q': return <QueenBlack className={className} />;
      case 'k': return <KingBlack className={className} />;
    }
  }
  return null;
};
