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
  VolumeX,
  LogOut,
  Copy,
  Share2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  ShieldAlert
} from 'lucide-react';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  runTransaction, 
  collection, 
  addDoc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Chess } from 'chess.js';
import { ChessMatch, MatchMessage } from '../types';
import { Chessboard } from './Chessboard';
import { parseCapturedPieces, CapturedPiecesList } from './CapturedPieces';

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
  const [showGameOverOverlay, setShowGameOverOverlay] = useState<boolean>(true);

  // Board theme persistence locally
  const [boardTheme, setBoardTheme] = useState<string>(() => {
    return localStorage.getItem('chess_board_theme') || 'classic';
  });

  const [copiedId, setCopiedId] = useState<boolean>(false);

  // WebRTC Audio Call States & Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const [isVoiceConnected, setIsVoiceConnected] = useState<boolean>(false);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [webrtcError, setWebrtcError] = useState<string | null>(null);
  const [remoteUserMuteState, setRemoteUserMuteState] = useState<boolean>(false);
  const [isWebRtcStarted, setIsWebRtcStarted] = useState<boolean>(false);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  // Firestore WebRTC signaling documents clearing helper
  const cleanupFirestoreRtc = async (matchId: string) => {
    try {
      const colls = ['callerCandidates', 'calleeCandidates', 'webrtc_signals'];
      for (const c of colls) {
        const snap = await getDocs(collection(db, 'games', matchId, c));
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      }
    } catch (err) {
      console.error("Failed to clean up WebRTC signals on Firestore:", err);
    }
  };

  // Exit with cleanup wrapper
  const handleExitAndCleanup = async () => {
    try {
      if (playerColor) {
        await cleanupFirestoreRtc(match.id);
      }
    } catch (e) {
      console.error("Cleanup error during exit:", e);
    }
    onExitGame();
  };

  const handleCopyMatchId = () => {
    navigator.clipboard.writeText(match.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getShareMessage = () => {
    if (match.betAmount > 0) {
      return `⚔️ Challenge me in Chess! Stake amount: ₦${match.betAmount.toLocaleString()} each! Match ID: ${match.id} Join here:`;
    }
    return `♟️ Let's play Chess! Match ID: ${match.id}. Join here:`;
  };

  const currentAppUrl = window.location.origin + "/?join=" + match.id;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(getShareMessage() + ' ' + currentAppUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentAppUrl)}&quote=${encodeURIComponent(getShareMessage())}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareMessage())}&url=${encodeURIComponent(currentAppUrl)}`;

  // Utility flags & colors
  const isSpectator = playerColor === null;

  // Clocks in seconds
  const [whiteTime, setWhiteTime] = useState<number>(900); // Default to 15m
  const [blackTime, setBlackTime] = useState<number>(900);

  const isGameCheck = React.useMemo(() => {
    try {
      return new Chess(match.fen).inCheck();
    } catch {
      return false;
    }
  }, [match.fen]);

  const isOpponentLowTime = React.useMemo(() => {
    if (match.timeControl === 'unlimited') return false;
    const opVal = isSpectator || playerColor === 'w' ? blackTime : whiteTime;
    return opVal < 60 && opVal > 0;
  }, [blackTime, whiteTime, isSpectator, playerColor, match.timeControl]);

  const isSelfLowTime = React.useMemo(() => {
    if (match.timeControl === 'unlimited') return false;
    const selfVal = isSpectator || playerColor === 'w' ? whiteTime : blackTime;
    return selfVal < 60 && selfVal > 0;
  }, [whiteTime, blackTime, isSpectator, playerColor, match.timeControl]);

  // WebRTC Primary Audio Signaling Core Initiator Effect
  useEffect(() => {
    // Spectators do not join or start the voice communication stream
    if (!playerColor || match.status !== 'playing') {
      return;
    }

    let active = true;
    let pc: RTCPeerConnection | null = null;
    let unsubAnswer: (() => void) | null = null;
    let unsubOffer: (() => void) | null = null;
    let unsubCallerCandidates: (() => void) | null = null;
    let unsubCalleeCandidates: (() => void) | null = null;
    let audioCtx: AudioContext | null = null;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const initWebRTC = async () => {
      try {
        setIsVoiceConnecting(true);
        setWebrtcError(null);

        // 1. Grab mic stream with smartphone-optimized speaker/echo cancellation
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        }).catch((err) => {
          throw new Error('Microphone access denied. Please allow mic permissions in your browser and reload.');
        });

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;

        // Apply dynamic mute track configuration
        stream.getAudioTracks().forEach(track => {
          track.enabled = !isMuted;
        });

        // 2. Build Peer Connection with Enterprise-Grade TURN Traversal (using OpenRelay + Google STUNs)
        pc = new RTCPeerConnection({
          iceServers: [
            { urls: [
              'stun:stun.l.google.com:19302', 
              'stun:stun1.l.google.com:19302',
              'stun:stun2.l.google.com:19302',
              'stun:stun3.l.google.com:19302',
              'stun:stun4.l.google.com:19302',
              'stun:openrelay.metered.ca:80'
            ]},
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:openrelay.metered.ca:443?transport=tcp',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ],
          iceCandidatePoolSize: 10
        });
        peerConnectionRef.current = pc;

        // Robust ice candidate queue to prevent "addIceCandidate before remoteDescription" issues
        const remoteCandidateQueue: any[] = [];
        let isRemoteDescriptionSet = false;

        const processQueuedCandidates = async () => {
          if (!pc) return;
          try {
            while (remoteCandidateQueue.length > 0) {
              const candidateData = remoteCandidateQueue.shift();
              if (candidateData) {
                await pc.addIceCandidate(new RTCIceCandidate(candidateData));
              }
            }
          } catch (err) {
            console.error("Queue ICE candidate consumption trace error:", err);
          }
        };

        // 3. Attach local audio track
        stream.getTracks().forEach(track => {
          if (pc) pc.addTrack(track, stream);
        });

        // 4. Attach remote stream track to play remote speaker audio
        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            const remoteStream = event.streams[0];

            // Render to HTML Audio Ref
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = remoteStream;
              remoteAudioRef.current.volume = 1.0;
              remoteAudioRef.current.play().catch(e => {
                console.warn("Autoplay blocked by browser policy, will resume on click interaction", e);
              });
            }

            // Web Audio API Node Pipeline (excellent for forcing smartphone speaker output routing)
            try {
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContextClass) {
                audioCtx = new AudioContextClass();
                const source = audioCtx.createMediaStreamSource(remoteStream);
                
                // Boost or normalize voice gain node
                const gainNode = audioCtx.createGain();
                gainNode.gain.value = 1.25; // elegant boost to play clearly through loud speaker
                
                source.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                // Autoplay resume safety trigger
                if (audioCtx.state === 'suspended' || (remoteAudioRef.current && remoteAudioRef.current.paused)) {
                  const forceResume = () => {
                    if (audioCtx && audioCtx.state === 'suspended') {
                      audioCtx.resume();
                    }
                    if (remoteAudioRef.current) {
                      remoteAudioRef.current.play().catch(() => {});
                    }
                    document.removeEventListener('click', forceResume);
                    document.removeEventListener('touchstart', forceResume);
                  };
                  document.addEventListener('click', forceResume);
                  document.addEventListener('touchstart', forceResume);
                }
              }
            } catch (err) {
              console.warn("Web Audio API route connection omitted:", err);
            }

            setIsVoiceConnected(true);
            setIsVoiceConnecting(false);
          }
        };

        const handleStateUpdate = () => {
          if (!active || !pc) return;
          const cState = pc.connectionState;
          const iceState = pc.iceConnectionState;

          console.log(`[WebRTC] state update -> Connection: ${cState}, ICE: ${iceState}`);

          if (cState === 'connected' || iceState === 'connected' || iceState === 'completed') {
            setIsVoiceConnected(true);
            setIsVoiceConnecting(false);
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
          } else if (cState === 'connecting' || iceState === 'checking') {
            setIsVoiceConnecting(true);
          } else if (cState === 'failed' || cState === 'disconnected' || iceState === 'failed' || iceState === 'disconnected') {
            setIsVoiceConnected(false);
            setIsVoiceConnecting(false);

            // Self-healing automatic reconnect: dial again after 4 seconds of failure or disconnect
            if (!reconnectTimeoutRef.current) {
              reconnectTimeoutRef.current = setTimeout(() => {
                if (active) {
                  console.log("[WebRTC] Triggering automatic reconnect attempt...");
                  setRetryTrigger(prev => prev + 1);
                }
              }, 4000);
            }
          }
        };

        pc.onconnectionstatechange = handleStateUpdate;
        pc.oniceconnectionstatechange = handleStateUpdate;

        // 5. Dual-Role Signaling State Engine (completely await all signal asset clearing)
        if (playerColor === 'w') {
          // White acts as WebRTC Caller
          try {
            await deleteDoc(doc(db, 'games', match.id, 'webrtc_signals', 'offer'));
            await deleteDoc(doc(db, 'games', match.id, 'webrtc_signals', 'answer'));
            const cCand = await getDocs(collection(db, 'games', match.id, 'callerCandidates'));
            await Promise.all(cCand.docs.map(d => deleteDoc(d.ref)));
            const clCand = await getDocs(collection(db, 'games', match.id, 'calleeCandidates'));
            await Promise.all(clCand.docs.map(d => deleteDoc(d.ref)));
          } catch (e) {
            console.log("No previous signaling files to purge.", e);
          }

          pc.onicecandidate = async (e) => {
            if (e.candidate && active) {
              await addDoc(collection(db, 'games', match.id, 'callerCandidates'), e.candidate.toJSON());
            }
          };

          const offer = await pc.createOffer({ offerToReceiveAudio: true });
          await pc.setLocalDescription(offer);

          await setDoc(doc(db, 'games', match.id, 'webrtc_signals', 'offer'), {
            sdp: offer.sdp,
            type: offer.type,
            callerId: userId,
            timestamp: Date.now()
          });

          // Wait for opponent's answering SDP description
          unsubAnswer = onSnapshot(doc(db, 'games', match.id, 'webrtc_signals', 'answer'), async (snap) => {
            if (snap.exists() && pc && active) {
              const data = snap.data();
              if (pc.signalingState !== 'stable') {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription({
                    sdp: data.sdp,
                    type: data.type
                  }));
                  isRemoteDescriptionSet = true;
                  await processQueuedCandidates();
                } catch (err) {
                  console.error("Error setting caller target sdp:", err);
                }
              }
            }
          });

          // Mount Callee Candidates
          unsubCalleeCandidates = onSnapshot(collection(db, 'games', match.id, 'calleeCandidates'), (snap) => {
            snap.docChanges().forEach(async (change) => {
              if (change.type === 'added' && active) {
                const candData = change.doc.data();
                if (isRemoteDescriptionSet && pc) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(candData));
                  } catch (candidateErr) {
                    console.error("Caller ICE incorporation issue:", candidateErr);
                  }
                } else {
                  remoteCandidateQueue.push(candData);
                }
              }
            });
          });

        } else if (playerColor === 'b') {
          // Black acts as WebRTC Callee
          pc.onicecandidate = async (e) => {
            if (e.candidate && active) {
              await addDoc(collection(db, 'games', match.id, 'calleeCandidates'), e.candidate.toJSON());
            }
          };

          // Watch Caller's SDP Offer
          unsubOffer = onSnapshot(doc(db, 'games', match.id, 'webrtc_signals', 'offer'), async (snap) => {
            if (snap.exists() && pc && active) {
              const data = snap.data();
              if (pc.signalingState === 'stable') {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription({
                    sdp: data.sdp,
                    type: data.type
                  }));
                  isRemoteDescriptionSet = true;
                  await processQueuedCandidates();

                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);

                  await setDoc(doc(db, 'games', match.id, 'webrtc_signals', 'answer'), {
                    sdp: answer.sdp,
                    type: answer.type,
                    calleeId: userId,
                    timestamp: Date.now()
                  });
                } catch (err) {
                  console.error("Error setting callee target sdp:", err);
                }
              }
            }
          });

          // Mount Caller Candidates
          unsubCallerCandidates = onSnapshot(collection(db, 'games', match.id, 'callerCandidates'), (snap) => {
            snap.docChanges().forEach(async (change) => {
              if (change.type === 'added' && active) {
                const candData = change.doc.data();
                if (isRemoteDescriptionSet && pc) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(candData));
                  } catch (candidateErr) {
                    console.error("Callee ICE incorporation issue:", candidateErr);
                  }
                } else {
                  remoteCandidateQueue.push(candData);
                }
              }
            });
          });
        }

        setIsWebRtcStarted(true);
        setWebrtcError(null);
      } catch (err: any) {
        console.error("WebRTC call failed initialization:", err);
        setWebrtcError(err.message || 'Call unavailable. WebRTC voice connection could not be instantiated.');
        setIsVoiceConnecting(false);
        setIsVoiceConnected(false);
      }
    };

    initWebRTC();

    return () => {
      active = false;
      setIsVoiceConnected(false);
      setIsVoiceConnecting(false);
      setIsWebRtcStarted(false);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (unsubAnswer) unsubAnswer();
      if (unsubOffer) unsubOffer();
      if (unsubCallerCandidates) unsubCallerCandidates();
      if (unsubCalleeCandidates) unsubCalleeCandidates();

      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }

      if (pc) {
        pc.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [match.id, playerColor, match.status, retryTrigger]);

  // Sync mute values in real-time across peers
  useEffect(() => {
    if (!playerColor || match.status !== 'playing') {
      return;
    }
    let isActive = true;
    const unsubMutes = onSnapshot(doc(db, 'games', match.id, 'webrtc_signals', 'mute_states'), (snap) => {
      if (snap.exists() && isActive) {
        const data = snap.data();
        const opponentSide = playerColor === 'w' ? 'blackMuted' : 'whiteMuted';
        setRemoteUserMuteState(!!data[opponentSide]);
      }
    });

    return () => {
      isActive = false;
      unsubMutes();
    };
  }, [match.id, playerColor, match.status]);

  const toggleMute = async () => {
    try {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !nextMuted;
        });
      }
      const mySidePrefix = playerColor === 'w' ? 'white' : 'black';
      await setDoc(doc(db, 'games', match.id, 'webrtc_signals', 'mute_states'), {
        [`${mySidePrefix}Muted`]: nextMuted
      }, { merge: true });
    } catch (err) {
      console.error("Mute upload failure:", err);
    }
  };

  const handleRetryWebRtc = () => {
    setRetryTrigger(prev => prev + 1);
  };

  // Real-time Spectator dynamic synchronization effect
  useEffect(() => {
    if (playerColor === null && userId && match.id) {
      const matchRef = doc(db, 'games', match.id);
      const userRef = doc(db, 'users', userId);
      
      const addSpectator = async () => {
        try {
          let specName = 'Anonymous Spectator';
          let specPhoto = '';
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const ud = userSnap.data();
            specName = ud.displayName || specName;
            specPhoto = ud.photoURL || specPhoto;
          }

          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(matchRef);
            if (snap.exists()) {
              const currentData = snap.data();
              const currentSpecs = currentData.spectatorsList || [];
              if (!currentSpecs.some((s: any) => s.uid === userId)) {
                const updated = [...currentSpecs, {
                  uid: userId,
                  displayName: specName,
                  photoURL: specPhoto
                }];
                transaction.update(matchRef, { spectatorsList: updated });
              }
            }
          });
        } catch (err) {
          console.error("Failed to add spectator list via transaction:", err);
        }
      };

      addSpectator();

      // Also trigger removeSpectator immediately upon unload / tab close
      const handleBeforeUnload = () => {
        const removeSpectatorSync = async () => {
          try {
            await runTransaction(db, async (transaction) => {
              const snap = await transaction.get(matchRef);
              if (snap.exists()) {
                const currentData = snap.data();
                const currentSpecs = currentData.spectatorsList || [];
                const updated = currentSpecs.filter((s: any) => s.uid !== userId);
                transaction.update(matchRef, { spectatorsList: updated });
              }
            });
          } catch (err) {
            console.error("Failed to remove spectator on unload:", err);
          }
        };
        removeSpectatorSync();
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        const removeSpectator = async () => {
          try {
            await runTransaction(db, async (transaction) => {
              const snap = await transaction.get(matchRef);
              if (snap.exists()) {
                const currentData = snap.data();
                const currentSpecs = currentData.spectatorsList || [];
                const updated = currentSpecs.filter((s: any) => s.uid !== userId);
                transaction.update(matchRef, { spectatorsList: updated });
              }
            });
          } catch (err) {
            console.error("Failed to remove spectator list on leave via transaction:", err);
          }
        };
        removeSpectator();
      };
    }
  }, [playerColor, userId, match.id]);

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

  // Base presence fields dynamically checking timestamps and heartbeat values
  const isWhiteInGame = match.whitePlayerId === 'computer_ai' || (match.hasOwnProperty('whiteInGame') && (match as any).whiteInGame === true && (Date.now() - ((match as any).whiteActiveAt || 0) < 15000));
  const isBlackInGame = match.blackPlayerId === 'computer_ai' || (match.hasOwnProperty('blackInGame') && (match as any).blackInGame === true && (Date.now() - ((match as any).blackActiveAt || 0) < 15000));
  const isBothInGame = isWhiteInGame && isBlackInGame;
  const isOpponentInGame = isSpectator ? true : (playerColor === 'w' ? isBlackInGame : isWhiteInGame);

  // Real-time local state presence publisher loop
  useEffect(() => {
    if (match.status !== 'playing' || !playerColor) return;

    const matchRef = doc(db, 'games', match.id);
    const isWhite = playerColor === 'w';

    const updatePresence = async (isPresent: boolean) => {
      try {
        const updateObj: any = {};
        if (isWhite) {
          updateObj.whiteInGame = isPresent;
          updateObj.whiteActiveAt = isPresent ? Date.now() : 0;
        } else {
          updateObj.blackInGame = isPresent;
          updateObj.blackActiveAt = isPresent ? Date.now() : 0;
        }
        await updateDoc(matchRef, updateObj);
      } catch (e) {
        console.warn("Match presence update failed gracefully:", e);
      }
    };

    // Publish online present immediately
    updatePresence(true);

    // Keep pulse alive every 4 seconds
    const intervalId = setInterval(() => {
      updatePresence(true);
    }, 4000);

    const handleUnload = () => {
      updatePresence(false);
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleUnload);
      updatePresence(false);
    };
  }, [match.id, playerColor, match.status]);

  // Touch & restart turn clock lastMoveTime when both players connect for the first time
  useEffect(() => {
    if (match.status !== 'playing') return;

    if (isBothInGame && match.moves.length === 0 && playerColor && match.lastMoveTime) {
      const now = Date.now();
      // If elapsed since matchmaking join/creation is noticeable, reset so players have full clock remaining
      if (now - match.lastMoveTime > 3000) {
        const matchRef = doc(db, 'games', match.id);
        updateDoc(matchRef, {
          lastMoveTime: now
        }).catch(err => console.warn("Failed to touch match start clocks:", err));
      }
    }
  }, [match.status, match.moves.length, playerColor, match.id, isBothInGame, match.lastMoveTime]);

  // Synchronize local countdown times with server-side clocks on any Match turn/fen updates
  useEffect(() => {
    if (match.timeControl && match.timeControl !== 'unlimited') {
      const dbWhite = typeof match.whiteTime === 'number' ? match.whiteTime : parseInt(match.timeControl) * 60;
      const dbBlack = typeof match.blackTime === 'number' ? match.blackTime : parseInt(match.timeControl) * 60;

      if (match.status === 'playing') {
        // Calculate time passed since the last move
        const now = Date.now();
        const lastMove = match.lastMoveTime || now;
        const elapsed = (now - lastMove) / 1000;

        if (match.turn === 'w') {
          setWhiteTime(Math.max(0, Math.round(dbWhite - elapsed)));
          setBlackTime(dbBlack);
        } else {
          setWhiteTime(dbWhite);
          setBlackTime(Math.max(0, Math.round(dbBlack - elapsed)));
        }
      } else {
        setWhiteTime(dbWhite);
        setBlackTime(dbBlack);
      }
    }
  }, [match.fen, match.whiteTime, match.blackTime, match.lastMoveTime, match.turn, match.status, match.timeControl, isBothInGame]);

  // Clock countdown interval - triggers auto forfeiture on timeout
  useEffect(() => {
    if (match.status !== 'playing' || match.timeControl === 'unlimited') return;

    const interval = setInterval(() => {
      if (match.turn === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            if (onTimeout) {
              if (playerColor === 'w' || match.blackPlayerId === 'computer_ai' || !playerColor) {
                onTimeout('w');
              }
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
              if (playerColor === 'b' || match.whitePlayerId === 'computer_ai' || !playerColor) {
                onTimeout('b');
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [match.status, match.turn, match.timeControl, match.whitePlayerId, match.blackPlayerId, playerColor, onTimeout]);

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

  const captures = parseCapturedPieces(match.fen);

  const opponentCapturedPieces = isSpectator || playerColor === 'w'
    ? { list: captures.capturedWhite, color: 'w' as 'w' | 'b', advantage: captures.blackLead }
    : { list: captures.capturedBlack, color: 'b' as 'w' | 'b', advantage: captures.whiteLead };

  const selfCapturedPieces = isSpectator || playerColor === 'w'
    ? { list: captures.capturedBlack, color: 'b' as 'w' | 'b', advantage: captures.whiteLead }
    : { list: captures.capturedWhite, color: 'w' as 'w' | 'b', advantage: captures.blackLead };

  return (
    <div className="w-full flex flex-col min-h-[calc(100vh-140px)] animate-in fade-in duration-300 relative">
      
      {/* 1. Header Control bar with quick action icons */}
      <div className="flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 bg-[#111827] border border-gray-800 rounded-2xl mb-4 sm:mb-6 shadow-xl relative z-20 gap-3 sm:gap-2 w-full">
        
        {/* Left Side: Exit/Leave Icon Action */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <button
              onClick={() => {
                if (match.status === 'playing' && playerColor) {
                  setShowExitConfirm(true);
                } else {
                  handleExitAndCleanup();
                }
              }}
              className="p-2 sm:p-2.5 bg-slate-950 hover:bg-zinc-900 border border-gray-800 text-gray-400 hover:text-white rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
              title="Leave Match block"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-left">
              <h3 className="text-xs font-bold text-gray-200">Chess Arena</h3>
              <span className="text-[8px] sm:text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">
                {match.betAmount > 0 ? 'Escrow Active' : 'Championship Rules'}
              </span>
            </div>

            {/* Compact Voice Chat Indicator & Control Icons */}
            <div className="flex items-center gap-1 ml-1 pl-1.5 sm:ml-2 sm:pl-2 border-l border-zinc-850">
              {playerColor ? (
                <div 
                  className="flex items-center gap-1 bg-slate-950/90 p-1 px-1.5 rounded-xl border border-gray-800 shadow"
                  title={
                    webrtcError 
                      ? `Voice Stream Blocked: ${webrtcError}` 
                      : isVoiceConnected 
                        ? 'Private WebRTC Voice Connected 🎙️ (Hearing and speaking)' 
                        : isVoiceConnecting 
                          ? 'Voice Connection: Dialing/Connecting... 🔊' 
                          : 'Voice Connection: Offline 🔇'
                  }
                >
                  {/* Connection Status Icon (glowing Phone or static off) */}
                  <div className="relative flex items-center justify-center p-0.5" title={isVoiceConnected ? "Hearing Connected" : "Connecting..."}>
                    {isVoiceConnected ? (
                      <div className="relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                    ) : isVoiceConnecting ? (
                      <Phone className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    ) : (
                      <PhoneOff className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </div>

                  {/* My Microphone toggle icon button */}
                  <button
                    onClick={toggleMute}
                    className={`p-1 rounded-md transition duration-150 hover:scale-105 cursor-pointer flex items-center justify-center ${
                      isMuted 
                        ? 'bg-red-950/40 text-red-150 border border-red-900/40' 
                        : 'bg-zinc-900 text-emerald-400 hover:text-white border border-transparent'
                    }`}
                    title={isMuted ? "Unmute My Microphone" : "Mute My Microphone"}
                  >
                    {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>

                  {/* Opponent microphone mute status icon indicators */}
                  {remoteUserMuteState && (
                    <div 
                      className="p-1 bg-red-950/20 text-red-400 border border-red-900/20 rounded-md"
                      title="Opponent has muted their microphone"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Error Retry Icon Button */}
                  {webrtcError && (
                    <button
                      onClick={handleRetryWebRtc}
                      className="p-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md transition flex items-center justify-center cursor-pointer"
                      title={`Retry Connection: ${webrtcError}`}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div 
                  className="flex items-center gap-1 bg-slate-950/50 p-1 px-1.5 rounded-xl border border-zinc-900 text-cyan-400" 
                  title="Live audio calls are privatized and active only between matching active players."
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>

          {/* On Mobile (below sm), bundle the right side buttons directly in the top row to save space! */}
          <div className="flex sm:hidden items-center space-x-1.5">
            {/* Propose Draw action link */}
            {match.status === 'playing' && playerColor && (
              <>
                {match.isDrawOfferedBy ? (
                  match.isDrawOfferedBy !== userId ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-lg flex items-center gap-1 animate-bounce">
                      <span className="text-[8px] font-mono text-amber-500 font-bold uppercase tracking-wider text-center">Draw?</span>
                      <button
                        onClick={onAcceptDraw}
                        className="p-1 bg-emerald-600 text-slate-100 rounded-md text-[8px] font-extrabold px-1.5 cursor-pointer whitespace-nowrap"
                      >
                        Accept
                      </button>
                      <button
                        onClick={onDeclineDraw}
                        className="p-1 bg-red-900 text-red-200 rounded-md text-[8px] font-extrabold px-1.5 cursor-pointer whitespace-nowrap"
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span className="text-[8px] font-mono bg-[#1f2937] text-zinc-400 px-2 py-1 rounded-lg border border-gray-800">
                      Proposed...
                    </span>
                  )
                ) : (
                  <button
                    onClick={onOfferDraw}
                    className="p-2 bg-slate-950 hover:bg-zinc-900 border border-gray-800 text-gray-400 hover:text-amber-500 rounded-lg transition cursor-pointer flex items-center justify-center"
                    title="Propose Draw agreement"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Resign stakes button */}
                <button
                  onClick={onResign}
                  className="p-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 rounded-lg transition cursor-pointer flex items-center justify-center"
                  title="Resign Stakes"
                >
                  <Flag className="w-3.5 h-3.5" />
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
                className={`text-[8px] font-mono font-bold px-2 py-1 border rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                  hideChatSpectator
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/15'
                    : 'bg-slate-950 hover:bg-zinc-900 border-gray-800 text-gray-400'
                }`}
                title="Toggle focus board"
              >
                <MessageSquare className="w-3 h-3" />
                <span>{hideChatSpectator ? 'Show' : 'Hide'}</span>
              </button>
            )}

            {/* Chat Drawer toggle with counts */}
            {!hideChatSpectator && (
              <button
                onClick={() => {
                  setShowChatDrawer(!showChatDrawer);
                  setHasNewMessageAlert(false);
                }}
                className={`p-2 border rounded-lg transition cursor-pointer flex items-center justify-center relative ${
                  showChatDrawer 
                    ? 'bg-emerald-600 border-emerald-600 text-slate-100 shadow-md' 
                    : 'bg-slate-950 hover:bg-zinc-900 border-gray-800 text-gray-400'
                }`}
                title="Lobby Chat"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {hasNewMessageAlert && !showChatDrawer && (
                  <span className="absolute -top-1 -right-1 block h-2 w-2 rounded-full bg-red-500 animate-pulse border border-slate-950" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Center: Escrow Multiplier badge & Spectator Badge */}
        <div className="bg-slate-950/80 px-3 sm:px-4 py-1.5 rounded-xl border border-gray-900 flex items-center justify-center gap-2 sm:gap-3.5 shadow-inner w-full sm:w-auto">
          {match.betAmount > 0 ? (
            <>
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 animate-pulse" />
                <span className="text-xs font-mono font-extrabold text-emerald-400">
                  ₦{(match.betAmount * 2).toLocaleString()}
                </span>
              </div>
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider hidden xs:inline border-l border-gray-800 pl-2 font-bold">
                Stake: ₦{match.betAmount}
              </span>
            </>
          ) : (
            <span className="text-[10px] sm:text-xs font-mono font-extrabold text-teal-400">
              <span className="hidden xs:inline">🏆 Free Championship Duel</span>
              <span className="xs:hidden">🏆 Free Duel</span>
            </span>
          )}
          <span className="text-[8px] sm:text-[9px] font-mono text-cyan-400 uppercase tracking-wider border-l border-gray-800 pl-2 font-bold flex items-center gap-1">
            👥 {match.spectatorsList?.length || 0} <span className="hidden xs:inline">watching</span>
          </span>
        </div>

        {/* Right Side on Desktop: Tab Icons (Chat drawer toggle, Propose Draw, Resign) */}
        <div className="hidden sm:flex items-center space-x-2">
          
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
                  ? 'bg-emerald-600 border-emerald-600 text-slate-100 shadow-md' 
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

      {/* Off-screen audio element for reliable native rendering without WebKit throttling */}
      <audio 
        ref={remoteAudioRef} 
        autoPlay 
        playsInline 
        style={{ 
          display: 'block',
          position: 'absolute', 
          width: '1px', 
          height: '1px', 
          opacity: 0, 
          pointerEvents: 'none', 
          zIndex: -50 
        }} 
      />

      {/* 2. Primary Chessboard screen layout focus centered fully */}
      <div className="grid lg:grid-cols-12 gap-6 items-stretch flex-1">
        
        {/* Left Focus Block containing Large full Chessboard (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          
          {/* Opponent Player HUD label cards */}
          <div className="flex justify-between items-center p-3 bg-slate-950 border border-gray-900 rounded-xl max-w-2xl mx-auto w-full gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <img
                src={opponentPhoto}
                alt="opponent"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg border border-gray-900 bg-[#111827] shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-gray-200 block truncate max-w-[150px] sm:max-w-[220px]">
                    {opponentName}
                  </span>
                  {!isSpectator && !isOpponentInGame && (
                    <span className="text-[7px] font-mono bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5 text-red-400 font-extrabold uppercase tracking-wide animate-pulse shrink-0">
                      Disconnected
                    </span>
                  )}
                  {!isSpectator && isOpponentInGame && (
                    <span className="text-[7px] font-mono bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 text-emerald-400 font-bold uppercase tracking-wide shrink-0">
                      Online
                    </span>
                  )}
                </div>
                <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider font-semibold">
                  {isSpectator ? 'Black Player' : (playerColor === 'w' ? 'Black System' : 'White System')}
                </span>
              </div>
            </div>

            {/* Dynamic captured-pieces display for Opponent */}
            <div className="flex-1 flex justify-center sm:justify-start px-1 max-w-[124px] sm:max-w-none">
              <CapturedPiecesList
                captured={opponentCapturedPieces.list}
                color={opponentCapturedPieces.color}
                advantage={opponentCapturedPieces.advantage}
              />
            </div>

            {/* Timers countdown clocks */}
            {match.timeControl && match.timeControl !== 'unlimited' && (
              <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border font-mono text-xs font-bold transition-all duration-300 ${
                isOpponentLowTime
                  ? 'bg-red-950/40 border-red-500 text-red-500 animate-pulse font-extrabold shadow-[0_0_8px_rgba(239,68,68,0.25)]'
                  : (((isSpectator && match.turn === 'b') || (!isSpectator && match.turn === (playerColor === 'w' ? 'b' : 'w'))) && match.status === 'playing'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                      : 'bg-slate-900 border-gray-950 text-gray-400')
              }`}>
                <Timer className={`w-3.5 h-3.5 ${isOpponentLowTime ? 'text-red-500 animate-bounce' : ''}`} />
                <span>{isSpectator || playerColor === 'w' ? formatTime(blackTime) : formatTime(whiteTime)}</span>
              </div>
            )}
          </div>

          {/* Critical Time Warning banner display */}
          {match.status === 'playing' && (isOpponentLowTime || isSelfLowTime) && (
            <div className="max-w-2xl mx-auto w-full bg-red-950/40 border border-red-500/30 text-red-400 p-2 rounded-lg text-[9px] font-mono font-bold flex items-center justify-center gap-1.5 animate-pulse shadow-md">
              <span>⏳</span>
              <span>
                {isSelfLowTime && isOpponentLowTime 
                  ? "CRITICAL WATCH: BOTH PLAYERS ARE UNDER 1 MINUTE MARK!"
                  : isSelfLowTime 
                    ? "WARNING: YOUR CLOCK HAS FALLEN BELOW 1 MINUTE LIMIT!" 
                    : `WARNING: OPPONENT REMAINING TIME IS BELOW 1 MINUTE LIMIT!`}
              </span>
            </div>
          )}

          {/* Majestic full size Chessboard stage */}
          <div className="relative max-w-[500px] w-full mx-auto aspect-square bg-[#0f121d] border border-gray-800 rounded-2xl shadow-2xl p-2 flex items-center justify-center">
            
            <div className="w-full h-full max-h-[460px] max-w-[460px] flex items-center justify-center">
              <Chessboard
                fen={match.fen}
                turn={match.turn}
                playerColor={playerColor}
                onMove={onMakeMove}
                isInteractive={isMyTurn}
                boardTheme={boardTheme}
                moves={match.moves}
              />
            </div>

            {/* Waiting for Challenger connecting */}
            {match.status === 'waiting' && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col justify-center items-center rounded-2xl space-y-4 z-30 p-6">
                <span className="w-8 h-8 border-[3px] border-amber-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-center">
                  <h4 className="font-display font-medium text-xs text-amber-500 uppercase tracking-widest font-bold">Awaiting Opponent</h4>
                  <p className="text-[11px] text-gray-400 mt-2 max-w-[280px] leading-relaxed">
                    {match.betAmount > 0 
                      ? `Waiting for opponent to connect and match stakes of ₦${match.betAmount.toLocaleString()}. Shared URL allows immediate join!`
                      : "Awaiting a combat challenger to connect and start this free duel match!"
                    }
                  </p>
                </div>

                {/* Social Share Battleground Widget */}
                <div className="w-full max-w-[320px] bg-slate-900 border border-gray-800 rounded-xl p-3 space-y-2.5">
                  <div className="flex justify-between items-center text-[10px] uppercase font-mono text-zinc-500 px-1">
                    <span>Duel Code</span>
                    <span className="text-amber-500 font-extrabold select-all tracking-wider">{match.id}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyMatchId}
                      className="flex-1 py-1.5 px-2 bg-slate-950 hover:bg-zinc-855 border border-gray-800 hover:border-amber-500/50 rounded-lg text-gray-300 hover:text-white transition font-mono text-[9px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedId ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-amber-550" />
                          <span>Copy Match ID</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Social sharing links */}
                  <div className="flex gap-1.5 justify-center pt-1 border-t border-gray-950">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/20 rounded-lg text-center font-mono text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      WhatsApp
                    </a>
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] border border-[#1877F2]/20 rounded-lg text-center font-mono text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Facebook
                    </a>
                    <a
                      href={twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 bg-slate-950 hover:bg-zinc-850 text-gray-200 border border-gray-800 rounded-lg text-center font-mono text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Twitter/X
                    </a>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 w-full max-w-[220px] pt-1">
                  <button
                    onClick={handleExitAndCleanup}
                    className="w-full py-2 bg-zinc-850 hover:bg-zinc-750 text-gray-205 transition text-xs font-bold font-mono rounded-xl cursor-pointer text-center"
                  >
                    Leave Room (Keep Open)
                  </button>
                  {match.creatorId === userId && onCancelMatch && (
                    <button
                      onClick={async () => {
                        try {
                          await onCancelMatch(match.id);
                          handleExitAndCleanup();
                        } catch (err) {
                          console.error("Cancel matched error:", err);
                        }
                      }}
                      className="w-full py-2 bg-red-950/40 hover:bg-red-950/60 border border-red-900/30 text-red-450 hover:text-red-300 transition text-xs font-bold font-mono rounded-xl cursor-pointer text-center"
                    >
                      Cancel Stakes & Delete
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Real-time waiting for a player to join active game view */}
            {match.status === 'playing' && !isBothInGame && match.moves.length === 0 && (
              <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md flex flex-col justify-center items-center rounded-2xl space-y-4 z-30 p-6 text-center">
                <div className="w-10 h-10 border-[3px] border-amber-500 border-t-transparent rounded-full animate-spin" />
                <div className="space-y-2">
                  <h4 className="font-display font-black text-xs text-amber-500 uppercase tracking-widest animate-pulse">
                    Waiting for opponent inside the match
                  </h4>
                  <p className="text-xs text-slate-100 max-w-[300px] leading-relaxed">
                    {!isWhiteInGame && !isBlackInGame ? (
                      "Waiting for players to connect and open the match grid..."
                    ) : !isWhiteInGame ? (
                      <>
                        Waiting for <span className="text-emerald-400 font-extrabold">{match.whitePlayerName || 'White Gladiator'}</span> to join the game board.
                      </>
                    ) : (
                      <>
                        Waiting for <span className="text-emerald-400 font-extrabold">{match.blackPlayerName || 'Black Gladiator'}</span> to join the game board.
                      </>
                    )}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest pt-1.5 font-bold">
                    🛡️ Turn clock is frozen and paused
                  </p>
                </div>
                
                <div className="pt-2">
                  <button
                    onClick={handleExitAndCleanup}
                    className="py-1.5 px-4 bg-zinc-900 border border-gray-800 hover:bg-zinc-800 text-gray-300 hover:text-white transition text-[10px] font-bold font-mono rounded-lg cursor-pointer text-center"
                  >
                    Exit to Main Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* Finished states overlays */}
            {match.status === 'completed' && showGameOverOverlay && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col justify-center items-center rounded-2xl space-y-3 z-30 p-6 text-center">
                <span className="text-2xl animate-bounce">🏆</span>
                <span className="text-xs font-mono text-amber-500 uppercase tracking-widest font-bold">Battle Completed</span>
                <p className="text-xs text-gray-300 font-sans max-w-[300px] leading-relaxed">
                  {match.endReason}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-[240px] mt-1">
                  <button
                    onClick={() => setShowGameOverOverlay(false)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 border border-gray-800 transition px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer text-gray-300"
                  >
                    Review Board
                  </button>
                  <button
                    onClick={handleExitAndCleanup}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 transition px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer text-slate-950 font-semibold"
                  >
                    Exit Match
                  </button>
                </div>
              </div>
            )}

            {match.status === 'draw' && showGameOverOverlay && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col justify-center items-center rounded-2xl space-y-3 z-30 p-6 text-center">
                <span className="text-2xl">🤝</span>
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest font-bold">Stalemate Draw</span>
                <p className="text-xs text-gray-300 font-sans max-w-[300px] leading-relaxed">
                  The gladiator duel has settled in a draw agreement. Stakes refunded.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-[240px] mt-1">
                  <button
                    onClick={() => setShowGameOverOverlay(false)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 border border-gray-800 transition px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer text-gray-300"
                  >
                    Review Board
                  </button>
                  <button
                    onClick={handleExitAndCleanup}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 transition px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer text-slate-950 font-semibold"
                  >
                    Exit Match
                  </button>
                </div>
              </div>
            )}

            {/* If the user hid the overlay to review the finished game board */}
            {(match.status === 'completed' || match.status === 'draw') && !showGameOverOverlay && (
              <div className="absolute top-2 left-2 right-2 bg-slate-950/95 border border-amber-500/40 rounded-xl p-2 flex items-center justify-between shadow-2xl z-30 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2">
                  <span className="text-base">🏁</span>
                  <div className="text-left">
                    <span className="text-[10px] font-mono font-bold text-amber-400 block uppercase leading-tight">Review Mode</span>
                    <span className="text-[8px] text-gray-400 block truncate max-w-[160px] leading-none">Viewing finished game state</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setShowGameOverOverlay(true)}
                    className="px-2 py-1 text-[9px] font-mono font-bold bg-slate-900 border border-gray-800 hover:bg-slate-800 text-gray-300 rounded cursor-pointer"
                  >
                    Show Result
                  </button>
                  <button
                    onClick={handleExitAndCleanup}
                    className="px-2 py-1 text-[9px] font-mono font-bold bg-red-950/55 border border-red-800/60 hover:bg-red-900/40 text-red-400 rounded cursor-pointer"
                    title="Exit and return to Dashboard"
                  >
                    Exit Match
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Self Player HUD label cards */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-2 justify-between items-stretch sm:items-center p-2.5 sm:p-3 bg-slate-950 border border-gray-900 rounded-xl max-w-2xl mx-auto w-full">
            <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-between sm:justify-start gap-2">
              <div className="flex items-center space-x-2.5 min-w-0">
                <img
                  src={myPhoto}
                  alt="me"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-lg border border-gray-900 bg-[#111827] shrink-0"
                />
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-200 block truncate max-w-[110px] sm:max-w-[180px]">
                      {myName}
                    </span>
                    {isSpectator ? (
                      <span className="text-[8px] font-mono bg-amber-500/10 border border-amber-500/20 rounded px-1 text-amber-400 font-bold uppercase tracking-wide shrink-0 font-bold">
                        Watching
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono bg-emerald-500/10 border border-emerald-500/20 rounded px-1 text-emerald-400 font-bold uppercase tracking-wide shrink-0 font-bold">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider font-semibold">
                    {isSpectator ? 'White Player' : (playerColor === 'b' ? 'Black System' : 'White System')}
                  </span>
                </div>
              </div>

              {/* Dynamic captured-pieces display for Self Player */}
              <div className="flex justify-center sm:justify-start px-1 max-w-[124px] sm:max-w-none">
                <CapturedPiecesList
                  captured={selfCapturedPieces.list}
                  color={selfCapturedPieces.color}
                  advantage={selfCapturedPieces.advantage}
                />
              </div>

              {/* On extra small mobile (below sm), make turn Indicator very prominent beside the avatar */}
              <div className={`sm:hidden text-[8px] font-mono font-bold tracking-widest uppercase border px-2 py-1 rounded shrink-0 ${
                isMyTurn 
                  ? 'text-emerald-450 bg-emerald-500/5 border-emerald-500/25 animate-pulse' 
                  : (isSpectator 
                      ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' 
                      : 'text-zinc-650 bg-slate-900 border-transparent')
              }`}>
                {isMyTurn ? 'Your turn' : (isSpectator ? `${match.turn.toUpperCase()}` : 'Thinking')}
              </div>
            </div>

            {/* Timers countdown clocks */}
            <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto border-t border-gray-950 sm:border-transparent pt-2.5 sm:pt-0">
              {match.timeControl && match.timeControl !== 'unlimited' && (
                <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border font-mono text-xs font-bold transition-all duration-300 ${
                  isSelfLowTime
                    ? 'bg-red-950/40 border-red-500 text-red-500 animate-pulse font-extrabold shadow-[0_0_8px_rgba(239,68,68,0.25)]'
                    : (((isSpectator && match.turn === 'w') || (!isSpectator && match.turn === playerColor)) && match.status === 'playing'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                        : 'bg-slate-900 border-gray-950 text-gray-400')
                }`}>
                  <Timer className={`w-3.5 h-3.5 ${isSelfLowTime ? 'text-red-555 animate-bounce' : ''}`} />
                  <span>{isSpectator || playerColor === 'w' ? formatTime(whiteTime) : formatTime(blackTime)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                {isGameCheck && (
                  <div className="text-[8px] font-mono font-extrabold tracking-widest uppercase bg-rose-500/20 border border-rose-500 text-rose-400 px-2 py-1 rounded animate-bounce">
                    💥 CHECK!
                  </div>
                )}
                {isOpponentLowTime && (
                  <div className="text-[8px] font-mono font-extrabold tracking-widest uppercase bg-red-500/10 border border-red-500/40 text-red-400 px-2 py-1 rounded animate-pulse">
                    <span className="hidden sm:inline">⚠️ OPPONENT TIME WARNING!</span>
                    <span className="sm:hidden">⚠️ OPP LOW TIME</span>
                  </div>
                )}
                {isSelfLowTime && (
                  <div className="text-[8px] font-mono font-extrabold tracking-widest uppercase bg-red-500/20 border border-red-500 text-red-400 px-2 py-1 rounded animate-pulse">
                    <span className="hidden sm:inline">🚨 TIME WARNING!</span>
                    <span className="sm:hidden">🚨 LOW TIME</span>
                  </div>
                )}
                <div className={`hidden sm:block text-[8px] font-mono font-bold tracking-widest uppercase border px-2 py-1 rounded ${
                  isMyTurn 
                    ? 'text-emerald-450 bg-emerald-500/5 border-emerald-500/25 animate-pulse' 
                    : (isSpectator 
                        ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' 
                        : 'text-zinc-650 bg-slate-900 border-transparent')
                }`}>
                  {isMyTurn ? 'Your turn' : (isSpectator ? `TURN: ${match.turn.toUpperCase()}` : 'Thinking')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column sidebar containing Move ledger history (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-start space-y-4">
          
          {/* Stunning Real-time selectable Chessboard theme panel */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-xl text-left">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold block mb-2.5">
              Select Arena Chess Board
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'classic', name: 'Classic', color: 'bg-[#739552]' },
                { id: 'gold', name: 'Empire', color: 'bg-[#fbbf24]' },
                { id: 'wood', name: 'Warm', color: 'bg-[#b45309]' },
                { id: 'cosmic', name: 'Cosmic', color: 'bg-[#0ea5e9]' },
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    setBoardTheme(theme.id);
                    localStorage.setItem('chess_board_theme', theme.id);
                  }}
                  className={`py-1.5 px-1 bg-slate-950 border rounded-lg text-[10px] uppercase font-mono tracking-wide transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    boardTheme === theme.id
                      ? 'border-emerald-500 text-emerald-400 font-bold bg-slate-900/60'
                      : 'border-gray-800 text-gray-400 hover:border-gray-750'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${theme.color} border border-slate-950/35`} />
                  <span className="truncate w-full text-center">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Social Share Battleground widget inside sidebar */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-xl text-left">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold block mb-2.5">
              🔗 Share Battle ID
            </span>
            <div className="bg-slate-950 p-3 rounded-xl border border-gray-900 space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-gray-500 uppercase">Room ID:</span>
                <span className="font-extrabold text-[#fbbf24] select-all tracking-wider font-mono">{match.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={handleCopyMatchId}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-zinc-850 border border-gray-800 text-gray-300 rounded-lg text-[9px] uppercase font-mono font-bold tracking-wide transition cursor-pointer flex items-center justify-center gap-1"
                >
                  {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-500" />}
                  <span>{copiedId ? 'Copied!' : 'Copy Code'}</span>
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 text-[#25D366] rounded-lg text-[9px] uppercase font-mono font-bold tracking-wide transition text-center flex items-center justify-center gap-1 cursor-pointer"
                >
                  WhatsApp
                </a>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-2 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/20 text-[#1877F2] rounded-lg text-[9px] uppercase font-mono font-bold tracking-wide transition text-center flex items-center justify-center gap-1 cursor-pointer"
                >
                  Facebook
                </a>
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-2 bg-slate-900 hover:bg-zinc-850 border border-gray-800 text-gray-300 rounded-lg text-[9px] uppercase font-mono font-bold tracking-wide transition text-center flex items-center justify-center gap-1 cursor-pointer"
                >
                  Twitter/X
                </a>
              </div>
            </div>
          </div>

          {/* Move tracker ledger component */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col h-full min-h-[160px] lg:min-h-[300px]">
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
                          : 'bg-emerald-600 text-slate-100 font-bold rounded-tr-sm'
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
                className="flex-1 bg-slate-950 border border-gray-900 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 font-sans text-base sm:text-xs"
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
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-400 mx-auto font-bold text-lg">
              ⚠️
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-gray-200 uppercase tracking-wider">Leave Active Duel?</h4>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {match.betAmount > 0 ? (
                  <>
                    Warning! If you leave this active battleground, the current chess duel will close and you will immediately forfeit your stake of <span className="text-red-400 font-bold">₦{match.betAmount.toLocaleString()}</span> to your opponent!
                  </>
                ) : (
                  <>
                    Warning! If you leave this active battleground, the current chess duel will close and you will yield immediate victory to your opponent!
                  </>
                )}
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
                  handleExitAndCleanup();
                }}
                className="flex-1 py-2 bg-red-650 hover:bg-red-500 transition text-white font-bold text-xs rounded-xl cursor-pointer shadow-lg shadow-red-950/20"
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
