import React, { useState, useEffect, useCallback } from 'react';
import { BoardState, Player, Move, GameMode, GameStatus, UserProfile, ChatMessage, BoardTheme, PieceTheme, GameType, LiarAction } from './types';
import { createEmptyBoard, checkWin, checkThreat } from './utils/gameLogic';
import { getXiaoLinMove } from './services/gemini';
import { Board } from './components/Board';
import { PlayerCard } from './components/PlayerCard';
import { ChatWidget } from './components/ChatWidget';
import { LiarsDiceGame } from './components/LiarsDiceGame';
import { RouletteGame } from './components/RouletteGame';
import { Peer, DataConnection } from 'peerjs';

// --- Board Theme Definitions ---
const THEMES: BoardTheme[] = [
  { 
    id: 'classic', 
    name: '經典木紋', 
    boardBg: 'bg-[#eecfa1]', 
    borderColor: 'border-[#d4a373]', 
    gridColor: 'bg-slate-800',
    coordinateColor: 'text-amber-900'
  },
  { 
    id: 'sakura', 
    name: '浪漫櫻花', 
    boardBg: 'bg-pink-100', 
    borderColor: 'border-pink-300', 
    gridColor: 'bg-pink-800',
    coordinateColor: 'text-pink-700'
  },
  { 
    id: 'minimal', 
    name: '極簡白', 
    boardBg: 'bg-gray-50', 
    borderColor: 'border-gray-300', 
    gridColor: 'bg-gray-800',
    coordinateColor: 'text-gray-600'
  },
  { 
    id: 'night', 
    name: '深邃夜空', 
    boardBg: 'bg-slate-800', 
    borderColor: 'border-slate-600', 
    gridColor: 'bg-slate-400',
    coordinateColor: 'text-slate-300'
  },
  { 
    id: 'matcha', 
    name: '宇治抹茶', 
    boardBg: 'bg-[#d0f0c0]', 
    borderColor: 'border-[#8fbc8f]', 
    gridColor: 'bg-[#006400]',
    coordinateColor: 'text-green-800'
  }
];

// --- Piece Theme Definitions ---
const PIECE_THEMES: PieceTheme[] = [
  {
    id: 'classic',
    name: '經典質感',
    blackClass: 'bg-gradient-to-br from-gray-800 to-black ring-1 ring-white/20',
    whiteClass: 'bg-gradient-to-br from-white to-gray-200 ring-1 ring-black/10',
  },
  {
    id: 'neon',
    name: '賽博霓虹',
    blackClass: 'bg-gray-900 ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]',
    whiteClass: 'bg-white ring-2 ring-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.8)]',
  },
  {
    id: 'gem',
    name: '璀璨寶石',
    blackClass: 'bg-gradient-to-br from-indigo-600 to-blue-900 ring-1 ring-indigo-300 shadow-inner',
    whiteClass: 'bg-gradient-to-br from-rose-300 to-pink-500 ring-1 ring-rose-200 shadow-inner',
  },
  {
    id: 'cat',
    name: '可愛貓掌',
    blackClass: 'bg-gray-800 ring-1 ring-white/20',
    whiteClass: 'bg-orange-50 ring-1 ring-orange-200',
    blackPattern: "M12 17c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-4.5-1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm9 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z M12 8c-2.2 0-4 1.8-4 4 0 2.2 1.8 4 4 4s4-1.8 4-4c0-2.2-1.8-4-4-4z",
    whitePattern: "M12 17c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-4.5-1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm9 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z M12 8c-2.2 0-4 1.8-4 4 0 2.2 1.8 4 4 4s4-1.8 4-4c0-2.2-1.8-4-4-4z",
  },
  {
    id: 'rune',
    name: '魔法符文',
    blackClass: 'bg-slate-900 ring-1 ring-purple-500',
    whiteClass: 'bg-amber-50 ring-1 ring-amber-500',
    // Dark Rune: Diamond with hollow center and solid core
    blackPattern: "M12 2L22 12L12 22L2 12Z M12 6L6 12L12 18L18 12Z M12 9a3 3 0 1 1 0 6 3 3 0 1 1 0-6z", 
    // Light Rune: Star with hollow ring and solid core
    whitePattern: "M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8z M12 10a2 2 0 1 1 0 4 2 2 0 1 1 0-4z"
  }
];

// --- Icons ---
const RestartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
    <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" />
  </svg>
);
const UserIcon = () => (
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
   </svg>
);
const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-pink-500">
    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
  </svg>
);
const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-blue-500">
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM6.03 8.25c.676-1.634 1.777-3.037 3.168-4.086C9.042 4.416 8.784 4.67 8.547 4.95a23.957 23.957 0 00-2.517 3.3zM12 4.298c.843.004 1.677.106 2.48.297-.47.886-.99 1.838-1.534 2.846-.867-1.606-1.564-3.12-1.92-3.137.319-.004.646-.006.974-.006zm3.994 2.433c-1.026 1.85-2.062 3.656-3.134 5.32-1.07-1.66-2.106-3.465-3.135-5.319a19.72 19.72 0 016.27 0zM5.503 12c0 .942.122 1.854.349 2.716-.546-.353-1.082-.722-1.597-1.109a13.315 13.315 0 010-3.214c.515-.387 1.05-.756 1.597-1.109A9.72 9.72 0 005.503 12zm1.616 3.68c.55.918 1.156 1.815 1.813 2.678a16.22 16.22 0 01-2.903-1.625 20.312 20.312 0 01-1.442-1.053 18.25 18.25 0 002.532 0zm3.328 3.51a23.978 23.978 0 01-2.193-2.613c1.078.694 2.215 1.258 3.4 1.672-.416.486-.818.805-1.207.941zm4.494-1.35c1.185-.414 2.322-.978 3.4-1.672a23.985 23.985 0 01-2.193 2.613c-.39-.136-.791-.455-1.207-.941zm5.283-3.22c.883-.559 1.731-1.159 2.532-1.78a20.311 20.311 0 01-1.442 1.053 16.23 16.23 0 01-2.903 1.625c.657-.863 1.263-1.76 1.813-2.678zm2.065-2.203c.515.387 1.05.756 1.597 1.109a9.72 9.72 0 000-3.214c-.546.387-1.082.756-1.597 1.109.227.862.349 1.774.349 2.716z" clipRule="evenodd" />
  </svg>
);
const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
    <path fillRule="evenodd" d="M9.375 3.75A2.25 2.25 0 007.125 6h9.75a2.25 2.25 0 00-2.25-2.25H9.375zM11.25 12.75a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm1.5-1.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM12 1.5a.75.75 0 01.75.75V3h3a3.75 3.75 0 013.75 3.75v11.25c0 1.036-.42 1.98-1.095 2.656-.676.675-1.62 1.094-2.655 1.094H8.25c-1.035 0-1.98-.42-2.655-1.094a3.748 3.748 0 01-1.095-2.656V6.75a3.75 3.75 0 013.75-3.75h3V2.25A.75.75 0 0112 1.5z" clipRule="evenodd" />
  </svg>
);
const PaletteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-600">
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 01-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5zm0 2.5a.75.75 0 100-1.5.75.75 0 000 1.5zM7.875 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm1.5 3.375a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm8.25-3.375a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" clipRule="evenodd" />
  </svg>
);


export default function App() {
  // Game Mode State
  const [activeGame, setActiveGame] = useState<GameType>(GameType.GOMOKU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.PVE);

  // Theme State
  const [currentTheme, setCurrentTheme] = useState<BoardTheme>(THEMES[0]);
  const [currentPieceTheme, setCurrentPieceTheme] = useState<PieceTheme>(PIECE_THEMES[0]);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [themeTab, setThemeTab] = useState<'board' | 'piece'>('board');

  // Gomoku State
  const [board, setBoard] = useState<BoardState>(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>('black');
  const [lastMove, setLastMove] = useState<Move | null>(null);
  
  // Game Status
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    isGameOver: false,
    winner: null,
    winningLine: null
  });
  const [threatLine, setThreatLine] = useState<Move[] | null>(null);
  
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Chat & Profile
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Bubbles state
  const [opponentBubble, setOpponentBubble] = useState<ChatMessage | null>(null);
  const [myBubble, setMyBubble] = useState<ChatMessage | null>(null);

  const [myProfile, setMyProfile] = useState<UserProfile>({ name: '我', avatarUrl: '' });
  const [opponentProfile, setOpponentProfile] = useState<UserProfile>({ name: '曉琳', avatarUrl: '' });
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Online
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [conn, setConn] = useState<DataConnection | null>(null);
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [targetPeerId, setTargetPeerId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [myOnlineColor, setMyOnlineColor] = useState<Player>('black'); 
  const [liarAction, setLiarAction] = useState<LiarAction | null>(null);

  // Initialize
  useEffect(() => {
    const savedName = localStorage.getItem('gomoku_name');
    const savedAvatar = localStorage.getItem('gomoku_avatar');
    const savedThemeId = localStorage.getItem('gomoku_theme_id');
    const savedPieceThemeId = localStorage.getItem('gomoku_piece_theme_id');
    
    if (savedName || savedAvatar) {
      setMyProfile({
        name: savedName || '我',
        avatarUrl: savedAvatar || ''
      });
    }

    if (savedThemeId) {
      const foundTheme = THEMES.find(t => t.id === savedThemeId);
      if (foundTheme) setCurrentTheme(foundTheme);
    }

    if (savedPieceThemeId) {
      const foundPieceTheme = PIECE_THEMES.find(t => t.id === savedPieceThemeId);
      if (foundPieceTheme) setCurrentPieceTheme(foundPieceTheme);
    }
  }, []);

  // Initialize AI Message
  useEffect(() => {
     if(gameMode === GameMode.PVE && activeGame === GameType.GOMOKU) {
        addMessageToHistory("哈囉！準備好跟我玩五子棋了嗎？", false, 'opponent');
     } else if (gameMode === GameMode.PVE && activeGame === GameType.LIARS_DICE) {
        addMessageToHistory("人多才好玩！我找了朋友一起來吹牛～", false, 'opponent');
     } else if (gameMode === GameMode.PVE && activeGame === GameType.ROULETTE) {
        addMessageToHistory("嘿嘿，要來玩懲罰轉盤嗎？我已經想好要怎麼懲罰你了😈", false, 'opponent');
     } else {
        // Clear chat on mode switch? Optional.
        // setChatHistory([]); 
        setOpponentBubble(null);
     }
  }, [gameMode, activeGame]);

  // Helper to add messages
  const addMessageToHistory = (content: string, isSticker: boolean, sender: 'me' | 'opponent') => {
    const newMessage: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(),
      content,
      isSticker,
      sender,
      timestamp: Date.now()
    };
    
    setChatHistory(prev => [...prev, newMessage]);

    // Update Bubbles
    if (sender === 'me') {
      setMyBubble(newMessage);
      setTimeout(() => setMyBubble(null), 6000);
    } else {
      setOpponentBubble(newMessage);
      setTimeout(() => setOpponentBubble(null), 6000);
      if (!isChatOpen) {
        setUnreadChatCount(prev => prev + 1);
      }
    }
  };

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setUnreadChatCount(0);
    }
  };

  const changeTheme = (theme: BoardTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem('gomoku_theme_id', theme.id);
  };

  const changePieceTheme = (theme: PieceTheme) => {
    setCurrentPieceTheme(theme);
    localStorage.setItem('gomoku_piece_theme_id', theme.id);
  };

  // --- PeerJS Logic ---
  useEffect(() => {
    if (gameMode === GameMode.ONLINE && !peer) {
      const newPeer = new Peer();
      newPeer.on('open', (id) => setMyPeerId(id));
      newPeer.on('connection', (c) => {
        setConn(c);
        setConnectionStatus('connected');
        setMyOnlineColor('black'); 
        setupConnectionEvents(c);
        setTimeout(() => c.send({ type: 'handshake', profile: myProfile }), 500);
        resetGame(true);
      });
      setPeer(newPeer);
    }
  }, [gameMode, myProfile]);

  const setupConnectionEvents = (c: DataConnection) => {
    c.on('data', (data: any) => {
      if (data.type === 'handshake') {
        setOpponentProfile(data.profile);
      } else if (data.type === 'move') {
        applyGomokuMove(data.x, data.y, data.player);
      } else if (data.type === 'restart') {
        resetGame(true);
      } else if (data.type === 'chat') {
        addMessageToHistory(data.content, data.isSticker, 'opponent');
      } else if (data.type === 'liar_action') {
        setLiarAction(data.action);
      }
    });
    
    c.on('close', () => {
      setConnectionStatus('idle');
      setConn(null);
      alert('對方已斷線');
      setGameMode(GameMode.PVP);
    });
  };

  const connectToPeer = () => {
    if (!peer || !targetPeerId) return;
    setConnectionStatus('connecting');
    const c = peer.connect(targetPeerId);
    setConn(c);
    setMyOnlineColor('white');
    c.on('open', () => {
      setConnectionStatus('connected');
      setupConnectionEvents(c);
      c.send({ type: 'handshake', profile: myProfile });
      setShowOnlineModal(false);
    });
  };

  // --- Gomoku Logic ---
  const applyGomokuMove = useCallback((x: number, y: number, player: Player) => {
    setBoard(prev => {
        const newBoard = prev.map(row => [...row]);
        newBoard[y][x] = player;
        const move: Move = { x, y, player };
        setLastMove(move);
        const status = checkWin(newBoard, move);
        if (status.isGameOver) {
            setGameStatus(status);
            setThreatLine(null);
            if (gameMode === GameMode.PVE && status.winner === 'black') {
                addMessageToHistory("哇！你贏了！你好厲害喔 ❤️", false, 'opponent');
            }
        } else {
             // Check for threats
             const threats = checkThreat(newBoard, move);
             setThreatLine(threats);
             setCurrentPlayer(player === 'black' ? 'white' : 'black');
        }
        return newBoard;
    });
  }, [gameMode]);

  const handleCellClick = useCallback(async (x: number, y: number) => {
    if (activeGame !== GameType.GOMOKU) return;
    if (gameStatus.isGameOver || board[y][x] !== null || isAiThinking) return;
    if (gameMode === GameMode.ONLINE) {
        if (currentPlayer !== myOnlineColor) return;
        if (!conn) return;
    }

    applyGomokuMove(x, y, currentPlayer);

    if (gameMode === GameMode.ONLINE && conn) {
        conn.send({ type: 'move', x, y, player: currentPlayer });
    }
    
    const tempBoard = board.map(row => [...row]);
    tempBoard[y][x] = currentPlayer;
    const tempStatus = checkWin(tempBoard, {x, y, player: currentPlayer});
    if (tempStatus.isGameOver) return;

    if (gameMode === GameMode.PVE) {
      const nextPlayer = currentPlayer === 'black' ? 'white' : 'black';
      setIsAiThinking(true);
      setTimeout(async () => {
         try {
             const aiMove = await getXiaoLinMove(tempBoard, nextPlayer);
             if (tempBoard[aiMove.y][aiMove.x] === null) {
                applyGomokuMove(aiMove.x, aiMove.y, nextPlayer);
                addMessageToHistory(aiMove.message, false, 'opponent');
             }
         } catch (e) {
            addMessageToHistory("哎呀，我好像恍神了...", false, 'opponent');
         } finally {
             setIsAiThinking(false);
         }
      }, 800);
    }
  }, [board, currentPlayer, gameStatus.isGameOver, gameMode, isAiThinking, myOnlineColor, conn, applyGomokuMove, activeGame]);

  // --- Common ---
  const resetGame = (silent = false) => {
    // Reset Gomoku
    setBoard(createEmptyBoard());
    setCurrentPlayer('black');
    setLastMove(null);
    setGameStatus({ isGameOver: false, winner: null, winningLine: null });
    setThreatLine(null);
    setIsAiThinking(false);
    
    // Do not clear chat history on game reset, only bubbles
    setMyBubble(null);
    setOpponentBubble(null);

    // If Liar's Dice, we might need a signal to reset that component specifically,
    // but usually mode switch handles it.
    // Ideally, pass a reset trigger prop.

    if (gameMode === GameMode.ONLINE && conn && !silent) {
        conn.send({ type: 'restart' });
    }
  };

  const switchMode = (mode: GameMode) => {
    setGameMode(mode);
    resetGame(true);
    setChatHistory([]); // Clear history on mode switch
    if (mode === GameMode.PVE) {
        setOpponentProfile({ name: '曉琳', avatarUrl: '' });
    } else if (mode === GameMode.PVP) {
        setOpponentProfile({ name: '對手', avatarUrl: '' });
    } else if (mode === GameMode.ONLINE) {
        setShowOnlineModal(true);
        setOpponentProfile({ name: '等待連線...', avatarUrl: '' });
    }
  };

  const switchGame = (type: GameType) => {
      setActiveGame(type);
      resetGame(true);
  };

  // --- Profile & Chat Handlers ---
  const handleProfileSave = (name: string, file: File | null) => {
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => updateProfile(name, reader.result as string);
        reader.readAsDataURL(file);
      } else {
        updateProfile(name, myProfile.avatarUrl);
      }
  };
  const updateProfile = (name: string, avatarUrl: string) => {
    const newProfile = { name, avatarUrl };
    setMyProfile(newProfile);
    localStorage.setItem('gomoku_name', name);
    localStorage.setItem('gomoku_avatar', avatarUrl);
    setShowProfileModal(false);
    if (conn) conn.send({ type: 'handshake', profile: newProfile });
  };
  
  const handleSendMessage = (content: string, isSticker: boolean) => {
      addMessageToHistory(content, isSticker, 'me');
      if (gameMode === GameMode.ONLINE && conn) conn.send({ type: 'chat', content, isSticker });
  };
  
  const handleSendLiarAction = (action: LiarAction) => {
      if (gameMode === GameMode.ONLINE && conn) {
          conn.send({ type: 'liar_action', action });
      }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 flex flex-col font-sans ${currentTheme.id === 'night' ? 'bg-slate-900' : 'bg-pink-50'}`}>
      
      {/* Header */}
      <header className={`backdrop-blur-md shadow-sm sticky top-0 z-40 transition-colors duration-500 ${currentTheme.id === 'night' ? 'bg-slate-800/90' : 'bg-white/80'}`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                 五
              </div>
              <h1 className={`text-lg sm:text-xl font-bold tracking-wide hidden sm:block ${currentTheme.id === 'night' ? 'text-white' : 'text-gray-800'}`}>與曉琳的休閒時光</h1>
            </div>
            
            <div className="flex space-x-2">
               {/* Theme Toggle Button */}
               <button
                  onClick={() => setShowThemeModal(true)}
                  className="flex items-center justify-center p-2 rounded-full bg-purple-50 hover:bg-purple-100 transition-colors"
                  title="更換主題"
               >
                  <PaletteIcon />
               </button>

               {/* Mode Buttons (Simplified for mobile) */}
               <div className="hidden md:flex space-x-2">
                  <button onClick={() => switchMode(GameMode.PVE)} className={`px-3 py-1.5 rounded-full text-sm ${gameMode === GameMode.PVE ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'}`}>AI 曉琳</button>
                  <button onClick={() => switchMode(GameMode.ONLINE)} className={`px-3 py-1.5 rounded-full text-sm ${gameMode === GameMode.ONLINE ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>遠端</button>
                  <button onClick={() => switchMode(GameMode.PVP)} className={`px-3 py-1.5 rounded-full text-sm ${gameMode === GameMode.PVP ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-600'}`}>雙人</button>
               </div>
               {/* Mobile Mode Toggle (Just Icon) */}
               <div className="md:hidden flex space-x-1">
                   <button onClick={() => switchMode(GameMode.PVE)} className={`p-2 rounded-full ${gameMode === GameMode.PVE ? 'bg-pink-100 text-pink-700' : 'bg-gray-100'}`}><HeartIcon /></button>
                   <button onClick={() => switchMode(GameMode.ONLINE)} className={`p-2 rounded-full ${gameMode === GameMode.ONLINE ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}><GlobeIcon /></button>
                   <button onClick={() => switchMode(GameMode.PVP)} className={`p-2 rounded-full ${gameMode === GameMode.PVP ? 'bg-gray-200 text-gray-800' : 'bg-gray-100'}`}><UserIcon /></button>
               </div>
            </div>
          </div>
          
          {/* Game Switcher Tabs */}
          <div className="flex justify-center space-x-1 sm:space-x-2 bg-gray-100/50 p-1 rounded-lg overflow-x-auto">
             <button 
               onClick={() => switchGame(GameType.GOMOKU)} 
               className={`whitespace-nowrap flex-1 px-2 py-1 text-sm rounded transition-all ${activeGame === GameType.GOMOKU ? 'bg-white shadow text-pink-600 font-bold' : 'text-gray-500'}`}
             >
               五子棋
             </button>
             <button 
               onClick={() => switchGame(GameType.LIARS_DICE)} 
               className={`whitespace-nowrap flex-1 px-2 py-1 text-sm rounded transition-all ${activeGame === GameType.LIARS_DICE ? 'bg-white shadow text-purple-600 font-bold' : 'text-gray-500'}`}
             >
               吹牛
             </button>
             <button 
               onClick={() => switchGame(GameType.ROULETTE)} 
               className={`whitespace-nowrap flex-1 px-2 py-1 text-sm rounded transition-all ${activeGame === GameType.ROULETTE ? 'bg-white shadow text-orange-600 font-bold' : 'text-gray-500'}`}
             >
               轉盤
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-2 sm:px-4 py-6 flex flex-col items-center pb-24 sm:pb-6">
        
        {/* Players Area (Only show for Gomoku/Archery to avoid clutter in specialized games) */}
        {activeGame === GameType.GOMOKU && (
            <div className="w-full flex justify-between items-start mb-6 sm:mb-8 px-2 sm:px-8">
              <PlayerCard 
                name={myProfile.name}
                avatarUrl={myProfile.avatarUrl}
                isAi={false} 
                isActive={
                    (gameStatus.isGameOver ? false : currentPlayer === (gameMode === GameMode.ONLINE ? myOnlineColor : 'black'))
                }
                playerColor={gameMode === GameMode.ONLINE ? myOnlineColor : 'black'}
                isWinner={gameStatus.winner === (gameMode === GameMode.ONLINE ? myOnlineColor : 'black') && activeGame === GameType.GOMOKU}
                isEditable={true}
                onEdit={() => setShowProfileModal(true)}
                message={myBubble}
              />
              
              <div className="flex flex-col items-center justify-center pt-8">
                 <span className={`font-bold text-sm sm:text-base ${currentTheme.id === 'night' ? 'text-gray-500' : 'text-gray-400'}`}>VS</span>
                 {gameMode === GameMode.ONLINE && connectionStatus === 'connected' && (
                     <span className="text-xs text-green-500 font-medium mt-1">連線中</span>
                 )}
              </div>

              <PlayerCard 
                name={opponentProfile.name} 
                avatarUrl={opponentProfile.avatarUrl}
                isAi={gameMode === GameMode.PVE} 
                isActive={
                    (gameStatus.isGameOver ? false : currentPlayer === (gameMode === GameMode.ONLINE ? (myOnlineColor === 'black' ? 'white' : 'black') : 'white'))
                }
                playerColor={gameMode === GameMode.ONLINE ? (myOnlineColor === 'black' ? 'white' : 'black') : 'white'}
                message={opponentBubble}
                isWinner={gameStatus.winner === (gameMode === GameMode.ONLINE ? (myOnlineColor === 'black' ? 'white' : 'black') : 'white') && activeGame === GameType.GOMOKU}
              />
            </div>
        )}

        {/* Game Area */}
        <div className="relative w-full flex justify-center">
             {activeGame === GameType.GOMOKU && (
                 <>
                     <Board 
                       board={board} 
                       lastMove={lastMove}
                       winningLine={gameStatus.winningLine}
                       threatLine={threatLine}
                       disabled={
                         gameStatus.isGameOver || 
                         (gameMode === GameMode.PVE && currentPlayer === 'white') ||
                         (gameMode === GameMode.ONLINE && (!conn || currentPlayer !== myOnlineColor))
                       }
                       theme={currentTheme}
                       pieceTheme={currentPieceTheme}
                       onCellClick={handleCellClick}
                     />
                     
                     {gameStatus.isGameOver && (
                       <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 rounded-lg backdrop-blur-[2px]">
                           <div className="bg-white p-6 rounded-2xl shadow-2xl transform animate-bounce-in text-center">
                               <h2 className="text-2xl font-bold mb-2 text-gray-800">
                                 {gameStatus.winner ? 
                                    (gameStatus.winner === (gameMode === GameMode.ONLINE ? myOnlineColor : 'black') ? '你贏了！' : (gameMode === GameMode.PVE ? '曉琳贏了！' : '對方獲勝！'))
                                    : '平局！'
                                 }
                               </h2>
                               <button 
                                 onClick={() => resetGame()}
                                 className="mt-4 px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                               >
                                 再來一局
                               </button>
                           </div>
                       </div>
                     )}
                 </>
             )}

             {activeGame === GameType.LIARS_DICE && (
                 <LiarsDiceGame 
                    onMessage={(msg) => addMessageToHistory(msg, false, 'opponent')}
                    gameMode={gameMode}
                    onSendAction={handleSendLiarAction}
                    incomingAction={liarAction}
                    myProfile={myProfile}
                    opponentProfile={opponentProfile}
                 />
             )}

             {activeGame === GameType.ROULETTE && (
                 <RouletteGame 
                    myName={myProfile.name}
                    opponentName={opponentProfile.name}
                 />
             )}
        </div>

        {/* Controls Footer */}
        {activeGame === GameType.GOMOKU && (
            <div className="mt-8 flex space-x-4">
              <button 
                onClick={() => resetGame()}
                className="flex items-center px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <RestartIcon />
                重新開始
              </button>
            </div>
        )}
      </main>

      {/* Chat Widget (Dedicated Chat Window) */}
      <ChatWidget 
        messages={chatHistory}
        isOpen={isChatOpen}
        onToggle={handleChatToggle}
        onSendMessage={handleSendMessage}
        unreadCount={unreadChatCount}
      />

      {/* Theme Selection Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center flex-shrink-0">
               <PaletteIcon /> 
               <span className="ml-2">風格設定</span>
            </h3>
            
            {/* Tabs */}
            <div className="flex space-x-2 mb-4 bg-gray-100 p-1 rounded-lg flex-shrink-0">
               <button 
                 onClick={() => setThemeTab('board')}
                 className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${themeTab === 'board' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 棋盤主題
               </button>
               <button 
                 onClick={() => setThemeTab('piece')}
                 className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${themeTab === 'piece' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 棋子樣式
               </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              {themeTab === 'board' ? (
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => changeTheme(theme)}
                      className={`
                        flex flex-col items-center p-3 rounded-xl border-2 transition-all
                        ${currentTheme.id === theme.id ? 'border-pink-500 bg-pink-50 scale-105 shadow-md' : 'border-gray-100 hover:border-gray-300'}
                      `}
                    >
                       <div className={`w-full h-16 rounded mb-2 ${theme.boardBg} ${theme.borderColor} border-2 flex items-center justify-center relative overflow-hidden`}>
                          <div className={`w-full h-px absolute top-1/2 ${theme.gridColor}`}></div>
                          <div className={`h-full w-px absolute left-1/2 ${theme.gridColor}`}></div>
                          <div className={`absolute w-1.5 h-1.5 rounded-full ${theme.gridColor}`}></div>
                       </div>
                       <span className="text-sm font-medium text-gray-700">{theme.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                   {PIECE_THEMES.map(theme => (
                     <button
                       key={theme.id}
                       onClick={() => changePieceTheme(theme)}
                       className={`
                         flex flex-col items-center p-3 rounded-xl border-2 transition-all
                         ${currentPieceTheme.id === theme.id ? 'border-pink-500 bg-pink-50 scale-105 shadow-md' : 'border-gray-100 hover:border-gray-300'}
                       `}
                     >
                        <div className="flex space-x-2 mb-2 bg-gray-100/50 p-2 rounded w-full justify-center">
                           {/* Black Piece Preview */}
                           <div className={`w-8 h-8 rounded-full shadow-sm flex items-center justify-center relative overflow-hidden ${theme.blackClass}`}>
                              {theme.blackPattern && (
                                <svg viewBox="0 0 24 24" className="w-[70%] h-[70%] fill-white/30"><path d={theme.blackPattern}/></svg>
                              )}
                           </div>
                           {/* White Piece Preview */}
                           <div className={`w-8 h-8 rounded-full shadow-sm flex items-center justify-center relative overflow-hidden ${theme.whiteClass}`}>
                              {theme.whitePattern && (
                                <svg viewBox="0 0 24 24" className="w-[70%] h-[70%] fill-black/20"><path d={theme.whitePattern}/></svg>
                              )}
                           </div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">{theme.name}</span>
                     </button>
                   ))}
                </div>
              )}
            </div>
            
            <button onClick={() => setShowThemeModal(false)} className="mt-6 w-full py-2 text-gray-400 hover:text-gray-600 text-sm flex-shrink-0">關閉</button>
          </div>
        </div>
      )}

      {/* Profile Modal (Existing) */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
               <h3 className="text-lg font-bold text-gray-800 mb-4">設定你的個人檔案</h3>
               <form onSubmit={(e) => {
                   e.preventDefault();
                   const form = e.target as HTMLFormElement;
                   const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                   const file = (form.elements.namedItem('avatar') as HTMLInputElement).files?.[0] || null;
                   handleProfileSave(name, file);
               }}>
                  <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">暱稱</label>
                      <input name="name" defaultValue={myProfile.name} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-300 outline-none" maxLength={10} required />
                  </div>
                  <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">頭像</label>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                             {myProfile.avatarUrl ? (
                               <img src={myProfile.avatarUrl} className="h-20 w-20 object-cover rounded-full mb-2" alt="Preview"/>
                             ) : (
                               <CameraIcon />
                             )}
                             <p className="text-xs text-gray-500">點擊上傳圖片</p>
                          </div>
                          <input name="avatar" type="file" className="hidden" accept="image/*" />
                      </label>
                  </div>
                  <div className="flex space-x-3">
                      <button type="button" onClick={() => setShowProfileModal(false)} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                      <button type="submit" className="flex-1 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600">儲存</button>
                  </div>
               </form>
           </div>
        </div>
      )}

      {/* Online Connection Modal (Existing) */}
      {showOnlineModal && gameMode === GameMode.ONLINE && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
               <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                  <GlobeIcon /> 遠端連線
               </h3>
               <p className="text-sm text-gray-500 mb-6">將你的 ID 分享給曉琳，或輸入她的 ID 來連線。</p>
               
               <div className="space-y-6">
                   <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">你的連線 ID</label>
                       <div className="flex items-center mt-1 space-x-2">
                           <code className="flex-1 bg-white px-3 py-2 rounded border font-mono text-lg text-pink-600 select-all">
                               {myPeerId || '正在生成 ID...'}
                           </code>
                           <button 
                             onClick={() => { navigator.clipboard.writeText(myPeerId); alert('已複製 ID'); }}
                             className="px-3 py-2 bg-white border hover:bg-gray-50 rounded text-sm font-medium"
                           >
                             複製
                           </button>
                       </div>
                       <p className="text-xs text-gray-400 mt-2">請曉琳輸入這組 ID 加入你的遊戲</p>
                   </div>
                   
                   <div className="relative">
                       <div className="absolute inset-0 flex items-center" aria-hidden="true">
                           <div className="w-full border-t border-gray-200"></div>
                       </div>
                       <div className="relative flex justify-center">
                           <span className="bg-white px-2 text-sm text-gray-500">或是</span>
                       </div>
                   </div>

                   <div>
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">輸入對方的 ID</label>
                       <div className="flex items-center mt-1 space-x-2">
                           <input 
                             value={targetPeerId}
                             onChange={(e) => setTargetPeerId(e.target.value)}
                             placeholder="貼上對方的 ID"
                             className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-300 outline-none"
                           />
                           <button 
                             onClick={connectToPeer}
                             disabled={!targetPeerId || connectionStatus === 'connecting'}
                             className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                           >
                             {connectionStatus === 'connecting' ? '連線中...' : '加入'}
                           </button>
                       </div>
                   </div>
               </div>
               
               <button 
                  onClick={() => setShowOnlineModal(false)}
                  className="mt-6 w-full py-2 text-gray-500 hover:text-gray-800 text-sm"
               >
                  關閉視窗 (稍後再連)
               </button>
           </div>
        </div>
      )}
    </div>
  );
}