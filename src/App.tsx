/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  addDoc,
  writeBatch,
  increment
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, signInAnonymously } from 'firebase/auth';
import { Chess } from 'chess.js';
import { ShieldCheck, LogOut, Wallet, User, Swords, ShieldAlert, Award, Sparkles, Coins, Gamepad2, Bell, Check, Copy } from 'lucide-react';

import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, ChessMatch, MatchMessage, getFormattedUserId, NotificationItem } from './types';
import { LobbyPanel } from './components/LobbyPanel';
import { ActiveGamePanel } from './components/ActiveGamePanel';
import { Leaderboard } from './components/Leaderboard';
import { WalletDialog } from './components/WalletDialog';
import { ProfilePage } from './components/ProfilePage';
import { ActiveUsersPanel } from './components/ActiveUsersPanel';
import { NotificationsPage } from './components/NotificationsPage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeMatch, setActiveMatch] = useState<ChessMatch | null>(null);
  const [lobbyMatches, setLobbyMatches] = useState<ChessMatch[]>([]);
  const [leaderboardUsers, setLeaderboardUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [messages, setMessages] = useState<MatchMessage[]>([]);
  const [acceptedMatchNotification, setAcceptedMatchNotification] = useState<ChessMatch | null>(null);
  
  const [showWallet, setShowWallet] = useState<boolean>(false);
  const [showProfilePage, setShowProfilePage] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [gladiatorPage, setGladiatorPage] = useState<boolean>(false);
  const [isLobbyLoading, setIsLobbyLoading] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [guestNameInput, setGuestNameInput] = useState<string>('');
  const [isLoggingInAnonymously, setIsLoggingInAnonymously] = useState<boolean>(false);

  const [showNotificationsPage, setShowNotificationsPage] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [gameOutcomeAlert, setGameOutcomeAlert] = useState<{ winnerId?: string; status: string; endReason: string; betAmount: number } | null>(null);
  const [drawDeclinedAlert, setDrawDeclinedAlert] = useState<boolean>(false);

  // 1. Auth states observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecking(true);
      if (user) {
        setCurrentUser(user);
        
        // Ensure profile doc exists in database
        const profileRef = doc(db, 'users', user.uid);
        try {
          const snap = await getDoc(profileRef);
          if (!snap.exists()) {
            // Check if there is a temp guest nickname stored during sandbox guest sign in
            const savedTempName = localStorage.getItem('temp_guest_nickname');
            if (savedTempName) {
              localStorage.removeItem('temp_guest_nickname');
            }
            const defaultName = savedTempName || user.displayName || user.email?.split('@')[0] || 'Chess Gladiator';

            // First time registration: credit $1,000 for sandboxed betting!
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: defaultName,
              photoURL: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`,
              email: user.email || '',
              balance: 1000.00,
              wins: 0,
              losses: 0,
              draws: 0,
              rating: 1200,
              status: 'online',
              lastActiveAt: Date.now(),
              createdAt: serverTimestamp(),
            };
            await setDoc(profileRef, newProfile);
            setUserProfile(newProfile);

            // Create welcome notification
            const welcomeNotif: NotificationItem = {
              id: 'welcome-seed',
              title: 'Welcome Gladiator!',
              message: 'Your registration on Chess Gladiators clearings is successful. You have been credited with ₦1,000.00 for sandboxed betting!',
              createdAt: new Date(),
              read: false,
              type: 'success'
            };
            await setDoc(doc(db, 'users', user.uid, 'notifications', welcomeNotif.id), welcomeNotif);
          } else {
            const data = snap.data();
            // Upkeep session and online status
            await updateDoc(profileRef, {
              status: 'online',
              lastActiveAt: Date.now()
            });
            setUserProfile({
              rating: 1200,
              ...data,
              status: 'online',
              lastActiveAt: Date.now()
            } as UserProfile);
          }
        } catch (e) {
          console.error("Error matching profile initialization:", e);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setActiveMatch(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time User Profile observer
  useEffect(() => {
    if (!currentUser) return;
    const profileRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile({
          rating: 1200,
          ...data
        } as UserProfile);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Real-time Notifications observer
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const notificationsRef = collection(db, 'users', currentUser.uid, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(30));
    const unsubscribe = onSnapshot(q, (snap) => {
      const nList: NotificationItem[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        let cAt = data.createdAt;
        if (cAt && typeof cAt.toDate === 'function') {
          cAt = cAt.toDate();
        } else if (cAt) {
          cAt = new Date(cAt);
        } else {
          cAt = new Date();
        }
        nList.push({
          id: docSnap.id,
          ...data,
          createdAt: cAt
        } as NotificationItem);
      });
      setNotifications(nList);
    }, (error) => {
      console.warn("Notifications subscription query:", error);
      // Fallback notifications if collection is not seeded
      setNotifications([{
        id: 'welcome-seed',
        title: 'Welcome Gladiator!',
        message: 'Your registration on Chess Gladiators clearings is successful. You have been credited with ₦1,000.00 for sandboxed betting!',
        createdAt: new Date(),
        read: false,
        type: 'success'
      }]);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 3. Real-time Leaderboard list
  useEffect(() => {
    if (!currentUser) return;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('balance', 'desc'), limit(15));
    const unsubscribe = onSnapshot(q, (snap) => {
      const uList: UserProfile[] = [];
      snap.forEach((docSnap) => {
        const uData = docSnap.data();
        uList.push({
          rating: 1200,
          ...uData
        } as UserProfile);
      });
      setLeaderboardUsers(uList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 4. Real-time Games Match lobby observer
  useEffect(() => {
    if (!currentUser) return;
    const gamesRef = collection(db, 'games');
    // We fetch open lobbies or lobbies user is engaged in
    const unsubscribe = onSnapshot(gamesRef, async (snap) => {
      const gList: ChessMatch[] = [];
      
      for (const docSnap of snap.docs) {
        const item = docSnap.data() as any;
        const matchId = docSnap.id;

        // Check if I am the creator of a game that was cancelled
        if (item.creatorId === currentUser.uid && item.status === 'cancelled') {
          // Process refund and delete reactive step!
          if (!checkAndMarkProcessed(matchId, 'cancelled_refund')) {
            const matchRef = doc(db, 'games', matchId);
            const profileRef = doc(db, 'users', currentUser.uid);
            const batch = writeBatch(db);
            
            // Refund the creator
            batch.update(profileRef, {
              balance: increment(item.betAmount || 0)
            });
            // Clean up the cancelled game document by deleting it
            batch.delete(matchRef);
            
            try {
              await batch.commit();
              console.log(`Successfully reacted, refunded ₦${item.betAmount} to creator and deleted cancelled game ${matchId}`);
            } catch (err) {
              console.error("Reactor failed to finalize refund/delete batch:", err);
            }
          }
          continue; // Skip adding to the list since it's cancelled/deleted
        }

        gList.push({
          id: matchId,
          ...item,
        } as ChessMatch);
      }
      setLobbyMatches(gList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'games');
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 5. Real-time All Users observer for Gladiator Directory
  useEffect(() => {
    if (!currentUser) return;
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snap) => {
      const uList: UserProfile[] = [];
      snap.forEach((docSnap) => {
        const uData = docSnap.data();
        uList.push({
          rating: 1200,
          ...uData
        } as UserProfile);
      });
      setAllUsers(uList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 6. Monitor if any of my created matches has been accepted
  useEffect(() => {
    if (!currentUser || activeMatch) {
      setAcceptedMatchNotification(null);
      return;
    }

    const activeCreatedPlaying = lobbyMatches.find(m => 
      m.creatorId === currentUser.uid && 
      m.status === 'playing'
    );

    if (activeCreatedPlaying) {
      const isDismissed = localStorage.getItem(`dismissed_notification_${activeCreatedPlaying.id}`);
      if (!isDismissed) {
        setAcceptedMatchNotification(activeCreatedPlaying);
      }
    } else {
      setAcceptedMatchNotification(null);
    }
  }, [lobbyMatches, currentUser, activeMatch]);

  // Safely track and persist processed matches to prevent double award claims of sandbox credits
  const checkAndMarkProcessed = (matchId: string, outcomeType: string): boolean => {
    if (!currentUser) return true;
    const key = `processed_match_${currentUser.uid}_${matchId}_${outcomeType}`;
    if (localStorage.getItem(key)) {
      return true; // Already processed!
    }
    localStorage.setItem(key, 'true');
    return false; // Not processed yet
  };

  // 5. Active Match Details listener (whenever activeMatch state ID is selected)
  useEffect(() => {
    if (!currentUser || !activeMatch?.id) {
      setMessages([]);
      return;
    }

    const matchRef = doc(db, 'games', activeMatch.id);
    const unsubscribeMatch = onSnapshot(matchRef, async (snap) => {
      if (snap.exists()) {
        const item = snap.data() as ChessMatch;

        // Check if draw proposed by me was declined by opponent
        if (item.drawDeclinedBy && item.drawDeclinedBy !== currentUser.uid) {
          setDrawDeclinedAlert(true);
          try {
            await updateDoc(matchRef, { drawDeclinedBy: null });
          } catch (err) {
            console.error("Failed to clear drawDeclinedBy record:", err);
          }
        }

        // Process outcomes securely and redirect to landing page if game has ended
        if (item.status === 'completed' || item.status === 'draw') {
          const isPlayer = item.whitePlayerId === currentUser.uid || item.blackPlayerId === currentUser.uid;

          if (isPlayer) {
            const isCompMatch = item.whitePlayerId === 'computer_ai' || item.blackPlayerId === 'computer_ai';

            if (item.status === 'completed' && item.winnerId) {
              const isWinner = item.winnerId === currentUser.uid;
              const roleKey = isWinner ? 'win' : 'loss';

              if (isCompMatch) {
                if (!checkAndMarkProcessed(snap.id, `comp_${roleKey}`)) {
                  const profileRef = doc(db, 'users', currentUser.uid);
                  try {
                    const currentProfileSnap = await getDoc(profileRef);
                    if (currentProfileSnap.exists()) {
                      const pData = currentProfileSnap.data() as UserProfile;
                      const currentRating = pData.rating || 1200;
                      if (isWinner) {
                        await updateDoc(profileRef, {
                          wins: pData.wins + 1,
                          rating: currentRating + 3,
                        });
                        await createNotification(
                          currentUser.uid,
                          'Practice Victory! 🤖',
                          `Superb! You defeated the Deep AI Engine in a tactical duel! Your arena rating has climbed by +3.`,
                          'success'
                        );
                      } else {
                        await updateDoc(profileRef, {
                          losses: pData.losses + 1,
                          rating: Math.max(100, currentRating - 2),
                        });
                        await createNotification(
                          currentUser.uid,
                          'Practice Defeat ⚙️',
                          `Your dual-board was bested by the Deep AI Engine. Keep practicing! Rating decreased by -2.`,
                          'info'
                        );
                      }
                    }
                  } catch (err) {
                    console.error("AI automated outcome stats update failed:", err);
                  }
                }
              } else {
                // Real human opponent
                if (!checkAndMarkProcessed(snap.id, roleKey)) {
                  const profileRef = doc(db, 'users', currentUser.uid);
                  try {
                    const currentProfileSnap = await getDoc(profileRef);
                    if (currentProfileSnap.exists()) {
                      const pData = currentProfileSnap.data() as UserProfile;
                      const currentRating = pData.rating || 1200;
                      if (isWinner) {
                        const payoutVal = item.betAmount * 2;
                        await updateDoc(profileRef, {
                          balance: pData.balance + payoutVal,
                          wins: pData.wins + 1,
                          rating: currentRating + 15,
                        });
                        await createNotification(
                          currentUser.uid,
                          'Match Won! 🏆',
                          `Congratulations! You beat your opponent in a high-stakes duel and received a payout of ₦${payoutVal.toLocaleString()}! Your arena rating has climbed by +15.`,
                          'success'
                        );
                      } else {
                        await updateDoc(profileRef, {
                          losses: pData.losses + 1,
                          rating: Math.max(100, currentRating - 10),
                        });
                        await createNotification(
                          currentUser.uid,
                          'Match Lost ⚔️',
                          `Defeat in battle. Your opponent won the duel of ₦${item.betAmount.toLocaleString()}. Keep training, Gladiator! Your rating decreased by -10.`,
                          'alert'
                        );
                      }
                    }
                  } catch (err) {
                    console.error("Local outcome profile update failed:", err);
                  }
                }
              }
            } else if (item.status === 'draw') {
              if (isCompMatch) {
                if (!checkAndMarkProcessed(snap.id, 'comp_draw')) {
                  const profileRef = doc(db, 'users', currentUser.uid);
                  try {
                    const currentProfileSnap = await getDoc(profileRef);
                    if (currentProfileSnap.exists()) {
                      const pData = currentProfileSnap.data() as UserProfile;
                      await updateDoc(profileRef, {
                        draws: pData.draws + 1,
                      });
                      await createNotification(
                        currentUser.uid,
                        'Practice Draw settle 🤝',
                        `Stalemate settled with the Chess AI Engine. Nice effort!`,
                        'info'
                      );
                    }
                  } catch (err) {
                    console.error("Comp drawn stats update failed:", err);
                  }
                }
              } else {
                // Mutual human draws
                if (!checkAndMarkProcessed(snap.id, 'draw')) {
                  const profileRef = doc(db, 'users', currentUser.uid);
                  try {
                    const currentProfileSnap = await getDoc(profileRef);
                    if (currentProfileSnap.exists()) {
                      const pData = currentProfileSnap.data() as UserProfile;
                      await updateDoc(profileRef, {
                        balance: pData.balance + item.betAmount,
                        draws: pData.draws + 1,
                      });
                      await createNotification(
                        currentUser.uid,
                        'Mutual Draw Settled 🤝',
                        `The match was drawn by agreement. Your stake of ₦${item.betAmount.toLocaleString()} has been safely returned to your wallet.`,
                        'info'
                      );
                    }
                  } catch (err) {
                    console.error("Local draw profile update failed:", err);
                  }
                }
              }
            }
          }

          // Trigger screen outcome indicator popup
          setGameOutcomeAlert({
            winnerId: item.winnerId || undefined,
            status: item.status,
            endReason: item.endReason || 'Game completed.',
            betAmount: item.betAmount,
          });

          // Redirect back to landing page dashboard immediately
          setActiveMatch(null);
          return;
        }

        setActiveMatch({
          id: snap.id,
          ...item,
        } as ChessMatch);

      } else {
        setActiveMatch(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `games/${activeMatch.id}`);
    });

    // Subcollection messaging listener
    const msgsRef = collection(db, 'games', activeMatch.id, 'messages');
    const qMsgs = query(msgsRef, orderBy('createdAt', 'asc'), limit(80));
    const unsubscribeMsgs = onSnapshot(qMsgs, (snap) => {
      const mList: MatchMessage[] = [];
      snap.forEach((childSnap) => {
        mList.push({
          id: childSnap.id,
          ...childSnap.data(),
        } as MatchMessage);
      });
      setMessages(mList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `games/${activeMatch?.id}/messages`);
    });

    return () => {
      unsubscribeMatch();
      unsubscribeMsgs();
    };
  }, [currentUser, activeMatch?.id]);

  // Computer AI Opponent automated moves resolver
  useEffect(() => {
    if (!activeMatch || activeMatch.status !== 'playing') return;
    
    const isCompWhite = activeMatch.whitePlayerId === 'computer_ai';
    const isCompBlack = activeMatch.blackPlayerId === 'computer_ai';
    const isCompTurn = (activeMatch.turn === 'w' && isCompWhite) || (activeMatch.turn === 'b' && isCompBlack);
    
    if (!isCompTurn) return;

    const timeoutId = setTimeout(async () => {
      try {
        const chess = new Chess(activeMatch.fen);
        const legalMoves = chess.moves({ verbose: true });
        
        if (legalMoves.length === 0) {
          const resultStatus = chess.isCheckmate() ? 'completed' : 'draw';
          const endReason = chess.isCheckmate()
            ? `Checkmate. Deep AI Engine defeat.`
            : 'Draw stalemate settled with AI Engine.';
          
          const matchRef = doc(db, 'games', activeMatch.id);
          await updateDoc(matchRef, {
            status: resultStatus,
            endReason,
            winnerId: chess.isCheckmate() 
              ? (activeMatch.turn === 'w' ? activeMatch.blackPlayerId : activeMatch.whitePlayerId)
              : null
          });
          return;
        }

        const captures = legalMoves.filter(m => m.captured);
        const selected = captures.length > 0
          ? captures[Math.floor(Math.random() * captures.length)]
          : legalMoves[Math.floor(Math.random() * legalMoves.length)];

        chess.move({ from: selected.from, to: selected.to, promotion: 'q' });

        const moveText = `${selected.from}-${selected.to}`;
        const updatedMoves = [...(activeMatch.moves || []), moveText];
        const nextTurn = activeMatch.turn === 'w' ? 'b' : 'w';
        const nextFen = chess.fen();

        let nextStatus = 'playing';
        let endReason = '';
        let winnerId: string | null = null;

        if (chess.isGameOver()) {
          if (chess.isCheckmate()) {
            nextStatus = 'completed';
            winnerId = 'computer_ai';
            endReason = 'Checkmate. Payout claim failed against Deep AI Engine.';
          } else if (chess.isDraw()) {
            nextStatus = 'draw';
            endReason = 'Draw. Computer match draws.';
          }
        }

        const matchRef = doc(db, 'games', activeMatch.id);
        await updateDoc(matchRef, {
          fen: nextFen,
          turn: nextTurn,
          moves: updatedMoves,
          status: nextStatus,
          endReason,
          winnerId,
        });

      } catch (err) {
        console.error("AI automated execution failure:", err);
      }
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, [activeMatch?.fen, activeMatch?.turn, activeMatch?.id]);

  // Initiate Computer AI Singleplayer Practice Matchmaker
  const handleStartComputerMatch = async (timeControl: string, colorPref: 'w' | 'b' | 'random') => {
    if (!currentUser || !userProfile) return;
    setIsLobbyLoading(true);
    setErrorMessage(null);
    try {
      let assignedColor: 'w' | 'b' = 'w';
      if (colorPref === 'random') {
        assignedColor = Math.random() > 0.5 ? 'w' : 'b';
      } else {
        assignedColor = colorPref;
      }

      const matchId = `comp-${currentUser.uid}-${Date.now()}`;
      const compMatch: ChessMatch = {
        id: matchId,
        creatorId: currentUser.uid,
        whitePlayerId: assignedColor === 'w' ? currentUser.uid : 'computer_ai',
        whitePlayerName: assignedColor === 'w' ? userProfile.displayName : 'Deep AI Engine',
        whitePlayerPhoto: assignedColor === 'w' ? userProfile.photoURL : 'https://api.dicebear.com/7.x/bottts/svg?seed=deep-ai',
        blackPlayerId: assignedColor === 'b' ? currentUser.uid : 'computer_ai',
        blackPlayerName: assignedColor === 'b' ? userProfile.displayName : 'Deep AI Engine',
        blackPlayerPhoto: assignedColor === 'b' ? userProfile.photoURL : 'https://api.dicebear.com/7.x/bottts/svg?seed=deep-ai',
        betAmount: 0,
        timeControl,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'w',
        winnerId: null,
        moves: [],
        status: 'playing',
        endReason: null,
        isDrawOfferedBy: null,
        drawDeclinedBy: null,
        createdAt: new Date() as any, // fallback local time
        updatedAt: new Date() as any,
      };

      await setDoc(doc(db, 'games', matchId), compMatch);
      setActiveMatch(compMatch);
    } catch (e: any) {
      console.error("Failed to start computer match:", e);
      setErrorMessage(e.message || "Failed to initiate practice opponent.");
    } finally {
      setIsLobbyLoading(false);
    }
  };

  // Auth logins via Google
  const handleLogin = async () => {
    try {
      setErrorMessage(null);
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      console.error("Auth trigger error:", e);
      if (e?.code === 'auth/popup-closed-by-user' || e?.message?.includes('popup-closed')) {
        setErrorMessage(
          "The Google sign-in window was closed or blocked. If you are playing within the preview frame, please try clicking 'Open in New Tab' (desktop icon top right), disable popup blocks under browser settings, or sign-in instantly as a Guest below!"
        );
      } else {
        setErrorMessage(e?.message || "Verification auth login aborted.");
      }
    }
  };

  // Instant Guest Logins via Anonymous Firebase Session
  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingInAnonymously(true);
    setErrorMessage(null);
    try {
      const count = Math.floor(100 + Math.random() * 900);
      const finalName = guestNameInput.trim() || `GuestGladiator_${count}`;
      localStorage.setItem('temp_guest_nickname', finalName);
      await signInAnonymously(auth);
    } catch (e: any) {
      setErrorMessage(e?.message || "Failed to initiate Guest session.");
    } finally {
      setIsLoggingInAnonymously(false);
    }
  };

  // Auth logouts
  const handleLogout = async () => {
    try {
      if (currentUser) {
        const profileRef = doc(db, 'users', currentUser.uid);
        await updateDoc(profileRef, {
          status: 'offline',
          lastActiveAt: Date.now()
        });
      }
      await signOut(auth);
    } catch (e) {
      console.error("Error signing out:", e);
    }
  };

  // Deposit credit dialog transaction
  const handleDepositWallet = async (amount: number) => {
    if (!currentUser || !userProfile) return;
    const profileRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(profileRef, {
        balance: userProfile.balance + amount,
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  // Withdraw credit transaction from bank settlement form
  const handleWithdrawFunds = async (amount: number) => {
    if (!currentUser || !userProfile) return;
    if (userProfile.balance < amount) {
      throw new Error("Insufficient account balance for withdrawal.");
    }
    const profileRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(profileRef, {
        balance: userProfile.balance - amount,
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}`);
      throw e;
    }
  };

  // Helper to issue background notifications in Firestore subcollections
  const createNotification = async (uid: string, title: string, message: string, type: 'info' | 'success' | 'alert' = 'info') => {
    try {
      const notifRef = doc(db, 'users', uid, 'notifications', `${type}-${Date.now()}-${Math.floor(Math.random()*1000)}`);
      await setDoc(notifRef, {
        title,
        message,
        read: false,
        type,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error issuing background notification:", err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      if (!n.read) {
        const notifRef = doc(db, 'users', currentUser.uid, 'notifications', n.id);
        batch.update(notifRef, { read: true });
      }
    });
    try {
      await batch.commit();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!currentUser) return;
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      const notifRef = doc(db, 'users', currentUser.uid, 'notifications', n.id);
      batch.delete(notifRef);
    });
    try {
      await batch.commit();
      setShowNotificationsPage(false);
    } catch (err) {
      console.error("Failed to clear all notifications:", err);
    }
  };

  const handleDeleteSingleNotification = async (id: string) => {
    if (!currentUser) return;
    const notifRef = doc(db, 'users', currentUser.uid, 'notifications', id);
    try {
      await updateDoc(notifRef, { read: true }); // mark read first
      const batch = writeBatch(db);
      batch.delete(notifRef);
      await batch.commit();
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };


  // Host/Create Lobby Room
  const handleCreateMatch = async (
    betAmount: number, 
    timeControl: string, 
    colorPref: 'w' | 'b' | 'random'
  ) => {
    if (!currentUser || !userProfile) return;
    setIsLobbyLoading(true);

    try {
      if (userProfile.balance < betAmount) {
        throw new Error(`Insufficient wallet reserves! You need $${betAmount} but only have $${userProfile.balance.toFixed(2)}`);
      }

      const playSide = colorPref === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorPref;
      const initialChess = new Chess(); // Initial standard board FEN

      const newMatchData: any = {
        betAmount,
        timeControl,
        creatorId: currentUser.uid,
        status: 'waiting', 
        turn: 'w',
        fen: initialChess.fen(),
        moves: [],
        endReason: null,
        isDrawOfferedBy: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (playSide === 'w') {
        newMatchData.whitePlayerId = currentUser.uid;
        newMatchData.whitePlayerName = userProfile.displayName;
        newMatchData.whitePlayerPhoto = userProfile.photoURL;
        newMatchData.blackPlayerId = null;
        newMatchData.blackPlayerName = null;
        newMatchData.blackPlayerPhoto = null;
      } else {
        newMatchData.blackPlayerId = currentUser.uid;
        newMatchData.blackPlayerName = userProfile.displayName;
        newMatchData.blackPlayerPhoto = userProfile.photoURL;
        newMatchData.whitePlayerId = null;
        newMatchData.whitePlayerName = null;
        newMatchData.whitePlayerPhoto = null;
      }

      const matchRef = doc(collection(db, 'games'));
      const profileRef = doc(db, 'users', currentUser.uid);

      const batch = writeBatch(db);
      // Deduct balance from host
      batch.update(profileRef, {
        balance: userProfile.balance - betAmount
      });
      // Set the match doc
      batch.set(matchRef, newMatchData);

      await batch.commit();

      setActiveMatch({
        id: matchRef.id,
        ...newMatchData,
      } as ChessMatch);

    } catch (e: any) {
      setErrorMessage(e?.message || "Could not establish lobby server room.");
      console.error(e);
    } finally {
      setIsLobbyLoading(false);
    }
  };

  // Send direct Duel challenge to an active user
  const handleSendChallenge = async (
    challengedUserId: string,
    challengedName: string,
    betAmount: number,
    timeControl: string,
    colorPref: 'w' | 'b' | 'random'
  ) => {
    if (!currentUser || !userProfile) return;
    setIsLobbyLoading(true);

    try {
      if (userProfile.balance < betAmount) {
        throw new Error(`Insufficient wallet reserves! You need ₦${betAmount} but only have ₦${userProfile.balance.toFixed(2)}`);
      }

      const playSide = colorPref === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorPref;
      const initialChess = new Chess();

      const newMatchData: any = {
        betAmount,
        timeControl,
        creatorId: currentUser.uid,
        status: 'waiting', 
        turn: 'w',
        fen: initialChess.fen(),
        moves: [],
        endReason: null,
        isDrawOfferedBy: null,
        challengedUserId,
        challengedUserName: challengedName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (playSide === 'w') {
        newMatchData.whitePlayerId = currentUser.uid;
        newMatchData.whitePlayerName = userProfile.displayName;
        newMatchData.whitePlayerPhoto = userProfile.photoURL;
        newMatchData.blackPlayerId = null;
        newMatchData.blackPlayerName = null;
        newMatchData.blackPlayerPhoto = null;
      } else {
        newMatchData.blackPlayerId = currentUser.uid;
        newMatchData.blackPlayerName = userProfile.displayName;
        newMatchData.blackPlayerPhoto = userProfile.photoURL;
        newMatchData.whitePlayerId = null;
        newMatchData.whitePlayerName = null;
        newMatchData.whitePlayerPhoto = null;
      }

      const matchRef = doc(collection(db, 'games'));
      const profileRef = doc(db, 'users', currentUser.uid);

      const batch = writeBatch(db);
      // Deduct balance from challenger
      batch.update(profileRef, {
        balance: userProfile.balance - betAmount
      });
      // Set the match doc
      batch.set(matchRef, newMatchData);

      await batch.commit();

      // Dispatch background notification to the challenged user
      await createNotification(
        challengedUserId,
        'New Duel Challenge! ⚔️',
        `Gladiator ${userProfile.displayName} has challenged you to a Chess Duel with a stake of ₦${betAmount.toLocaleString()}. Check your incoming duels list!`,
        'info'
      );

      setActiveMatch({
        id: matchRef.id,
        ...newMatchData,
      } as ChessMatch);

    } catch (e: any) {
      setErrorMessage(e?.message || "Could not dispatch board duel challenge.");
      console.error(e);
      throw e;
    } finally {
      setIsLobbyLoading(false);
    }
  };

  // Safe Cancel and Refund match lobby function
  const handleCancelMatch = async (matchId: string) => {
    if (!currentUser || !userProfile) return;
    setIsLobbyLoading(true);

    const matchRef = doc(db, 'games', matchId);
    try {
      const matchSnap = await getDoc(matchRef);
      if (!matchSnap.exists()) {
        throw new Error("Lobby game does not exist");
      }

      const match = matchSnap.data() as ChessMatch;
      const isCreator = match.creatorId === currentUser.uid;
      const isChallenged = match.challengedUserId === currentUser.uid;

      if (!isCreator && !isChallenged) {
        throw new Error("Only the creator or the challenged player can cancel or decline this match");
      }
      if (match.status !== 'waiting') {
        throw new Error("Game is already in progress or completed");
      }

      if (isChallenged && !isCreator) {
        // Challenged player declining/cancelling - securely mark match as cancelled.
        // The creator's local reactive worker will detect this, issue the refund, and delete the doc.
        await updateDoc(matchRef, {
          status: 'cancelled',
          updatedAt: serverTimestamp()
        });
      } else {
        // Creator cancelling - can securely refund directly
        const batch = writeBatch(db);

        // 1. Delete the match document
        batch.delete(matchRef);

        // 2. Refund the bet amount to the creator
        const creatorProfileRef = doc(db, 'users', match.creatorId);
        batch.update(creatorProfileRef, {
          balance: increment(match.betAmount)
        });

        await batch.commit();
      }
    } catch (e: any) {
      setErrorMessage(e?.message || "Could not cancel match.");
      console.error(e);
    } finally {
      setIsLobbyLoading(false);
    }
  };

  // Join Open Lobby and Deduct Bet Escrows Atomically (no cross-user writes!)
  const handleJoinMatch = async (matchId: string) => {
    if (!currentUser || !userProfile) return;
    setIsLobbyLoading(true);

    const matchRef = doc(db, 'games', matchId);
    
    try {
      const matchSnap = await getDoc(matchRef);
      if (!matchSnap.exists()) {
        throw new Error("Lobby game was cancelled or removed");
      }

      const match = matchSnap.data() as ChessMatch;
      if (match.status !== 'waiting') {
        throw new Error("Game is no longer accepting players");
      }

      if (userProfile.balance < match.betAmount) {
        throw new Error(`Insufficient wallet reserves! You need ₦${match.betAmount} but only have ₦${userProfile.balance.toFixed(2)}`);
      }

      // Identify our side
      const vacantSide = match.whitePlayerId === null ? 'w' : 'b';

      const batch = writeBatch(db);

      // 1. Deduct from Joiner (non-relational, safe!)
      const joinerRef = doc(db, 'users', currentUser.uid);
      batch.update(joinerRef, {
        balance: userProfile.balance - match.betAmount
      });

      // 2. Setup game update payload
      const updatePayload: any = {
        status: 'playing',
        updatedAt: serverTimestamp(),
      };

      if (vacantSide === 'w') {
        updatePayload.whitePlayerId = currentUser.uid;
        updatePayload.whitePlayerName = userProfile.displayName;
        updatePayload.whitePlayerPhoto = userProfile.photoURL;
      } else {
        updatePayload.blackPlayerId = currentUser.uid;
        updatePayload.blackPlayerName = userProfile.displayName;
        updatePayload.blackPlayerPhoto = userProfile.photoURL;
      }

      batch.update(matchRef, updatePayload);

      // Commit the transaction
      await batch.commit();

      setActiveMatch({
        ...match,
        id: matchId,
        ...updatePayload,
      } as ChessMatch);

    } catch (e: any) {
      setErrorMessage(e?.message || "Matching join transaction failed.");
    } finally {
      setIsLobbyLoading(false);
    }
  };

  // Handle Turn Moves in Game State
  const handleMakeMove = async (from: string, to: string, promotion?: string) => {
    if (!currentUser || !activeMatch) return;

    // Local dry run to validate rules and generate notation
    const gameEngine = new Chess(activeMatch.fen);
    
    // Determine target promotion (Standard Auto Queen or designated choice)
    let moveResult = null;
    try {
      moveResult = gameEngine.move({
        from: from,
        to: to,
        promotion: promotion || 'q',
      });
    } catch (e) {
      console.log("Invalid move trial:", e);
      return;
    }

    if (!moveResult) return; // Invalid move

    const newFen = gameEngine.fen();
    const moveNotation = moveResult.san; // Standard Chess Algebraic notation (e.g. e4, Nf3)
    const updatedMoves = [...(activeMatch.moves || []), moveNotation];
    const nextTurn = gameEngine.turn(); // 'w' or 'b'

    const matchRef = doc(db, 'games', activeMatch.id);
    const updatePayload: any = {
      fen: newFen,
      moves: updatedMoves,
      turn: nextTurn,
      updatedAt: serverTimestamp(),
    };

    // Check game terminals
    if (gameEngine.isCheckmate()) {
      updatePayload.status = 'completed';
      updatePayload.winnerId = currentUser.uid;
      updatePayload.endReason = `Checkmate! Victory goes to ${userProfile?.displayName}`;
    } else if (gameEngine.isDraw()) {
      updatePayload.status = 'draw';
      updatePayload.endReason = "Stalemate draw / Insufficient active materials";
    }

    try {
      await updateDoc(matchRef, updatePayload);
    } catch (writeErr) {
      handleFirestoreError(writeErr, OperationType.UPDATE, `games/${activeMatch.id}`);
    }
  };

  // Resign Stakes Game Operation
  const handleResign = async () => {
    if (!currentUser || !activeMatch) return;

    const opId = currentUser.uid === activeMatch.whitePlayerId 
      ? activeMatch.blackPlayerId 
      : activeMatch.whitePlayerId;

    if (!opId) return;

    const matchRef = doc(db, 'games', activeMatch.id);
    
    try {
      // Setup payload updates
      const updatePayload = {
        status: 'completed' as const,
        winnerId: opId,
        endReason: `${userProfile?.displayName} resigned from play. Winner claims Stakes!`,
        updatedAt: serverTimestamp(),
      };

      // update match status
      await updateDoc(matchRef, updatePayload);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `games/${activeMatch.id}`);
    }
  };

  // Offer Draw Agreement
  const handleOfferDraw = async () => {
    if (!currentUser || !activeMatch) return;

    const matchRef = doc(db, 'games', activeMatch.id);
    try {
      await updateDoc(matchRef, {
        isDrawOfferedBy: currentUser.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `games/${activeMatch.id}`);
    }
  };

  // Accept Draw Agreement (Triggers Refund)
  const handleAcceptDraw = async () => {
    if (!currentUser || !activeMatch) return;

    const matchRef = doc(db, 'games', activeMatch.id);
    try {
      await updateDoc(matchRef, {
        status: 'draw',
        endReason: "Draw settled by mutual agreement",
        isDrawOfferedBy: null,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `games/${activeMatch.id}`);
    }
  };

  // Decline Draw Agreement
  const handleDeclineDraw = async () => {
    if (!currentUser || !activeMatch) return;

    const matchRef = doc(db, 'games', activeMatch.id);
    try {
      await updateDoc(matchRef, {
        isDrawOfferedBy: null,
        drawDeclinedBy: currentUser.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `games/${activeMatch.id}`);
    }
  };

  // Handle Turn Timeout Forfeiture automatically
  const handleTimeout = async (lostColor: 'w' | 'b') => {
    if (!currentUser || !activeMatch || activeMatch.status !== 'playing') return;

    const matchRef = doc(db, 'games', activeMatch.id);
    const winnerId = lostColor === 'w' ? activeMatch.blackPlayerId : activeMatch.whitePlayerId;
    const winnerName = lostColor === 'w' ? (activeMatch.blackPlayerName || 'Opponent') : (activeMatch.whitePlayerName || 'Opponent');
    const lostPlayerName = lostColor === 'w' ? (activeMatch.whitePlayerName || 'Opponent') : (activeMatch.blackPlayerName || 'Opponent');

    if (!winnerId) return; // Prevent updating until opponent joins

    try {
      await updateDoc(matchRef, {
        status: 'completed',
        winnerId: winnerId,
        endReason: `${lostPlayerName} ran out of time. ${winnerName} automatically wins!`,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `games/${activeMatch.id}`);
    }
  };

  // Send Arena message Chat
  const handleSendMessage = async (text: string) => {
    if (!currentUser || !activeMatch) return;

    const msgsRef = collection(db, 'games', activeMatch.id, 'messages');
    try {
      await addDoc(msgsRef, {
        userId: currentUser.uid,
        userName: userProfile?.displayName || 'Gladiator',
        text: text,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `games/${activeMatch.id}/messages`);
    }
  };

  // Detect user color in the current match
  const getMyPlayerColor = (match: ChessMatch | null): 'w' | 'b' | null => {
    if (!match || !currentUser) return null;
    if (match.whitePlayerId === currentUser.uid) return 'w';
    if (match.blackPlayerId === currentUser.uid) return 'b';
    return null;
  };

  const userColor = getMyPlayerColor(activeMatch);

  // Loading Splash Screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0c0e12] flex flex-col justify-center items-center text-white space-y-4 font-sans">
        <div className="w-10 h-10 border-[3px] border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono uppercase tracking-widest text-amber-500">Initiating Grid Ledger...</span>
      </div>
    );
  }

  // Login Authentication Landing View
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0c0e12] flex flex-col items-center justify-center p-4 relative overflow-y-auto select-none">
        
        {/* Subtle decorative grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />

        <div className="relative z-10 max-w-md w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom duration-300 py-6">
          
          {/* Logo Illustration Header */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center border border-amber-400/30 shadow-2xl relative">
              <Swords className="w-10 h-10 text-slate-950" />
              <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-slate-950 border border-amber-500 rounded-lg flex items-center justify-center font-display font-extrabold text-[10px] text-amber-500">
                ₦
              </div>
            </div>
            <div>
              <h1 className="font-display font-black text-2xl tracking-tight text-white flex items-center justify-center gap-1.5 mt-2">
                Sovereign Chess Betting
              </h1>
              <p className="text-[10px] uppercase font-mono tracking-widest text-amber-500 mt-1 font-bold">
                Online High-Stakes Duel Matchmaking
              </p>
            </div>
          </div>

          {/* Feature Highlight board item */}
          <div className="p-4 bg-slate-950/70 border border-gray-900 rounded-2xl">
            <span className="text-xs font-mono text-gray-400 leading-relaxed block text-left">
              Securely authorize your chess profile, propose customizable duel stakes with your peers, track synchronized move-by-move ledgers in real-time, and claim pooled escrow stakes!
            </span>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-950/20 border border-red-900/40 text-red-500 text-xs rounded-2xl text-left flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Primary Google auth */}
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:opacity-90 transition p-3.5 rounded-xl font-display font-extrabold text-slate-950 tracking-wide text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-amber-950/20 active:scale-95 duration-100"
            >
              <Coins className="w-4.5 h-4.5" />
              Sign in with Google Account
            </button>

            {/* OR separator */}
            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] bg-gray-800 flex-1" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold">OR PLAY AS GUEST</span>
              <div className="h-[1px] bg-gray-800 flex-1" />
            </div>

            {/* Guest Sandbox/Anonymous Section */}
            <form onSubmit={handleGuestLogin} className="bg-slate-950/40 border border-gray-900 rounded-2xl p-4 text-left space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wide text-gray-400 mb-1.5 font-semibold">
                  Choose Custom Chess Handle
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={guestNameInput}
                  onChange={(e) => setGuestNameInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="e.g. KasparovGuest, ChessKnight"
                  className="w-full font-mono bg-slate-950 rounded-xl border border-gray-800 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition"
                />
                <span className="text-[9px] text-gray-500 mt-1 block leading-relaxed">
                  Letters, numbers, and underscores only. Generates a random name if left empty.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoggingInAnonymously}
                className="w-full bg-gray-900 border border-gray-800 hover:bg-gray-800/80 disabled:opacity-50 transition p-2.5 rounded-xl text-gray-300 font-semibold cursor-pointer text-xs flex items-center justify-center gap-2 active:scale-98 duration-100"
              >
                <Gamepad2 className="w-4 h-4 text-amber-500" />
                {isLoggingInAnonymously ? 'Entering Board...' : 'Instant Guest Chess Duel (No Popups)'}
              </button>
            </form>
          </div>

          <div className="pt-2 text-[9px] font-mono text-gray-600 tracking-wider uppercase">
            SECURE INTEGRAL PLATFORM LEDGER &copy; 2026
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0e12] select-none text-gray-200 font-sans pb-12 flex flex-col relative">
      
      {/* Decorative linear grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:5rem_5rem] bg-repeat-y opacity-10 pointer-events-none" />

      {/* Main Header navigation */}
      <header className="sticky top-0 z-40 bg-[#0d1117]/80 backdrop-blur-md border-b border-gray-900/80 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          
          {/* Brand logo & nav tabs */}
          <div className="flex items-center space-x-4 sm:space-x-8">
            <div 
              onClick={() => {
                if (!activeMatch) {
                  setShowProfilePage(false);
                  setShowNotificationsPage(false);
                  setGladiatorPage(false);
                }
              }}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <div className="w-9 h-9 bg-gradient-to-tr from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center border border-amber-400/20 shadow-md">
                <Swords className="w-5 h-5 text-slate-950" />
              </div>
              <div className="hidden xs:block">
                <span className="font-display font-bold text-sm tracking-tight text-white block">
                  Sovereign Chess
                </span>
                <span className="text-[8px] font-mono text-amber-500 uppercase tracking-widest block font-bold">
                  Online Bet System
                </span>
              </div>
            </div>

            {/* Premium Navigation Tabs */}
            {currentUser && !activeMatch && (
              <nav className="flex items-center space-x-1 bg-slate-950/40 p-1 border border-gray-900 rounded-xl">
                <button
                  onClick={() => {
                    setShowProfilePage(false);
                    setShowNotificationsPage(false);
                    setGladiatorPage(false);
                  }}
                  className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    !showProfilePage && !showNotificationsPage && !gladiatorPage
                      ? 'bg-zinc-850 text-amber-500 font-bold border-gray-700/50'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  War Room
                </button>
                <button
                  onClick={() => {
                    setShowProfilePage(false);
                    setShowNotificationsPage(false);
                    setGladiatorPage(true);
                  }}
                  className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    !showProfilePage && !showNotificationsPage && gladiatorPage
                      ? 'bg-zinc-850 text-amber-500 font-bold border-gray-700/50'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Players
                </button>
              </nav>
            )}
          </div>

          {/* User account dashboard, balance, and reload action */}
          {userProfile && (
            <div className="flex items-center space-x-1.5 sm:space-x-3">
              
              {/* Virtual wallet balance indicator block with integrated profile icon */}
              <div 
                onClick={() => setShowProfilePage(true)}
                className="bg-slate-950 hover:border-emerald-500/50 transition duration-150 border border-gray-900 pl-1 p-1 pr-2 sm:pr-3 rounded-lg sm:rounded-xl flex items-center space-x-1.5 sm:space-x-2 cursor-pointer select-none"
                title="View Arena Profile"
              >
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg border border-gray-800"
                />
                <div className="text-right">
                  <span className="text-[10px] sm:text-xs font-mono font-extrabold text-emerald-400 block pb-0.5 leading-none">
                    ₦{userProfile.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-wider block leading-none">
                    Gladiator
                  </span>
                </div>
              </div>

              {/* Notification Bell Icon */}
              <button
                onClick={() => {
                  setShowNotificationsPage(true);
                  // Mark notifications as read
                  notifications.forEach(async (n) => {
                    if (!n.read && currentUser) {
                      const notifRef = doc(db, 'users', currentUser.uid, 'notifications', n.id);
                      await updateDoc(notifRef, { read: true }).catch(err => console.error(err));
                    }
                  });
                }}
                className="relative p-2 bg-slate-950 hover:bg-[#111827] border border-gray-900 hover:border-amber-500/30 rounded-xl transition cursor-pointer text-gray-400 hover:text-white"
                title="Open Arena Notifications"
              >
                <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>

              {/* Top up Wallet Action Button */}
              <button
                onClick={() => setShowWallet(true)}
                className="hidden sm:flex p-2 sm:px-3 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg sm:rounded-xl text-[10px] uppercase font-mono transition cursor-pointer items-center gap-1 leading-none shadow-md shadow-emerald-950/10"
                title="Deposit Coins"
              >
                <Coins className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Deposit</span>
              </button>

              {/* Simple logout button */}
              <button
                onClick={handleLogout}
                className="hidden sm:block p-2 bg-red-950/20 hover:bg-red-950/45 border border-red-900/30 text-red-400 hover:text-red-350 transition rounded-xl cursor-pointer"
                title="Logout Account"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Arena Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 mt-8 relative z-10">
        
        {errorMessage && (
          <div className="bg-red-950/20 border border-red-900/40 text-red-500 p-3.5 rounded-2xl mb-6 text-xs flex justify-between items-center transition">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </span>
            <button 
              onClick={() => setErrorMessage(null)} 
              className="text-red-500 font-bold px-2 hover:opacity-80"
            >
              ✕
            </button>
          </div>
        )}

        {activeMatch ? (
          /* Active Gameplay screen focused fully on Chessboard grid & matching metrics HUD */
          <ActiveGamePanel
            match={activeMatch}
            userId={currentUser.uid}
            playerColor={userColor}
            messages={messages}
            onMakeMove={handleMakeMove}
            onResign={handleResign}
            onOfferDraw={handleOfferDraw}
            onAcceptDraw={handleAcceptDraw}
            onDeclineDraw={handleDeclineDraw}
            onSendMessage={handleSendMessage}
            onExitGame={() => setActiveMatch(null)}
            onTimeout={handleTimeout}
          />
        ) : showNotificationsPage && userProfile ? (
          <NotificationsPage
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
            onClearAll={handleClearAllNotifications}
            onDeleteSingle={handleDeleteSingleNotification}
            onClose={() => setShowNotificationsPage(false)}
          />
        ) : selectedProfile ? (
          <ProfilePage
            userProfile={selectedProfile}
            currentUserId={currentUser.uid}
            onWithdraw={handleWithdrawFunds}
            onClose={() => setSelectedProfile(null)}
            onLogout={handleLogout}
            leaderboardUsers={leaderboardUsers}
            onViewProfile={(profile) => setSelectedProfile(profile)}
          />
        ) : showProfilePage && userProfile ? (
          <ProfilePage
            userProfile={userProfile}
            currentUserId={currentUser.uid}
            onWithdraw={handleWithdrawFunds}
            onClose={() => setShowProfilePage(false)}
            onLogout={handleLogout}
            leaderboardUsers={leaderboardUsers}
            onViewProfile={(profile) => setSelectedProfile(profile)}
          />
        ) : gladiatorPage && userProfile ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ActiveUsersPanel
              users={allUsers}
              currentUserId={currentUser.uid}
              currentUserBalance={userProfile.balance}
              onSendChallenge={handleSendChallenge}
              isLoading={isLobbyLoading}
              onViewProfile={(profile) => setSelectedProfile(profile)}
            />
          </div>
        ) : (
          /* Normal matchmaker lobby dashboard list view */
          <div className="space-y-6">
            {lobbyMatches.filter(m => m.challengedUserId === currentUser?.uid && m.status === 'waiting').length > 0 && (
              <div className="bg-gradient-to-r from-red-950/20 via-slate-950 to-amber-950/20 border border-amber-500/30 rounded-2xl p-5 animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-900 mb-4">
                  <Swords className="w-5 h-5 text-amber-500 animate-pulse animate-duration-1000" />
                  <div>
                    <h3 className="font-display font-semibold text-xs text-gray-200 uppercase tracking-widest font-bold">Incoming Gladiator Board Duels</h3>
                    <span className="text-[9px] font-mono text-amber-400 block font-semibold mt-0.5 animate-pulse">ACTION REQUIRED</span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {lobbyMatches.filter(m => m.challengedUserId === currentUser?.uid && m.status === 'waiting').map((m) => {
                    const opponentName = m.whitePlayerId ? m.whitePlayerName : m.blackPlayerName;
                    const opponentPhoto = m.whitePlayerId ? m.whitePlayerPhoto : m.blackPlayerPhoto;
                    return (
                      <div key={m.id} className="p-4 bg-slate-950 border border-gray-800 rounded-xl space-y-4 flex flex-col justify-between shadow-lg">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <img 
                              src={opponentPhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${m.creatorId}`}
                              alt="challenger"
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-lg bg-slate-900 border border-gray-850 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-gray-200 block truncate" title={opponentName}>{opponentName}</span>
                              <span className="text-[9px] font-mono text-zinc-500 uppercase block mt-0.5">ISSUED DIRECT DUEL MATCH</span>
                            </div>
                          </div>
                          <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-emerald-400 flex-shrink-0 self-center">
                            ₦{m.betAmount} STAKE
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-2 rounded-lg text-[10px] font-mono text-gray-400">
                          <div>Clock: {m.timeControl === 'unlimited' ? 'None' : m.timeControl}</div>
                          <div>Play Piece: {m.whitePlayerId ? 'Black Hand (b)' : 'White Hand (w)'}</div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await handleCancelMatch(m.id);
                              } catch (e) {
                                console.error("Failed to decline challenge:", e);
                              }
                            }}
                            className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-xs font-mono font-semibold text-gray-400 rounded-xl cursor-pointer text-center transition"
                          >
                            Decline & Void
                          </button>
                          <button
                            onClick={() => handleJoinMatch(m.id)}
                            className="flex-1 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 text-xs font-bold rounded-xl cursor-pointer text-center hover:opacity-90 transition"
                          >
                            Accept & Duel!
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Continuously Sliding Top 20 Arena Gladiators Ticker */}
            {leaderboardUsers && leaderboardUsers.length > 0 && (
              <div className="w-full overflow-hidden bg-slate-950/70 border border-gray-900 py-3.5 backdrop-blur-md relative z-10 rounded-2xl shadow-inner">
                <div className="w-full flex">
                  <div className="animate-marquee flex gap-16 items-center whitespace-nowrap">
                    {/* Render first iteration */}
                    {[...leaderboardUsers].sort((a,b) => ((b.wins * 3) + b.draws) - ((a.wins * 3) + a.draws)).slice(0, 20).map((u, idx) => {
                      const rank = idx + 1;
                      let rankBadge = "🏆";
                      if (rank === 1) rankBadge = "👑";
                      else if (rank === 2) rankBadge = "🥇";
                      else if (rank === 3) rankBadge = "🥈";
                      else rankBadge = `#${rank}`;

                      return (
                        <div 
                          key={`flow-1-${u.uid}`} 
                          onClick={() => setSelectedProfile(u)}
                          className="flex items-center space-x-2.5 text-xs font-mono cursor-pointer hover:bg-slate-900 border border-transparent hover:border-amber-500/20 px-2.5 py-1 rounded-xl transition duration-150"
                        >
                          <span className="text-amber-500 font-extrabold">{rankBadge}</span>
                          <img 
                            src={u.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.uid}`} 
                            alt={u.displayName} 
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded border border-gray-800"
                          />
                          <span className="font-sans font-bold text-gray-200">{u.displayName}</span>
                          <span className="text-amber-400 font-bold bg-[#111827] px-1.5 py-0.5 rounded border border-gray-900 text-[10px]">
                            🛡️ {u.rating || 1200}
                          </span>
                        </div>
                      );
                    })}
                    {/* Render duplicate iteration to create infinite seamless loop */}
                    {[...leaderboardUsers].sort((a,b) => ((b.wins * 3) + b.draws) - ((a.wins * 3) + a.draws)).slice(0, 20).map((u, idx) => {
                      const rank = idx + 1;
                      let rankBadge = "🏆";
                      if (rank === 1) rankBadge = "👑";
                      else if (rank === 2) rankBadge = "🥇";
                      else if (rank === 3) rankBadge = "🥈";
                      else rankBadge = `#${rank}`;

                      return (
                        <div 
                          key={`flow-2-${u.uid}`} 
                          onClick={() => setSelectedProfile(u)}
                          className="flex items-center space-x-2.5 text-xs font-mono cursor-pointer hover:bg-slate-900 border border-transparent hover:border-amber-500/20 px-2.5 py-1 rounded-xl transition duration-150"
                        >
                          <span className="text-amber-500 font-extrabold">{rankBadge}</span>
                          <img 
                            src={u.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.uid}`} 
                            alt={u.displayName} 
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded border border-gray-800"
                          />
                          <span className="font-sans font-bold text-gray-200">{u.displayName}</span>
                          <span className="text-amber-400 font-bold bg-[#111827] px-1.5 py-0.5 rounded border border-gray-900 text-[10px]">
                            🛡️ {u.rating || 1200}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Match selector lists in full-width block */}
            <div className="w-full space-y-6">
              <LobbyPanel
                matches={lobbyMatches}
                userBalance={userProfile?.balance || 0}
                onCreateMatch={handleCreateMatch}
                onJoinMatch={handleJoinMatch}
                currentUserId={currentUser.uid}
                onCancelMatch={handleCancelMatch}
                isLoading={isLobbyLoading}
                onSpectateMatch={(match) => setActiveMatch(match)}
                onStartComputerMatch={() => handleStartComputerMatch('15m', 'random')}
              />
            </div>
          </div>
        )}
      </main>

      {/* Credit Wallet Drawer dialog overlays */}
      {showWallet && userProfile && (
        <WalletDialog
          balance={userProfile.balance}
          displayName={userProfile.displayName}
          onDeposit={handleDepositWallet}
          onClose={() => setShowWallet(false)}
        />
      )}

      {/* Draw offer declined alert popup */}
      {drawDeclinedAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-red-500/30 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl p-6 text-center space-y-4 animate-in scale-in duration-150">
            <div className="w-12 h-12 bg-red-400/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto font-bold text-lg">
              ✕
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-gray-200 uppercase tracking-wider">Draw offer declined</h4>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Your opponent has declined the proposed draw agreement. The duel battle continues!
              </p>
            </div>
            <button
              onClick={() => setDrawDeclinedAlert(false)}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 hover:text-white transition text-gray-200 font-bold text-xs rounded-xl cursor-pointer"
            >
              Close & Focus
            </button>
          </div>
        </div>
      )}

      {/* Duel Settled outcome alert popup */}
      {gameOutcomeAlert && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f121d] border border-amber-500/30 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in scale-in duration-150">
            <div className="bg-gradient-to-r from-amber-950 to-slate-950 p-6 flex flex-col items-center text-center space-y-2 border-b border-amber-900/10">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-500 text-lg">
                🏆
              </div>
              <h4 className="font-display font-extrabold text-lg text-amber-500">Arena Duel Settled!</h4>
              <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Lobby Escrow Released</p>
            </div>

            <div className="p-6 space-y-4 font-mono text-xs text-gray-300">
              <div className="bg-slate-950 p-4 rounded-xl border border-gray-900 space-y-2.5">
                <div className="flex justify-between items-center text-[10px] text-gray-500 pb-1.5 border-b border-gray-900">
                  <span>OUTCOME PROTOCOL</span>
                  <span className={`${gameOutcomeAlert.status === 'draw' ? 'text-zinc-400' : 'text-emerald-400'} font-bold uppercase`}>
                    {gameOutcomeAlert.status}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-gray-500 block text-[10px] uppercase">Resolution Verdict:</span>
                  <span className="text-gray-200 font-sans block text-xs font-semibold pr-2 leading-relaxed">
                    {gameOutcomeAlert.endReason}
                  </span>
                </div>

                <div className="flex justify-between pt-2 border-t border-gray-900">
                  <span className="text-gray-500">INDIVIDUAL MATCH BET:</span>
                  <span className="text-gray-200">₦{gameOutcomeAlert.betAmount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between pt-1 text-sm font-bold text-emerald-400 border-t border-gray-950 pt-1.5">
                  <span>
                    {gameOutcomeAlert.status === 'draw' ? 'TOTAL BALANCE REFUNDED:' : 'STAKES TRANSFERRED:'}
                  </span>
                  <span>
                    ₦{(gameOutcomeAlert.status === 'draw' ? gameOutcomeAlert.betAmount : gameOutcomeAlert.betAmount * 2).toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-zinc-500 text-center leading-normal font-sans">
                You have been redirected back to the central lobby dashboard. Virtual credits have been updated in your profile ledger.
              </p>
            </div>

            <div className="p-4 border-t border-gray-900 bg-[#0f121d]">
              <button
                onClick={() => setGameOutcomeAlert(null)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer text-center"
              >
                Acknowledge & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match accepted popup overlay toast */}
      {acceptedMatchNotification && (
        <div className="fixed bottom-6 right-6 max-w-sm w-full bg-[#111827] border border-emerald-500/40 rounded-2xl shadow-2xl p-5 z-40 flex flex-col space-y-3.5 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <span className="text-xl animate-bounce flex-shrink-0">⚔️</span>
              <div>
                <h4 className="font-display font-medium text-xs text-emerald-400 uppercase tracking-widest font-bold">Chess Match Accepted!</h4>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  Your board duel with stakes of <strong>₦{acceptedMatchNotification.betAmount}</strong> has been allocated! Opponent has accepted the match.
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                localStorage.setItem(`dismissed_notification_${acceptedMatchNotification.id}`, 'true');
                setAcceptedMatchNotification(null);
              }}
              className="text-gray-550 hover:text-white text-xs font-mono font-bold ml-2"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                localStorage.setItem(`dismissed_notification_${acceptedMatchNotification.id}`, 'true');
                setAcceptedMatchNotification(null);
              }}
              className="flex-1 py-1.5 bg-zinc-900 border border-gray-800 text-[11px] font-mono text-zinc-400 hover:text-white rounded-lg transition"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                localStorage.setItem(`dismissed_notification_${acceptedMatchNotification.id}`, 'true');
                setActiveMatch(acceptedMatchNotification);
                setAcceptedMatchNotification(null);
              }}
              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
            >
              Join Battlefield
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple LogOut icon component matching lucide styling
const LogLevelIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
