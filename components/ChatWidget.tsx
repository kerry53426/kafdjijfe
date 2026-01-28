import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatWidgetProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onToggle: () => void;
  onSendMessage: (content: string, isSticker: boolean) => void;
  unreadCount: number;
}

const STICKERS = ["😎", "😭", "😡", "❤️", "😱", "🤔", "👻", "💩", "🎉", "🏳️", "👍", "👀", "💤", "🔥", "✨"];
const QUICK_PHRASES = [
  "快點啦～都睡著了😴",
  "你的棋藝精進了耶！😲",
  "這步棋...有詐！🤔",
  "承讓承讓 🙏",
  "再來一局？ 🔥"
];

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

const StickerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 14.25a3.75 3.75 0 01-3.355-2.074.75.75 0 011.233-.866A2.25 2.25 0 0012 15a2.25 2.25 0 002.122-1.44.75.75 0 011.233.866A3.75 3.75 0 0112 16.5zm-3-5.25a.75.75 0 100-1.5.75.75 0 000 1.5zm6 0a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
  </svg>
);

const ChatBubbleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
  </svg>
);

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  messages,
  isOpen,
  onToggle,
  onSendMessage,
  unreadCount
}) => {
  const [inputValue, setInputValue] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim(), false);
      setInputValue("");
      setShowStickers(false);
    }
  };

  const handleStickerClick = (sticker: string) => {
    onSendMessage(sticker, true);
    setShowStickers(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 bg-pink-500 hover:bg-pink-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 z-50"
      >
        <ChatBubbleIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-80 h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-pink-100 overflow-hidden animate-bounce-in">
      {/* Header */}
      <div 
        className="px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-400 text-white flex justify-between items-center cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-2">
           <ChatBubbleIcon />
           <span className="font-bold">聊天室</span>
        </div>
        <button className="hover:bg-white/20 rounded-full p-1">
          <CloseIcon />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-10">
            開始聊天吧！<br/>試著傳送一個貼圖 👋
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[80%] rounded-2xl px-4 py-2 shadow-sm relative
                  ${msg.sender === 'me' 
                    ? 'bg-pink-500 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                  }
                  ${msg.isSticker ? 'bg-transparent border-none shadow-none p-0 !bg-none' : ''}
                `}
              >
                {msg.isSticker ? (
                  <div className="text-5xl drop-shadow-sm transform hover:scale-110 transition-transform">
                    {msg.content}
                  </div>
                ) : (
                  msg.content
                )}
                
                <div className={`text-[10px] mt-1 opacity-70 ${msg.sender === 'me' ? 'text-right' : 'text-left'}`}>
                   {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-100 relative">
        {/* Quick Phrases (Horizontal Scroll) */}
        {!showStickers && (
             <div className="flex space-x-2 overflow-x-auto pb-2 mb-1 scrollbar-hide">
                 {QUICK_PHRASES.map((phrase, i) => (
                     <button
                       key={i}
                       onClick={() => onSendMessage(phrase, false)}
                       className="whitespace-nowrap px-3 py-1 bg-pink-50 text-pink-600 text-xs rounded-full hover:bg-pink-100 flex-shrink-0"
                     >
                       {phrase}
                     </button>
                 ))}
             </div>
        )}

        {/* Stickers Panel */}
        {showStickers && (
          <div className="absolute bottom-full left-0 right-0 bg-white/95 backdrop-blur-sm p-3 border-t border-gray-100 grid grid-cols-5 gap-2 shadow-inner h-48 overflow-y-auto">
             {STICKERS.map(s => (
               <button 
                 key={s} 
                 onClick={() => handleStickerClick(s)}
                 className="text-3xl hover:bg-gray-100 p-2 rounded-lg transition-transform hover:scale-110"
               >
                 {s}
               </button>
             ))}
          </div>
        )}

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowStickers(!showStickers)}
            className={`p-2 rounded-full transition-colors ${showStickers ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <StickerIcon />
          </button>
          
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="說點什麼..."
            className="flex-1 bg-gray-100 text-gray-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
          
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-50 disabled:hover:bg-pink-500 transition-colors"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};