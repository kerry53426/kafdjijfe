import React, { useState } from 'react';
import { RouletteItem } from '../types';

interface RouletteGameProps {
    myName?: string;
    opponentName?: string;
}

// Default punishments for Me (Set by Opponent "Xiao Lin")
const DEFAULT_MY_PUNISHMENTS: RouletteItem[] = [
    { id: '1', text: '請曉琳喝飲料', color: '#fca5a5' }, // red-300
    { id: '2', text: '對視十秒不准笑', color: '#93c5fd' }, // blue-300
    { id: '3', text: '拍一張醜照給曉琳', color: '#fcd34d' }, // amber-300
    { id: '4', text: '誇獎曉琳三個優點', color: '#86efac' }, // green-300
    { id: '5', text: '學貓叫三聲', color: '#d8b4fe' }, // purple-300
    { id: '6', text: '老實回答一個問題', color: '#fdba74' }  // orange-300
];

// Default punishments for Opponent (Set by Me "Yi Cheng")
const DEFAULT_OPPONENT_PUNISHMENTS: RouletteItem[] = [
    { id: '1', text: '錄一段撒嬌語音', color: '#f9a8d4' }, // pink-300
    { id: '2', text: '下次見面請吃飯', color: '#67e8f9' }, // cyan-300
    { id: '3', text: '唱一小段情歌', color: '#fde047' }, // yellow-300
    { id: '4', text: '真心話大冒險', color: '#a7f3d0' }, // emerald-300
    { id: '5', text: '叫一聲「歐巴」', color: '#c4b5fd' }, // violet-300
    { id: '6', text: '傳一張現在的照片', color: '#cbd5e1' }  // slate-300
];

export const RouletteGame: React.FC<RouletteGameProps> = ({ myName = "翊丞", opponentName = "曉琳" }) => {
    const [activeTab, setActiveTab] = useState<'ME' | 'OPPONENT'>('OPPONENT');
    
    // Punishment lists
    const [myItems, setMyItems] = useState<RouletteItem[]>(DEFAULT_MY_PUNISHMENTS);
    const [opponentItems, setOpponentItems] = useState<RouletteItem[]>(DEFAULT_OPPONENT_PUNISHMENTS);

    // Wheel State
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [selectedItem, setSelectedItem] = useState<RouletteItem | null>(null);
    const [newItemText, setNewItemText] = useState('');

    const currentItems = activeTab === 'ME' ? myItems : opponentItems;
    const currentTargetName = activeTab === 'ME' ? myName : opponentName;
    const currentSetterName = activeTab === 'ME' ? opponentName : myName;
    
    // Theme colors
    const themeColor = activeTab === 'ME' ? 'blue' : 'pink'; // Blue for me (my punishment), Pink for her

    const spin = () => {
        if (isSpinning) return;
        setIsSpinning(true);
        setSelectedItem(null);
        
        // Random spin duration and rotations
        const minSpins = 5;
        const extraSpins = Math.random() * 5;
        const totalDegrees = (minSpins + extraSpins) * 360;
        
        // Random end angle
        const endAngle = Math.floor(Math.random() * 360);
        const finalRotation = rotation + totalDegrees + endAngle;
        
        setRotation(finalRotation);
        
        // Duration needs to match CSS transition
        setTimeout(() => {
            setIsSpinning(false);
            calculateResult(finalRotation);
        }, 4000);
    };

    const calculateResult = (finalRot: number) => {
        const normalizedRot = finalRot % 360;
        const pointerAngle = (360 - normalizedRot) % 360;
        const sliceAngle = 360 / currentItems.length;
        const index = Math.floor(pointerAngle / sliceAngle);
        setSelectedItem(currentItems[index]);
    };

    const addItem = () => {
        if (!newItemText.trim()) return;
        const newItem: RouletteItem = {
            id: Date.now().toString(),
            text: newItemText,
            color: `hsl(${Math.random() * 360}, 70%, 80%)`
        };
        
        if (activeTab === 'ME') {
            setMyItems([...myItems, newItem]);
        } else {
            setOpponentItems([...opponentItems, newItem]);
        }
        setNewItemText('');
    };

    const removeItem = (id: string) => {
        if (currentItems.length <= 2) {
            alert("至少要有兩個選項喔！");
            return;
        }
        if (activeTab === 'ME') {
            setMyItems(myItems.filter(i => i.id !== id));
        } else {
            setOpponentItems(opponentItems.filter(i => i.id !== id));
        }
    };

    // Conic Gradient for background
    const getGradient = () => {
        let gradient = 'conic-gradient(';
        const step = 100 / currentItems.length;
        currentItems.forEach((item, index) => {
            gradient += `${item.color} ${index * step}% ${(index + 1) * step}%,`;
        });
        return gradient.slice(0, -1) + ')';
    };

    const handleTabSwitch = (tab: 'ME' | 'OPPONENT') => {
        if (isSpinning) return;
        setActiveTab(tab);
        setRotation(0);
        setSelectedItem(null);
    };

    return (
        <div className={`flex flex-col items-center w-full max-w-lg bg-white p-6 rounded-xl shadow-xl border-4 ${activeTab === 'ME' ? 'border-blue-200' : 'border-pink-200'} transition-colors duration-500`}>
            {/* Header / Tabs */}
            <div className="flex space-x-2 mb-6 w-full p-1 bg-gray-100 rounded-lg">
                <button 
                  onClick={() => handleTabSwitch('OPPONENT')}
                  className={`flex-1 py-2 rounded-md font-bold text-sm sm:text-base transition-all ${activeTab === 'OPPONENT' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                >
                   {opponentName}的懲罰
                </button>
                <button 
                  onClick={() => handleTabSwitch('ME')}
                  className={`flex-1 py-2 rounded-md font-bold text-sm sm:text-base transition-all ${activeTab === 'ME' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                >
                   {myName}的懲罰
                </button>
            </div>

            <div className="text-center mb-4">
                 <h2 className={`text-xl font-bold ${activeTab === 'ME' ? 'text-blue-700' : 'text-pink-700'}`}>
                    🎡 {currentTargetName}的命運轉盤
                 </h2>
                 <p className="text-xs text-gray-400 mt-1">由 {currentSetterName} 負責出題</p>
            </div>
            
            {/* Wheel Container */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-8">
                {/* Pointer */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20 w-8 h-8">
                    <svg viewBox="0 0 24 24" fill={activeTab === 'ME' ? '#3b82f6' : '#ec4899'} className="filter drop-shadow-md transition-colors duration-300">
                        <path d="M12 21L5 3H19L12 21Z" />
                    </svg>
                </div>
                
                {/* Wheel */}
                <div 
                  className="w-full h-full rounded-full border-8 border-gray-100 shadow-xl overflow-hidden relative"
                  style={{
                      background: getGradient(),
                      transform: `rotate(${rotation}deg)`,
                      transition: isSpinning ? 'transform 4s cubic-bezier(0.2, 0.8, 0.2, 0.99)' : 'none'
                  }}
                >
                    {/* Text Labels - Positioned absolutely based on angle */}
                    {currentItems.map((item, index) => {
                        const angle = (360 / currentItems.length) * index + (360 / currentItems.length) / 2;
                        return (
                            <div 
                              key={item.id}
                              className="absolute top-1/2 left-1/2 w-full text-center origin-left flex items-center"
                              style={{
                                  transform: `translateY(-50%) rotate(${angle - 90}deg)`,
                                  height: '20px'
                              }}
                            >
                                <span className="ml-8 sm:ml-12 text-xs sm:text-sm font-bold text-gray-700 w-24 truncate transform rotate-90 inline-block">
                                    {item.text}
                                </span>
                            </div>
                        );
                    })}
                </div>
                
                {/* Center Hub */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-md z-10 flex items-center justify-center border-4 border-gray-200">
                     <span className="text-gray-300 text-xs">SPIN</span>
                </div>
            </div>

            {/* Controls */}
            <button 
              onClick={spin}
              disabled={isSpinning}
              className={`px-10 py-3 text-white text-xl font-bold rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all mb-6 ${activeTab === 'ME' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-pink-600 hover:bg-pink-700'}`}
            >
                {isSpinning ? '轉動中...' : '開始轉動!'}
            </button>
            
            {/* Result Popup */}
            {selectedItem && (
                <div className={`mb-6 animate-bounce p-4 border-2 rounded-xl text-center shadow-md ${activeTab === 'ME' ? 'bg-blue-50 border-blue-400' : 'bg-pink-50 border-pink-400'}`}>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">懲罰內容</p>
                    <p className="text-2xl font-bold text-gray-800">{selectedItem.text}</p>
                </div>
            )}

            {/* Editor */}
            <div className="w-full bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-700 mb-2 flex items-center">
                    編輯{currentTargetName}的懲罰項目 
                    <span className="ml-2 text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">自定義</span>
                </h3>
                <div className="flex space-x-2 mb-3">
                    <input 
                      type="text" 
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder={`輸入給${currentTargetName}的懲罰...`}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && addItem()}
                    />
                    <button onClick={addItem} className={`px-4 py-2 text-white rounded-lg text-sm font-bold ${activeTab === 'ME' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-pink-500 hover:bg-pink-600'}`}>
                        新增
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {currentItems.map(item => (
                        <div key={item.id} className="flex items-center space-x-1 bg-white px-2 py-1 rounded border shadow-sm text-xs">
                            <span className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></span>
                            <span>{item.text}</span>
                            <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 ml-1">×</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};