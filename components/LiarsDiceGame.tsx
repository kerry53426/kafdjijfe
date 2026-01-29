import React, { useState, useEffect } from 'react';
import { DiceState, DicePlayer, GameMode, LiarAction, UserProfile } from '../types';
import { getXiaoLinLiarMove } from '../services/gemini';

interface LiarsDiceProps {
    onMessage: (msg: string) => void;
    gameMode: GameMode;
    onSendAction?: (action: LiarAction) => void;
    incomingAction?: LiarAction | null;
    myProfile?: UserProfile;
    opponentProfile?: UserProfile;
}

interface DiceFaceProps {
    value: number;
    className?: string;
    hidden?: boolean;
}

const DiceFace: React.FC<DiceFaceProps> = ({ value, className = "", hidden = false }) => {
    if (hidden) {
        return (
            <div className={`relative w-8 h-8 sm:w-10 sm:h-10 bg-gray-800 rounded-lg shadow-md border border-gray-700 flex items-center justify-center flex-shrink-0 ${className}`}>
                <span className="text-white text-xl">?</span>
            </div>
        );
    }

    // Determine dot positions based on value
    const dots = [];
    if ([1, 3, 5].includes(value)) dots.push('center');
    if ([2, 3, 4, 5, 6].includes(value)) dots.push('top-left', 'bottom-right');
    if ([4, 5, 6].includes(value)) dots.push('top-right', 'bottom-left');
    if (value === 6) dots.push('middle-left', 'middle-right');

    const positions: Record<string, string> = {
        'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'top-left': 'top-2 left-2',
        'top-right': 'top-2 right-2',
        'bottom-left': 'bottom-2 left-2',
        'bottom-right': 'bottom-2 right-2',
        'middle-left': 'top-1/2 left-2 -translate-y-1/2',
        'middle-right': 'top-1/2 right-2 -translate-y-1/2'
    };

    return (
        <div className={`relative w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg shadow-md border border-gray-200 flex-shrink-0 ${className}`}>
            {dots.map((pos, i) => (
                <div key={i} className={`absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${value === 1 ? 'bg-red-500' : 'bg-gray-800'} ${positions[pos]}`} />
            ))}
        </div>
    );
};

export const LiarsDiceGame: React.FC<LiarsDiceProps> = ({ 
    onMessage, 
    gameMode, 
    onSendAction, 
    incomingAction,
    myProfile,
    opponentProfile 
}) => {
    const isOnline = gameMode === GameMode.ONLINE;

    const [gameState, setGameState] = useState<DiceState>({
        players: [],
        currentPlayerIndex: 0,
        currentBid: null,
        history: [],
        roundWinner: null,
        gameWinner: null,
        isThinking: false
    });

    const [bidQuantity, setBidQuantity] = useState(1);
    const [bidFace, setBidFace] = useState(2);

    // Initialize Game on Mount or Mode Change
    useEffect(() => {
        startGame();
    }, [gameMode, isOnline]);

    // Handle Incoming Online Actions
    useEffect(() => {
        if (!isOnline || !incomingAction) return;
        handleRemoteAction(incomingAction);
    }, [incomingAction, isOnline]);

    const startGame = () => {
        const p1: DicePlayer = { 
            id: 'me', 
            name: myProfile?.name || '我', 
            isAi: false, 
            dice: [], 
            diceCount: 5,
            avatar: myProfile?.avatarUrl 
        };
        
        let p2: DicePlayer;

        if (isOnline) {
             p2 = { 
                id: 'opponent', 
                name: opponentProfile?.name || '對手', 
                isAi: false, 
                isRemote: true,
                dice: [], 
                diceCount: 5,
                avatar: opponentProfile?.avatarUrl 
            };
        } else {
             // PVE Mode - Always Xiao Lin
             p2 = {
                id: 'ai-xiaolin',
                name: '曉琳',
                isAi: true,
                persona: 'Xiao Lin',
                dice: [],
                diceCount: 5,
                avatar: 'https://picsum.photos/seed/xiaolin/100'
            };
        }

        setGameState({
            players: [p1, p2],
            currentPlayerIndex: 0,
            currentBid: null,
            history: ['遊戲開始！'],
            roundWinner: null,
            gameWinner: null,
            isThinking: false
        });
        
        // Auto start first round
        setTimeout(() => startRound([p1, p2]), 100);
    };

    const rollDice = (count: number) => {
        return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
    };

    const startRound = (playersOverride?: DicePlayer[]) => {
        setGameState(prev => {
            const players = playersOverride || prev.players;
            
            const newPlayers = players.map(p => {
                if (isOnline && p.isRemote) {
                    return { ...p, dice: Array(p.diceCount).fill(0) }; // Hidden for online
                }
                return {
                    ...p,
                    dice: p.diceCount > 0 ? rollDice(p.diceCount) : []
                };
            });

            // Winner of previous round starts, or random/P1 if first round
            let startIndex = 0;
            if (prev.roundWinner) {
                const winnerIndex = players.findIndex(p => p.id === prev.roundWinner);
                if (winnerIndex !== -1) startIndex = winnerIndex;
            }

            // Ensure starter is alive
            while(newPlayers[startIndex].diceCount === 0) {
                 startIndex = (startIndex + 1) % newPlayers.length;
            }

            return {
                ...prev,
                players: newPlayers,
                currentPlayerIndex: startIndex,
                currentBid: null,
                roundWinner: null,
                history: [`--- 新回合 ---`],
                isThinking: false
            };
        });
        setBidQuantity(1);
        setBidFace(2);
    };

    // AI Trigger
    useEffect(() => {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (!isOnline && currentPlayer && currentPlayer.isAi && !gameState.roundWinner && !gameState.gameWinner && !gameState.isThinking) {
            handleAiTurn(currentPlayer);
        }
    }, [gameState.currentPlayerIndex, gameState.roundWinner, gameState.gameWinner, isOnline]);

    const handleBid = () => {
        const { currentBid, currentPlayerIndex, players } = gameState;
        const player = players[currentPlayerIndex];

        // Validation
        if (currentBid) {
            if (bidQuantity < currentBid.quantity) return;
            if (bidQuantity === currentBid.quantity && bidFace <= currentBid.face) return;
        }

        const newBid = { quantity: bidQuantity, face: bidFace, playerId: player.id };
        
        // Move turn
        let nextIndex = (currentPlayerIndex + 1) % players.length;
        while(players[nextIndex].diceCount === 0) {
            nextIndex = (nextIndex + 1) % players.length;
        }

        setGameState(prev => ({
            ...prev,
            currentBid: newBid,
            currentPlayerIndex: nextIndex,
            history: [...prev.history, `${player.name} 喊了: ${newBid.quantity} 個 ${newBid.face}`]
        }));
        
        // Auto adjust next bid input default
        setBidQuantity(newBid.quantity);

        if (isOnline && onSendAction) {
            onSendAction({ 
                type: 'BID', 
                payload: { quantity: bidQuantity, face: bidFace } 
            });
        }
    };

    const handleCall = () => {
        const { currentBid, currentPlayerIndex, players } = gameState;
        if (!currentBid) return;

        if (isOnline && onSendAction) {
            // 1. Send Call
            onSendAction({ type: 'CALL' });
            // 2. Send My Dice
            const myDice = players.find(p => p.id === 'me')?.dice || [];
            onSendAction({ type: 'REVEAL', payload: { dice: myDice } });
            
            setGameState(prev => ({
                 ...prev,
                 history: [...prev.history, `${players[currentPlayerIndex].name} 喊了抓！(等待開牌...)`]
            }));
        } else {
            // Offline Logic
            resolveRound(currentPlayerIndex, currentBid.playerId);
        }
    };

    const resolveRound = (callerIndex: number, bidderId: string) => {
        const { players, currentBid } = gameState;
        if (!currentBid) return;

        const caller = players[callerIndex];
        const bidder = players.find(p => p.id === bidderId)!;

        // Count logic
        const targetFace = currentBid.face;
        const allDice = players.flatMap(p => p.dice);
        const count = allDice.filter(d => d === targetFace || d === 1).length;

        const isCallSuccessful = count < currentBid.quantity;
        const loserId = isCallSuccessful ? bidder.id : caller.id;
        const winnerId = isCallSuccessful ? caller.id : bidder.id;

        const loserName = players.find(p => p.id === loserId)?.name;
        const msg = `開牌！${targetFace} 點有 ${count} 個。${loserName} 輸了！`;
        onMessage(msg);

        // Update Dice Counts
        const newPlayers = players.map(p => {
            if (p.id === loserId) {
                return { ...p, diceCount: Math.max(0, p.diceCount - 1) };
            }
            return p;
        });

        // Check Game Over
        const survivors = newPlayers.filter(p => p.diceCount > 0);
        let gameWinner = null;
        if (survivors.length === 1) {
            gameWinner = survivors[0].id;
        }

        setGameState(prev => ({
            ...prev,
            players: newPlayers,
            roundWinner: winnerId,
            gameWinner,
            history: [...prev.history, msg]
        }));
    };

    const handleRemoteAction = (action: LiarAction) => {
        const { players, currentPlayerIndex } = gameState;
        const remotePlayer = players.find(p => p.isRemote);
        if (!remotePlayer) return;

        if (action.type === 'BID') {
            const q = action.payload?.quantity || 1;
            const f = action.payload?.face || 2;
            
            const newBid = { quantity: q, face: f, playerId: remotePlayer.id };
            
            let nextIndex = (currentPlayerIndex + 1) % players.length;
            while(players[nextIndex].diceCount === 0) {
                 nextIndex = (nextIndex + 1) % players.length;
            }

            setGameState(prev => ({
                ...prev,
                currentBid: newBid,
                currentPlayerIndex: nextIndex,
                history: [...prev.history, `${remotePlayer.name} 喊了: ${q} 個 ${f}`]
            }));
            
            setBidQuantity(q);
            setBidFace(f);
        } 
        else if (action.type === 'CALL') {
            setGameState(prev => ({
                 ...prev,
                 history: [...prev.history, `${remotePlayer.name} 喊了抓！(等待開牌...)`]
            }));
            if (onSendAction) {
                const myDice = players.find(p => p.id === 'me')?.dice || [];
                onSendAction({ type: 'REVEAL', payload: { dice: myDice } });
            }
        }
        else if (action.type === 'REVEAL') {
            const opponentDice = action.payload?.dice || [];
            const updatedPlayers = players.map(p => {
                if (p.isRemote) return { ...p, dice: opponentDice };
                return p;
            });
            setGameState(prev => ({ ...prev, players: updatedPlayers }));
            
            setTimeout(() => {
                if (!gameState.roundWinner) {
                    resolveRound(gameState.currentPlayerIndex, gameState.currentBid!.playerId);
                }
            }, 500);
        }
        else if (action.type === 'NEW_ROUND') {
            startRound();
        }
    };

    const handleNextRound = () => {
        startRound();
        if (isOnline && onSendAction) {
            onSendAction({ type: 'NEW_ROUND' });
        }
    };

    const handleAiTurn = async (aiPlayer: DicePlayer) => {
        setGameState(prev => ({ ...prev, isThinking: true }));
        
        const totalDice = gameState.players.reduce((sum, p) => sum + p.diceCount, 0);

        try {
            const aiMove = await getXiaoLinLiarMove(
                aiPlayer.dice,
                totalDice,
                gameState.currentBid ? { quantity: gameState.currentBid.quantity, face: gameState.currentBid.face } : null,
                gameState.history,
                aiPlayer.persona
            );

            await new Promise(r => setTimeout(r, 1500)); 

            if (aiPlayer.persona === 'Xiao Lin') {
                onMessage(aiMove.message);
            }

            if (aiMove.action === 'CALL') {
                handleCall();
            } else {
                 let q = aiMove.quantity || (gameState.currentBid?.quantity || 1);
                 let f = aiMove.face || (gameState.currentBid?.face || 2);
                 
                 // Fallback valid move logic
                 if (gameState.currentBid) {
                     if (q < gameState.currentBid.quantity || (q === gameState.currentBid.quantity && f <= gameState.currentBid.face)) {
                         q = gameState.currentBid.quantity;
                         f = gameState.currentBid.face + 1;
                         if (f > 6) { q++; f = 1; }
                     }
                 }

                 setBidQuantity(q);
                 setBidFace(f);
                 
                 const nextBid = { quantity: q, face: f, playerId: aiPlayer.id };
                 let nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
                 while(gameState.players[nextIndex].diceCount === 0) {
                    nextIndex = (nextIndex + 1) % gameState.players.length;
                 }
                 
                 setGameState(prev => ({
                     ...prev,
                     currentBid: nextBid,
                     currentPlayerIndex: nextIndex,
                     history: [...prev.history, `${aiPlayer.name} 喊了: ${nextBid.quantity} 個 ${nextBid.face}`],
                     isThinking: false
                 }));
            }

        } catch (e) {
            console.error(e);
            setGameState(prev => ({ ...prev, isThinking: false }));
        }
    };

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isMyTurn = currentPlayer?.id === 'me';
    const myPlayer = gameState.players.find(p => p.id === 'me');
    const opponent = gameState.players.find(p => p.id !== 'me');

    return (
        <div className="flex flex-col items-center w-full max-w-lg bg-slate-100 p-2 sm:p-4 rounded-xl shadow-xl border-4 border-slate-300">
             <div className="w-full flex justify-between items-center mb-4 border-b pb-2">
                 <h2 className="text-lg sm:text-xl font-bold text-slate-700 flex items-center">
                    🎲 吹牛骰子 <span className="text-xs ml-2 text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{gameState.players.filter(p=>p.diceCount>0).length}人存活</span>
                 </h2>
             </div>

             {/* Opponent Area */}
             <div className="flex justify-center w-full mb-6">
                 {opponent && (
                     <div className={`bg-white p-4 rounded-xl border-4 flex flex-col items-center relative transition-all w-40 ${gameState.players[gameState.currentPlayerIndex]?.id === opponent.id ? 'border-pink-500 shadow-lg scale-110 z-10' : 'border-gray-200 opacity-90'}`}>
                         {/* Avatar */}
                         <div className="w-16 h-16 rounded-full bg-gray-200 mb-2 overflow-hidden relative shadow-inner">
                             {opponent.avatar && <img src={opponent.avatar} className="w-full h-full object-cover" />}
                             {opponent.diceCount === 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">OUT</div>}
                         </div>
                         <div className="text-base font-bold truncate w-full text-center text-gray-800">{opponent.name}</div>
                         <div className="text-xs text-pink-500 font-bold bg-pink-50 px-2 py-0.5 rounded-full mt-1">剩 {opponent.diceCount} 顆</div>
                         
                         {/* Status Bubble */}
                         {gameState.players[gameState.currentPlayerIndex]?.id === opponent.id && !gameState.roundWinner && (
                             <div className="absolute -top-3 -right-3 bg-pink-500 text-white text-xs px-3 py-1 rounded-full animate-bounce shadow-md">
                                 {gameState.isThinking ? '思考中...' : '對方回合'}
                             </div>
                         )}

                         {/* Opponent Dice */}
                         <div className="flex -space-x-2 mt-3 overflow-hidden h-8 items-center justify-center pl-2">
                            {opponent.diceCount > 0 && opponent.dice.map((d, i) => (
                                <DiceFace 
                                    key={i} 
                                    value={d} 
                                    // Ensure dice are hidden until the round ends (roundWinner is set)
                                    // In Online mode, d is initially 0, but even if it has a value (PVE or revealed), we mask it unless round is over.
                                    hidden={d === 0 || !gameState.roundWinner} 
                                    className="scale-75 origin-center shadow-sm"
                                />
                            ))}
                         </div>
                     </div>
                 )}
             </div>

             {/* Center Info Table (History) */}
             <div className="w-full bg-white rounded-lg border border-slate-200 p-2 mb-4 h-32 overflow-y-auto shadow-inner text-sm relative">
                 <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-white to-transparent pointer-events-none"></div>
                 {gameState.history.map((h, i) => <div key={i} className="py-1 border-b border-gray-50 last:border-0 px-2 text-gray-600">{h}</div>)}
                 <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })}></div>
             </div>

             {/* Current Bid Display */}
             {gameState.currentBid && (
                 <div className="w-full bg-yellow-50 border-2 border-yellow-200 p-3 rounded-xl mb-6 text-center shadow-sm flex items-center justify-between px-6">
                     <span className="text-xs text-yellow-600 font-bold uppercase">Current Bid</span>
                     <div className="text-2xl font-bold text-yellow-800 flex items-center gap-3">
                         <span className="text-3xl">{gameState.currentBid.quantity}</span>
                         <span className="text-sm text-yellow-600 mt-2">個</span>
                         <DiceFace value={gameState.currentBid.face} className="!w-10 !h-10" />
                     </div>
                 </div>
             )}

             {/* My Player Area */}
             <div className={`w-full p-4 rounded-xl border-4 transition-colors mb-4 ${isMyTurn ? 'bg-blue-50 border-blue-400 shadow-md' : 'bg-gray-50 border-gray-200'}`}>
                 <div className="flex justify-between items-center mb-4">
                     <span className="font-bold text-gray-700 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-300">
                             {myPlayer?.avatar && <img src={myPlayer.avatar} className="w-full h-full object-cover" />}
                        </div>
                        你的骰子
                     </span>
                     {isMyTurn && !gameState.roundWinner && <span className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full animate-pulse shadow-sm">輪到你了</span>}
                 </div>
                 
                 {myPlayer && myPlayer.diceCount > 0 ? (
                    <div className="flex space-x-3 justify-center py-2 bg-white/50 rounded-lg">
                        {myPlayer.dice.map((d, i) => <DiceFace key={i} value={d} />)}
                    </div>
                 ) : (
                    <div className="text-center text-red-500 font-bold py-4 bg-red-50 rounded-lg">你出局了 😭</div>
                 )}
             </div>

             {/* Controls */}
             {!gameState.winner && !gameState.roundWinner && isMyTurn && myPlayer && myPlayer.diceCount > 0 && (
                 <div className="w-full grid grid-cols-5 gap-3">
                     {/* Call Button */}
                     <button 
                       onClick={handleCall}
                       disabled={!gameState.currentBid}
                       className="col-span-2 bg-red-500 text-white py-2 rounded-xl font-bold hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex flex-col items-center justify-center border-b-4 border-red-700"
                     >
                        <span className="text-xl">抓！</span>
                        <span className="text-[10px] opacity-80">對方吹牛</span>
                     </button>

                     {/* Bid Controls */}
                     <div className="col-span-3 bg-white p-2 rounded-xl border border-gray-300 flex flex-col items-center shadow-md">
                         <div className="flex items-center space-x-2 mb-2 w-full justify-center">
                             <input 
                               type="number" 
                               min="1" 
                               max={10} 
                               value={bidQuantity} 
                               onChange={(e) => setBidQuantity(parseInt(e.target.value))}
                               className="w-14 h-10 border-2 border-gray-200 rounded-lg text-center text-xl font-bold text-blue-600 focus:border-blue-400 outline-none"
                             />
                             <span className="text-sm text-gray-400 font-bold">個</span>
                             <select 
                               value={bidFace}
                               onChange={(e) => setBidFace(parseInt(e.target.value))}
                               className="h-10 border-2 border-gray-200 rounded-lg px-2 text-lg font-bold text-gray-700 focus:border-blue-400 outline-none bg-white"
                             >
                                 {[1,2,3,4,5,6].map(f => <option key={f} value={f}>{f}</option>)}
                             </select>
                         </div>
                         <button 
                           onClick={handleBid}
                           className="w-full bg-blue-500 text-white py-2 rounded-lg font-bold hover:bg-blue-600 text-sm border-b-4 border-blue-700 active:scale-95 transition-all"
                         >
                           喊牌 (加注)
                         </button>
                     </div>
                 </div>
             )}

             {gameState.roundWinner && !gameState.winner && (
                 <button 
                   onClick={isOnline ? handleNextRound : () => startRound()}
                   className="w-full py-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 animate-bounce shadow-lg text-lg border-b-4 border-green-700 active:scale-95 transition-all mt-4"
                 >
                   {isOnline ? '下一局 (雙方同步)' : '下一局'}
                 </button>
             )}

             {gameState.winner && (
                 <div className="text-center mt-6 w-full bg-white p-6 rounded-2xl shadow-xl border-4 border-purple-200">
                     <div className="text-4xl mb-4">
                         {gameState.winner === 'me' ? '👑' : '😢'}
                     </div>
                     <div className="text-2xl font-bold mb-2 text-purple-600">
                         {gameState.winner === 'me' ? '恭喜！你是最後贏家！' : '遊戲結束，下次加油！'}
                     </div>
                     {!isOnline && (
                         <button onClick={startGame} className="mt-4 px-8 py-3 bg-purple-500 text-white rounded-full font-bold shadow-lg hover:bg-purple-600 transition-all">
                             再來一局
                         </button>
                     )}
                 </div>
             )}
        </div>
    );
};