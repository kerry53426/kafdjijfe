import React, { useState, useEffect } from 'react';
import { DiceState, DicePlayer } from '../types';
import { getXiaoLinLiarMove } from '../services/gemini';

interface LiarsDiceProps {
    onMessage: (msg: string) => void;
    isPve: boolean;
}

interface DiceFaceProps {
    value: number;
    className?: string;
}

const DiceFace: React.FC<DiceFaceProps> = ({ value, className = "" }) => {
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

// AI Personas
const OPPONENTS = [
    { name: '曉琳', persona: 'Xiao Lin', color: 'pink', avatar: 'https://picsum.photos/seed/xiaolin/100' },
    { name: '阿豪', persona: 'Aggressive', color: 'orange', avatar: 'https://picsum.photos/seed/ahhao/100' },
    { name: '小美', persona: 'Cautious', color: 'teal', avatar: 'https://picsum.photos/seed/xiaomei/100' }
];

export const LiarsDiceGame: React.FC<LiarsDiceProps> = ({ onMessage, isPve }) => {
    const [setupMode, setSetupMode] = useState(true);
    const [aiCount, setAiCount] = useState(1);

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

    // Initialize Game
    const startGame = (count: number) => {
        const initialPlayers: DicePlayer[] = [
            { id: 'me', name: '你', isAi: false, dice: [], diceCount: 5 }
        ];

        for (let i = 0; i < count; i++) {
            initialPlayers.push({
                id: `ai-${i}`,
                name: OPPONENTS[i].name,
                isAi: true,
                persona: OPPONENTS[i].persona,
                dice: [],
                diceCount: 5,
                avatar: OPPONENTS[i].avatar
            });
        }

        setGameState({
            players: initialPlayers,
            currentPlayerIndex: 0,
            currentBid: null,
            history: ['遊戲開始！'],
            roundWinner: null,
            gameWinner: null,
            isThinking: false
        });
        setSetupMode(false);
        setAiCount(count);
        
        // Start first round logic
        setTimeout(() => startRound(initialPlayers), 100);
    };

    const rollDice = (count: number) => {
        return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
    };

    const startRound = (playersOverride?: DicePlayer[]) => {
        setGameState(prev => {
            const players = playersOverride || prev.players;
            // Only roll for players still in game
            const newPlayers = players.map(p => ({
                ...p,
                dice: p.diceCount > 0 ? rollDice(p.diceCount) : []
            }));

            // Find valid starter (next person after round loser, or random if game start)
            let startIndex = prev.currentPlayerIndex;
            if (prev.roundWinner) {
                // Loser starts (which is the roundWinner in prev context logic usually? No, roundWinner is who WON the call)
                // Actually in Liar's dice, usually the loser starts the next round.
                // My logic: roundWinner = person who won the call (caller or bidder).
                // So loser is the other one.
                // Let's simplify: Random start or maintain index
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
        if (currentPlayer && currentPlayer.isAi && !gameState.roundWinner && !gameState.gameWinner && !gameState.isThinking) {
            handleAiTurn(currentPlayer);
        }
    }, [gameState.currentPlayerIndex, gameState.roundWinner, gameState.gameWinner]);

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
    };

    const handleCall = () => {
        const { currentBid, currentPlayerIndex, players } = gameState;
        if (!currentBid) return;

        const caller = players[currentPlayerIndex];
        const bidder = players.find(p => p.id === currentBid.playerId)!;

        // Count logic
        const targetFace = currentBid.face;
        const allDice = players.flatMap(p => p.dice);
        const count = allDice.filter(d => d === targetFace || d === 1).length;

        const isCallSuccessful = count < currentBid.quantity;
        const loserId = isCallSuccessful ? bidder.id : caller.id;
        const winnerId = isCallSuccessful ? caller.id : bidder.id;

        const loserName = players.find(p => p.id === loserId)?.name;
        
        const msg = `開牌！總共 ${count} 個。${loserName} 輸了！`;
        onMessage(msg);

        // Update Dice Counts
        const newPlayers = players.map(p => {
            if (p.id === loserId) {
                return { ...p, diceCount: Math.max(0, p.diceCount - 1) };
            }
            return p;
        });

        // Check Game Over (Only 1 player left)
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
            history: [...prev.history, `${msg}`]
        }));
    };

    const handleAiTurn = async (aiPlayer: DicePlayer) => {
        setGameState(prev => ({ ...prev, isThinking: true }));
        
        // Calculate total dice remaining in game
        const totalDice = gameState.players.reduce((sum, p) => sum + p.diceCount, 0);

        try {
            const aiMove = await getXiaoLinLiarMove(
                aiPlayer.dice,
                totalDice,
                gameState.currentBid ? { quantity: gameState.currentBid.quantity, face: gameState.currentBid.face } : null,
                gameState.history,
                aiPlayer.persona
            );

            await new Promise(r => setTimeout(r, 1500)); // Fake delay

            if (aiPlayer.persona === 'Xiao Lin') {
                onMessage(aiMove.message); // Only Xiao Lin talks in chat widget to reduce noise, or all? Let's just do Xiao Lin for now or all if needed.
            }

            if (aiMove.action === 'CALL') {
                handleCall();
            } else {
                 // Force logic: if AI tries to bid lower, auto fix it to minimum raise
                 let q = aiMove.quantity || (gameState.currentBid?.quantity || 1);
                 let f = aiMove.face || (gameState.currentBid?.face || 2);
                 
                 if (gameState.currentBid) {
                     if (q < gameState.currentBid.quantity || (q === gameState.currentBid.quantity && f <= gameState.currentBid.face)) {
                         // Fallback logic if AI hallucinated invalid move
                         q = gameState.currentBid.quantity;
                         f = gameState.currentBid.face + 1;
                         if (f > 6) { q++; f = 1; }
                     }
                 }

                 // Update inputs for user convenience
                 setBidQuantity(q);
                 setBidFace(f);
                 
                 // Apply Move
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

    if (setupMode) {
        return (
            <div className="flex flex-col items-center w-full max-w-lg bg-slate-100 p-6 rounded-xl shadow-xl border-4 border-slate-300 text-center">
                <h2 className="text-2xl font-bold text-slate-700 mb-4">🎲 吹牛骰子派對</h2>
                <p className="mb-6 text-gray-500">選擇對手數量</p>
                
                <div className="grid grid-cols-3 gap-4 mb-8 w-full">
                    {[1, 2, 3].map(num => (
                        <button 
                          key={num}
                          onClick={() => setAiCount(num)}
                          className={`p-4 rounded-xl border-2 transition-all ${aiCount === num ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 bg-white'}`}
                        >
                            <div className="text-3xl font-bold mb-1">{num}</div>
                            <div className="text-xs text-gray-400">位 AI</div>
                        </button>
                    ))}
                </div>
                
                <div className="text-sm text-left w-full bg-white p-4 rounded-lg mb-6">
                    <p className="font-bold mb-2">參賽者：</p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                        <li>你 (主角)</li>
                        {Array.from({length: aiCount}).map((_, i) => (
                            <li key={i} style={{color: OPPONENTS[i].color}}>
                                {OPPONENTS[i].name} ({i === 0 ? '聰明俏皮' : i === 1 ? '衝動愛演' : '謹慎保守'})
                            </li>
                        ))}
                    </ul>
                </div>

                <button 
                  onClick={() => startGame(aiCount)}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700"
                >
                    開始遊戲
                </button>
            </div>
        );
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isMyTurn = currentPlayer.id === 'me';
    const myPlayer = gameState.players.find(p => p.id === 'me');

    return (
        <div className="flex flex-col items-center w-full max-w-lg bg-slate-100 p-2 sm:p-4 rounded-xl shadow-xl border-4 border-slate-300">
             <div className="w-full flex justify-between items-center mb-4 border-b pb-2">
                 <h2 className="text-lg sm:text-xl font-bold text-slate-700 flex items-center">
                    🎲 吹牛骰子 <span className="text-xs ml-2 text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{gameState.players.filter(p=>p.diceCount>0).length}人存活</span>
                 </h2>
                 <button onClick={() => setSetupMode(true)} className="text-xs text-blue-500 underline">重選人數</button>
             </div>

             {/* Opponents Grid */}
             <div className="grid grid-cols-3 gap-2 w-full mb-4">
                 {gameState.players.filter(p => p.isAi).map(p => (
                     <div key={p.id} className={`bg-white p-2 rounded-lg border-2 flex flex-col items-center relative transition-all ${gameState.players[gameState.currentPlayerIndex]?.id === p.id ? 'border-pink-500 shadow-md scale-105 z-10' : 'border-gray-100 opacity-80'}`}>
                         {/* Avatar / Status */}
                         <div className="w-8 h-8 rounded-full bg-gray-200 mb-1 overflow-hidden relative">
                             {p.avatar && <img src={p.avatar} className="w-full h-full object-cover" />}
                             {p.diceCount === 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs">OUT</div>}
                         </div>
                         <div className="text-xs font-bold truncate w-full text-center">{p.name}</div>
                         <div className="text-xs text-gray-500">剩 {p.diceCount} 顆</div>
                         
                         {/* Bubble if active */}
                         {gameState.players[gameState.currentPlayerIndex]?.id === p.id && !gameState.roundWinner && (
                             <div className="absolute -top-6 bg-pink-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                                 {gameState.isThinking ? '思考中...' : '我的回合'}
                             </div>
                         )}

                         {/* Dice (Hidden/Revealed) */}
                         <div className="flex -space-x-1 mt-1 overflow-hidden h-6 items-center">
                            {p.diceCount > 0 && (
                                gameState.roundWinner ? (
                                    p.dice.map((d, i) => <span key={i} className="text-[10px] bg-gray-100 border px-1 rounded">{d}</span>)
                                ) : (
                                    <span className="text-xl">🎲</span>
                                )
                            )}
                         </div>
                     </div>
                 ))}
             </div>

             {/* Center Info Table */}
             <div className="w-full bg-white rounded-lg border border-slate-200 p-2 mb-4 h-32 overflow-y-auto shadow-inner text-sm">
                 {gameState.history.map((h, i) => <div key={i} className="py-0.5 border-b border-gray-50 last:border-0">{h}</div>)}
                 <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })}></div>
             </div>

             {/* Current Bid Display */}
             {gameState.currentBid && (
                 <div className="w-full bg-yellow-50 border border-yellow-200 p-2 rounded-lg mb-4 text-center">
                     <div className="text-xs text-gray-500">當前叫牌</div>
                     <div className="text-xl font-bold text-yellow-700 flex items-center justify-center gap-2">
                         <span>{gameState.currentBid.quantity} 個</span>
                         <DiceFace value={gameState.currentBid.face} className="!w-6 !h-6" />
                     </div>
                 </div>
             )}

             {/* Player Area */}
             <div className={`w-full p-4 rounded-xl border-2 transition-colors mb-4 ${isMyTurn ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-200'}`}>
                 <div className="flex justify-between items-center mb-2">
                     <span className="font-bold text-gray-700">你的骰子 ({myPlayer?.diceCount})</span>
                     {isMyTurn && !gameState.roundWinner && <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full animate-pulse">輪到你了</span>}
                 </div>
                 {myPlayer && myPlayer.diceCount > 0 ? (
                    <div className="flex space-x-2 justify-center">
                        {myPlayer.dice.map((d, i) => <DiceFace key={i} value={d} />)}
                    </div>
                 ) : (
                    <div className="text-center text-red-500 font-bold">你出局了 😭</div>
                 )}
             </div>

             {/* Controls */}
             {!gameState.winner && !gameState.roundWinner && isMyTurn && myPlayer && myPlayer.diceCount > 0 && (
                 <div className="w-full grid grid-cols-5 gap-2">
                     {/* Call Button */}
                     <button 
                       onClick={handleCall}
                       disabled={!gameState.currentBid}
                       className="col-span-2 bg-red-500 text-white py-2 rounded-xl font-bold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex flex-col items-center justify-center"
                     >
                        <span className="text-lg">抓！</span>
                        <span className="text-[10px]">對方吹牛</span>
                     </button>

                     {/* Bid Controls */}
                     <div className="col-span-3 bg-white p-2 rounded-xl border border-gray-300 flex flex-col items-center shadow-md">
                         <div className="flex items-center space-x-2 mb-2 w-full justify-center">
                             <input 
                               type="number" 
                               min="1" 
                               max={30} 
                               value={bidQuantity} 
                               onChange={(e) => setBidQuantity(parseInt(e.target.value))}
                               className="w-12 border rounded text-center py-1 bg-gray-50 font-bold"
                             />
                             <span className="text-xs">個</span>
                             <select 
                               value={bidFace}
                               onChange={(e) => setBidFace(parseInt(e.target.value))}
                               className="border rounded py-1 px-1 bg-gray-50"
                             >
                                 {[1,2,3,4,5,6].map(f => <option key={f} value={f}>{f}</option>)}
                             </select>
                         </div>
                         <button 
                           onClick={handleBid}
                           className="w-full bg-blue-500 text-white py-1 rounded font-bold hover:bg-blue-600 text-sm"
                         >
                           喊牌 (加注)
                         </button>
                     </div>
                 </div>
             )}

             {gameState.roundWinner && !gameState.winner && (
                 <button 
                   onClick={() => startRound()}
                   className="w-full py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 animate-bounce shadow-lg"
                 >
                   下一局
                 </button>
             )}

             {gameState.winner && (
                 <div className="text-center mt-4">
                     <div className="text-2xl font-bold mb-2 text-purple-600">
                         {gameState.winner === 'me' ? '恭喜！你是最後贏家！🎉' : '遊戲結束，下次加油！'}
                     </div>
                     <button onClick={() => setSetupMode(true)} className="px-6 py-2 bg-purple-500 text-white rounded-full font-bold shadow hover:bg-purple-600">
                         返回大廳
                     </button>
                 </div>
             )}
        </div>
    );
};