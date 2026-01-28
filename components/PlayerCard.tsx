import React from 'react';
import { Player, ChatMessage } from '../types';

interface PlayerCardProps {
  name: string;
  isAi: boolean;
  isActive: boolean;
  playerColor: Player;
  message?: ChatMessage | null;
  isWinner?: boolean;
  avatarUrl?: string;
  onEdit?: () => void;
  isEditable?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  name,
  isAi,
  isActive,
  playerColor,
  message,
  isWinner,
  avatarUrl,
  onEdit,
  isEditable = false
}) => {
  return (
    <div 
      className={`
        relative flex flex-col items-center p-4 rounded-2xl w-full max-w-[160px] sm:max-w-[200px] transition-all duration-500
        ${isActive ? 'bg-white shadow-lg scale-105 border-2 border-pink-200' : 'bg-white/50 border border-transparent scale-100 opacity-80'}
        ${isWinner ? 'ring-4 ring-yellow-400 bg-yellow-50' : ''}
        ${isEditable ? 'cursor-pointer hover:bg-pink-50' : ''}
      `}
      onClick={isEditable ? onEdit : undefined}
      title={isEditable ? "點擊修改頭像與暱稱" : ""}
    >
      {/* Avatar */}
      <div className="relative group">
        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 bg-gray-100 ${isActive ? 'border-pink-400' : 'border-gray-200'}`}>
           <img 
             src={avatarUrl || (isAi ? "https://picsum.photos/seed/xiaolin/200" : "https://picsum.photos/seed/user/200")} 
             alt={name}
             className="w-full h-full object-cover"
           />
           {isEditable && (
             <div className="absolute inset-0 bg-black/30 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">
               修改
             </div>
           )}
        </div>
        {/* Piece Indicator */}
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-sm ${playerColor === 'black' ? 'bg-gray-900' : 'bg-gray-100'}`} />
      </div>

      {/* Name */}
      <h3 className="mt-2 font-bold text-gray-800 text-lg truncate w-full text-center">{name}</h3>

      {/* Status */}
      {isActive && !isWinner && (
        <span className="text-xs text-pink-500 font-medium animate-pulse mt-1">
          {isAi ? '思考中...' : '你的回合'}
        </span>
      )}
      
      {isWinner && (
        <span className="text-sm text-yellow-600 font-bold mt-1">
          獲勝! 🎉
        </span>
      )}

      {/* Chat Bubble */}
      {message && (
        <div className="absolute top-full mt-4 left-1/2 transform -translate-x-1/2 w-48 sm:w-56 z-20 pointer-events-none">
            <div className={`
              bg-white rounded-2xl rounded-tr-none shadow-md border border-pink-100 text-gray-700 relative animate-bounce-in
              ${message.isSticker ? 'p-1 text-center bg-transparent border-none shadow-none' : 'p-3 text-sm'}
            `}>
                 {message.isSticker ? (
                   <span className="text-6xl filter drop-shadow-md">{message.content}</span>
                 ) : (
                   message.content
                 )}
                 
                 {!message.isSticker && (
                   <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-t border-l border-pink-100 transform rotate-45"></div>
                 )}
            </div>
        </div>
      )}
    </div>
  );
};