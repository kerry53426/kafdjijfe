import React, { useState, useEffect, useRef } from 'react';
import { ArcheryState, ArcheryTargetTheme } from '../types';
import { getXiaoLinArcheryReaction } from '../services/gemini';

// --- Assets / Themes ---
const TARGET_THEMES: ArcheryTargetTheme[] = [
  {
    id: 'standard',
    name: '奧運賽靶',
    bgColor: 'bg-emerald-50',
    svgContent: (
      <g>
        {/* White: 1-2 pts */}
        <circle cx="50" cy="50" r="48" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <circle cx="50" cy="50" r="38" fill="white" stroke="#d1d5db" strokeWidth="1" />
        
        {/* Black: 3-4 pts */}
        <circle cx="50" cy="50" r="32" fill="black" />
        <circle cx="50" cy="50" r="24" fill="black" stroke="white" strokeWidth="0.5" />
        
        {/* Blue: 5-6 pts */}
        <circle cx="50" cy="50" r="20" fill="#3b82f6" />
        <circle cx="50" cy="50" r="16" fill="#3b82f6" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />

        {/* Red: 7-8 pts */}
        <circle cx="50" cy="50" r="12" fill="#ef4444" />
        <circle cx="50" cy="50" r="8" fill="#ef4444" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />

        {/* Gold: 9-10 pts */}
        <circle cx="50" cy="50" r="4" fill="#fbbf24" />
        <circle cx="50" cy="50" r="1" fill="#b45309" />
      </g>
    )
  },
  {
    id: 'heart',
    name: '真心靶',
    bgColor: 'bg-pink-50',
    svgContent: (
      <g>
        {/* Outer Heart (Low score) */}
        <path d="M50 90 C 20 70 0 45 0 25 A 25 25 0 0 1 50 25 A 25 25 0 0 1 100 25 C 100 45 80 70 50 90" fill="#fbcfe8" />
        
        {/* Middle Heart */}
        <path d="M50 80 C 30 65 15 45 15 30 A 17 17 0 0 1 50 30 A 17 17 0 0 1 85 30 C 85 45 70 65 50 80" fill="#f472b6" />
        
        {/* Bullseye Heart (High score) */}
        <path d="M50 65 C 40 55 30 40 30 32 A 10 10 0 0 1 50 32 A 10 10 0 0 1 70 32 C 70 40 60 55 50 65" fill="#db2777" stroke="white" strokeWidth="1"/>
        <text x="50" y="40" fontSize="8" fill="white" textAnchor="middle">LOVE</text>
      </g>
    )
  },
  {
    id: 'apple',
    name: '黃金蘋果',
    bgColor: 'bg-blue-50',
    svgContent: (
      <g>
        {/* Just hitting the apple is good, hitting the center is best */}
        <circle cx="50" cy="55" r="35" fill="#ef4444" />
        <path d="M50 20 Q 60 5 70 20" fill="none" stroke="#65a30d" strokeWidth="4" />
        <path d="M50 20 L 50 30" fill="none" stroke="#78350f" strokeWidth="3" />
        
        {/* Shiny reflection */}
        <ellipse cx="35" cy="40" rx="8" ry="12" fill="white" opacity="0.4" transform="rotate(-20 35 40)" />
        
        {/* The Core (10 pts) */}
        <circle cx="50" cy="55" r="5" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
      </g>
    )
  },
  {
    id: 'ufo',
    name: '外星飛碟',
    bgColor: 'bg-slate-900',
    svgContent: (
      <g>
         <ellipse cx="50" cy="60" rx="40" ry="15" fill="#94a3b8" />
         <path d="M30 55 Q 50 20 70 55" fill="#38bdf8" opacity="0.8" stroke="#0ea5e9" />
         {/* Lights */}
         <circle cx="20" cy="60" r="3" fill="#bef264" className="animate-pulse" />
         <circle cx="50" cy="70" r="3" fill="#bef264" className="animate-pulse" />
         <circle cx="80" cy="60" r="3" fill="#bef264" className="animate-pulse" />
         {/* Alien Pilot (Center) */}
         <circle cx="50" cy="45" r="8" fill="#a3e635" />
         <circle cx="47" cy="43" r="2" fill="black" />
         <circle cx="53" cy="43" r="2" fill="black" />
      </g>
    )
  }
];

interface ArcheryGameProps {
  onGameOver: (score: number) => void;
  onMessage: (msg: string) => void;
  isPve: boolean;
}

export const ArcheryGame: React.FC<ArcheryGameProps> = ({ onGameOver, onMessage, isPve }) => {
  const [gameState, setGameState] = useState<ArcheryState>({
    myScore: 0,
    opponentScore: 0,
    round: 1,
    maxRounds: 3,
    isMyTurn: true,
    myShots: [],
    opponentShots: [],
    winner: null
  });

  const [currentTheme, setCurrentTheme] = useState<ArcheryTargetTheme>(TARGET_THEMES[0]);

  // Physics & Animation State
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{x: number, y: number} | null>(null);
  
  // Arrow: x,y are percentages (0-100) relative to container
  // rotation is degrees
  const [arrowPos, setArrowPos] = useState<{x: number, y: number, rotation: number, active: boolean, stuck: boolean}>({ x: 10, y: 50, rotation: 0, active: false, stuck: false });
  const [hitEffect, setHitEffect] = useState<{x: number, y: number, score: number} | null>(null);
  
  const flightReqRef = useRef<number>(0);

  // Constants for Physics
  const DRAG_LIMIT = 100; 
  const POWER_MULTIPLIER = 0.04; // Drag pixels to % velocity
  const GRAVITY = 0.04; // % per frame squared

  useEffect(() => {
    // AI Turn trigger
    if (!gameState.isMyTurn && isPve && !gameState.winner && !arrowPos.active && !arrowPos.stuck) {
       setTimeout(handleAiTurn, 1500);
    }
  }, [gameState.isMyTurn, gameState.winner, arrowPos.active, arrowPos.stuck]);

  // --- Drag Handlers (Left Side of Screen) ---
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!gameState.isMyTurn || gameState.winner || arrowPos.active || arrowPos.stuck) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Only allow drag starting from the left side (Bow area)
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    
    // Bow is approx at 15% width
    const bowZoneLimit = rect.width * 0.4; 

    if (startX > bowZoneLimit) return; // Ignore clicks on the target side

    setIsDragging(true);
    setDragStart({ x: startX, y: startY });
    setDragCurrent({ x: startX, y: startY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStart || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    let dx = (e.clientX - rect.left) - dragStart.x;
    let dy = (e.clientY - rect.top) - dragStart.y;
    
    // Cap drag distance
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > DRAG_LIMIT) {
        const ratio = DRAG_LIMIT / dist;
        dx *= ratio;
        dy *= ratio;
    }
    
    // We want the user to pull "Left" to shoot "Right"
    // Visual feedback usually shows the string following the finger
    setDragCurrent({ x: dragStart.x + dx, y: dragStart.y + dy });
  };

  const handlePointerUp = () => {
    if (!isDragging || !dragStart || !dragCurrent || !containerRef.current) return;
    
    setIsDragging(false);
    
    // Calculate Velocity
    // Pulling LEFT (negative dx) creates POSITIVE X velocity
    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y; // Pulling DOWN creates UPWARD velocity (if aim high)
    
    // If user didn't pull back enough, cancel
    if (dx < 10) { 
        setDragStart(null);
        setDragCurrent(null);
        return; 
    }

    const vx = dx * POWER_MULTIPLIER;
    const vy = dy * POWER_MULTIPLIER; // Keep y logic simple: pull down = aim up

    fireArrow(12, 50, vx, vy); // Start at Bow position (approx 12% left, 50% top)
    
    setDragStart(null);
    setDragCurrent(null);
  };

  const fireArrow = (startX: number, startY: number, vx: number, vy: number) => {
    let currX = startX;
    let currY = startY;
    let currVx = vx;
    let currVy = vy;

    setArrowPos({ x: currX, y: currY, rotation: 0, active: true, stuck: false });
    setHitEffect(null);

    const animateFlight = () => {
        // Physics Step
        currX += currVx;
        currY -= currVy; // Y is inverted in CSS top%, so subtracting positive Up velocity moves it up (lower %)
        
        currVy -= GRAVITY; // Gravity reduces upward velocity, eventually making it negative (down)
        
        // Calculate Angle
        // atan2(y, x). Remember Y is inverted for screen coords
        const angle = Math.atan2(-currVy, currVx) * 180 / Math.PI;

        setArrowPos({ x: currX, y: currY, rotation: angle, active: true, stuck: false });

        // Check Collision with Target Plane (approx 85% to 90% X)
        if (currX > 85 && currX < 95) {
             // We hit the target plane!
             // Check Y coordinate
             // Target center is 50% Y.
             // Radius of target is approx 20% height (visual).
             
             // Calculate distance from center (50, 50 in target local space, but here we use global %)
             const distY = Math.abs(currY - 50);
             
             // Hit!
             if (distY < 25) { 
                 cancelAnimationFrame(flightReqRef.current);
                 // Stick the arrow
                 setArrowPos({ x: currX, y: currY, rotation: angle, active: false, stuck: true });
                 calculateScore(distY);
                 return;
             }
        }

        // Miss (Off screen)
        if (currX > 110 || currY > 110 || currY < -10) {
             cancelAnimationFrame(flightReqRef.current);
             setArrowPos({ x: currX, y: currY, rotation: 0, active: false, stuck: false });
             applyMiss();
             return;
        }

        flightReqRef.current = requestAnimationFrame(animateFlight);
    };

    flightReqRef.current = requestAnimationFrame(animateFlight);
  };

  const calculateScore = (distYPercent: number) => {
      // distYPercent is distance from center (0 = bullseye, 20 = edge)
      // Map 0 -> 10, 20 -> 1
      
      let score = 0;
      if (distYPercent < 2) score = 10;
      else if (distYPercent < 5) score = 9;
      else if (distYPercent < 8) score = 8;
      else if (distYPercent < 11) score = 7;
      else if (distYPercent < 14) score = 6;
      else if (distYPercent < 17) score = 5;
      else if (distYPercent < 20) score = 4;
      else if (distYPercent < 23) score = 3;
      else score = 1;

      // Visual Effect Position (convert back to pixel hint roughly)
      setHitEffect({ x: 90, y: 50 + (arrowPos.y - 50), score }); // 90 is target X center roughly

      setGameState(prev => ({
          ...prev,
          myScore: prev.myScore + score,
          myShots: [...prev.myShots, score],
          isMyTurn: false
      }));
      
      const praises = ["神射手！", "太準了吧！", "不錯喔！", "還有進步空間～"];
      const praise = score === 10 ? "正中紅心！！❤️❤️" : (score >= 8 ? praises[0] : (score >= 5 ? praises[2] : praises[3]));
      
      if(score === 10) onMessage(praise);

      // Reset arrow after delay
      setTimeout(() => {
          setArrowPos({ x: 12, y: 50, rotation: 0, active: false, stuck: false });
          setHitEffect(null);
      }, 1500);
  };

  const applyMiss = () => {
      setGameState(prev => ({
          ...prev,
          myShots: [...prev.myShots, 0],
          isMyTurn: false
      }));
      onMessage("脫靶了！😱");
      setTimeout(() => {
        setArrowPos({ x: 12, y: 50, rotation: 0, active: false, stuck: false });
      }, 1000);
  };

  const handleAiTurn = async () => {
      // Simulate AI Shot visualization? 
      // Simplified: Just update score for now to keep game flow fast, 
      // or we could animate a "Ghost" arrow later.
      
      let aiScore = Math.floor(Math.random() * 4) + 6; // 6-9
      if (Math.random() > 0.8) aiScore = 10;
      if (Math.random() < 0.1) aiScore = Math.floor(Math.random() * 5); // Miss

      const reaction = await getXiaoLinArcheryReaction(aiScore, aiScore > (gameState.myShots[gameState.myShots.length-1] || 0));
      onMessage(`曉琳射出了 ${aiScore} 分！ ${reaction}`);

      const newAiScore = gameState.opponentScore + aiScore;
      
      if (gameState.round >= gameState.maxRounds) {
          let winner: 'me' | 'opponent' | 'draw' = 'draw';
          if (gameState.myScore > newAiScore) winner = 'me';
          if (newAiScore > gameState.myScore) winner = 'opponent';
          
          setGameState(prev => ({
              ...prev,
              opponentScore: newAiScore,
              opponentShots: [...prev.opponentShots, aiScore],
              winner
          }));
      } else {
          setGameState(prev => ({
              ...prev,
              opponentScore: newAiScore,
              opponentShots: [...prev.opponentShots, aiScore],
              isMyTurn: true,
              round: prev.round + 1
          }));
      }
  };

  const resetGame = () => {
      setGameState({
        myScore: 0,
        opponentScore: 0,
        round: 1,
        maxRounds: 3,
        isMyTurn: true,
        myShots: [],
        opponentShots: [],
        winner: null
      });
      setArrowPos({ x: 12, y: 50, rotation: 0, active: false, stuck: false });
      setHitEffect(null);
  };

  // Visual Helpers
  const renderBow = () => {
      // Static Bow part
      return (
          <div className="absolute top-1/2 left-[12%] transform -translate-x-1/2 -translate-y-1/2 w-16 h-32 pointer-events-none z-10">
              {/* Bow Wood */}
              <svg viewBox="0 0 50 100" className="w-full h-full drop-shadow-md">
                   <path d="M 40 5 Q 10 50 40 95" fill="none" stroke="#854d0e" strokeWidth="6" strokeLinecap="round"/>
                   <rect x="10" y="40" width="8" height="20" fill="#451a03" rx="2" />
              </svg>
          </div>
      );
  };

  const renderString = () => {
      // String logic:
      // Anchor Top: Left 12%, Top 50% - (half height of bow approx 15%) -> Top 35%
      // Anchor Bottom: Left 12%, Top 65%
      // Not precise, let's just use fixed pixel offsets relative to container for visual simplicity
      // Or relative %: Bow center is 12, 50. Tips are 12, 35 and 12, 65.
      
      const bowX = 12;
      const tipTopY = 35;
      const tipBotY = 65;

      let pullX = bowX;
      let pullY = 50;

      if (isDragging && dragStart && dragCurrent && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const dxPixels = dragCurrent.x - dragStart.x;
          const dyPixels = dragCurrent.y - dragStart.y;
          
          // Convert pixels to %
          const dxPercent = (dxPixels / rect.width) * 100;
          const dyPercent = (dyPixels / rect.height) * 100;
          
          pullX = Math.min(bowX, bowX + dxPercent); // Can only pull left
          pullY = 50 + dyPercent;
      }

      return (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
             <path 
               d={`M ${bowX} ${tipTopY} L ${pullX} ${pullY} L ${bowX} ${tipBotY}`} 
               stroke="rgba(255, 255, 255, 0.8)" 
               strokeWidth="1.5"
               fill="none"
             />
             {/* Arrow on string if ready */}
             {!arrowPos.active && !arrowPos.stuck && (
                 <line x1={pullX} y1={pullY} x2={bowX + 5} y2={pullY} stroke="#4b5563" strokeWidth="2" />
             )}
          </svg>
      );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl">
       {/* Top Bar: Score & Theme */}
       <div className="bg-white p-3 rounded-xl shadow-lg border-2 border-amber-100 w-full mb-4 flex justify-between items-center">
           <div className="flex items-center space-x-4">
               <div className="text-center">
                   <div className="text-xs text-gray-500 font-bold">YOU</div>
                   <div className="text-xl font-bold text-blue-600">{gameState.myScore}</div>
               </div>
               <div className="text-center px-4 border-l border-r border-gray-100">
                   <div className="text-xs text-gray-400">ROUND</div>
                   <div className="font-bold text-gray-700">{gameState.round}/{gameState.maxRounds}</div>
               </div>
               <div className="text-center">
                   <div className="text-xs text-gray-500 font-bold">XIAO LIN</div>
                   <div className="text-xl font-bold text-pink-600">{gameState.opponentScore}</div>
               </div>
           </div>
           
           <div className="flex items-center space-x-2">
               <span className="text-xs text-gray-400 hidden sm:inline">更換靶心:</span>
               <select 
                 value={currentTheme.id}
                 onChange={(e) => setCurrentTheme(TARGET_THEMES.find(t => t.id === e.target.value) || TARGET_THEMES[0])}
                 className="text-sm border-gray-200 border rounded-full px-3 py-1 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
               >
                   {TARGET_THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
           </div>
       </div>

       {/* Game Viewport */}
       <div 
         ref={containerRef}
         className={`relative w-full aspect-[2/1] ${currentTheme.bgColor} rounded-xl overflow-hidden border-4 border-gray-300 shadow-inner touch-none select-none cursor-crosshair`}
         onPointerDown={handlePointerDown}
         onPointerMove={handlePointerMove}
         onPointerUp={handlePointerUp}
         onPointerLeave={handlePointerUp}
       >
          {/* Background Grid (Optional) */}
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>

          {/* 1. The Bow (Left) */}
          {renderBow()}

          {/* 2. The String (Animated) */}
          {renderString()}

          {/* 3. The Target (Right) - placed at ~90% X */}
          <div className="absolute top-1/2 right-[10%] transform translate-x-1/2 -translate-y-1/2 w-[20%] aspect-square pointer-events-none z-10 drop-shadow-xl transition-transform duration-300">
             <svg viewBox="0 0 100 100" className="w-full h-full">
                 {currentTheme.svgContent}
             </svg>
          </div>

          {/* 4. The Flying Arrow */}
          {(arrowPos.active || arrowPos.stuck) && (
              <div 
                className="absolute w-12 h-2 pointer-events-none z-20"
                style={{
                    left: `${arrowPos.x}%`,
                    top: `${arrowPos.y}%`,
                    transform: `translate(-100%, -50%) rotate(${arrowPos.rotation}deg)`, 
                    // translate -100% X because we want the tip (right side of div) to be at x,y
                    transition: arrowPos.stuck ? 'transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none'
                }}
              >
                 <svg viewBox="0 0 60 10" className="w-full h-full overflow-visible">
                     <line x1="0" y1="5" x2="50" y2="5" stroke="#374151" strokeWidth="2" />
                     {/* Feathers */}
                     <path d="M0 5 L 10 0 M 5 5 L 15 0 M 0 5 L 10 10 M 5 5 L 15 10" stroke="#ef4444" strokeWidth="1" />
                     {/* Tip */}
                     <polygon points="50,2 60,5 50,8" fill="#1f2937" />
                 </svg>
              </div>
          )}

          {/* 5. Hit Effect (Score Popup) */}
          {hitEffect && (
              <div 
                className="absolute z-30 pointer-events-none animate-bounce-in"
                style={{
                    left: `90%`, // Roughly target center
                    top: `${hitEffect.y}%`,
                    transform: 'translate(-50%, -100%)'
                }}
              >
                  <div className={`
                     text-3xl font-black drop-shadow-lg px-2 py-1 rounded-lg border-2 transform -rotate-12
                     ${hitEffect.score === 10 ? 'text-yellow-400 bg-red-600 border-white scale-125' : 'text-white bg-blue-500 border-blue-300'}
                  `}>
                      {hitEffect.score}
                  </div>
              </div>
          )}

          {/* 6. Hint Text */}
          {!gameState.winner && !arrowPos.active && !arrowPos.stuck && gameState.isMyTurn && !isDragging && (
              <div className="absolute bottom-4 left-4 text-gray-400/80 text-sm animate-pulse pointer-events-none">
                  ← 點擊弓箭並向左拖曳
              </div>
          )}
          
          {/* 7. Wind/Gravity Indicator (Optional polish) */}
          <div className="absolute top-2 left-2 text-[10px] text-gray-400 font-mono">
              GRAVITY: ON
          </div>

       </div>

       {/* Game Over Modal */}
       {gameState.winner && (
           <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-xl">
               <div className="bg-white p-6 rounded-2xl shadow-2xl text-center transform scale-110">
                   <h2 className="text-2xl font-bold mb-2">
                       {gameState.winner === 'me' ? '🎯 大獲全勝！' : (gameState.winner === 'draw' ? '🤝 平分秋色' : '😅 再接再厲')}
                   </h2>
                   <p className="text-gray-500 mb-6 text-sm">
                       最終比分: {gameState.myScore} - {gameState.opponentScore}
                   </p>
                   <button 
                     onClick={resetGame}
                     className="px-8 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                   >
                     再來一局
                   </button>
               </div>
           </div>
       )}
    </div>
  );
};