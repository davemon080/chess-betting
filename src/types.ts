export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  balance: number;
  wins: number;
  losses: number;
  draws: number;
  rating: number;
  status?: 'online' | 'offline';
  lastActiveAt?: number;
  createdAt: any;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: any;
  read: boolean;
  type: 'info' | 'success' | 'alert';
}


export interface ChessMatch {
  id: string;
  betAmount: number;
  timeControl: string;
  creatorId: string;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  whitePlayerName: string | null;
  blackPlayerName: string | null;
  whitePlayerPhoto: string | null;
  blackPlayerPhoto: string | null;
  status: 'waiting' | 'playing' | 'completed' | 'cancelled' | 'draw';
  winnerId: string | null;
  turn: 'w' | 'b';
  fen: string;
  moves: string[];
  endReason: string | null;
  isDrawOfferedBy: string | null;
  drawDeclinedBy?: string | null;
  challengedUserId?: string | null;
  challengedUserName?: string | null;
  createdAt: any;
  updatedAt: any;
}

export interface MatchMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}

/**
 * Deterministically generates a unique user ID of format NX-[A-Z]{2}[0-9]{2}
 * based on a user's Firebase UID. This keeps sandboxed IDs clean and uniform (e.g., NX-DS01).
 */
export function getFormattedUserId(uid: string): string {
  if (!uid) return "NX-AA01";
  
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < uid.length; i++) {
    const char = uid.charCodeAt(i);
    if (i % 2 === 0) {
      hash1 = (hash1 * 31 + char) % 676; // 26 * 26 options
    } else {
      hash2 = (hash2 * 17 + char) % 100; // 0-99 option
    }
  }
  
  const char1 = String.fromCharCode(65 + Math.floor(hash1 / 26));
  const char2 = String.fromCharCode(65 + (hash1 % 26));
  const numPart = hash2.toString().padStart(2, '0');
  
  return `NX-${char1}${char2}${numPart}`;
}
