import React from 'react';
import { CellValue, PieceTheme } from '../types';

interface CellProps {
  x: number;
  y: number;
  value: CellValue;
  isLastMove: boolean;
  isWinning: boolean;
  isThreat: boolean;
  disabled: boolean;
  gridColor: string;
  pieceTheme: PieceTheme;
  onClick: (x: number, y: number) => void;
}

export const Cell: React.FC<CellProps> = ({
  x,
  y,
  value,
  isLastMove,
  isWinning,
  isThreat,
  disabled,
  gridColor,
  pieceTheme,
  onClick
}) => {
  // Styles for the intersection lines
  const isTop = y === 0;
  const isBottom = y === 14;
  const isLeft = x === 0;
  const isRight = x === 14;
  const isCenter = x === 7 && y === 7;

  // Piece Styles
  const pieceClass = value === 'black' ? pieceTheme.blackClass : pieceTheme.whiteClass;
  const patternPath = value === 'black' ? pieceTheme.blackPattern : pieceTheme.whitePattern;
  const patternColor = value === 'black' ? 'fill-white/30' : 'fill-black/20';

  return (
    <div
      className={`relative w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 flex items-center justify-center cursor-pointer select-none`}
      onClick={() => !disabled && onClick(x, y)}
    >
      {/* Grid Lines */}
      {/* Horizontal Line */}
      <div className={`absolute h-px z-0 ${gridColor} ${isLeft ? 'left-1/2 w-1/2' : isRight ? 'right-1/2 w-1/2' : 'w-full'}`} />
      {/* Vertical Line */}
      <div className={`absolute w-px z-0 ${gridColor} ${isTop ? 'top-1/2 h-1/2' : isBottom ? 'bottom-1/2 h-1/2' : 'h-full'}`} />
      
      {/* Center Dot (Tengen) */}
      {isCenter && !value && (
         <div className={`absolute w-1.5 h-1.5 rounded-full z-0 ${gridColor}`} />
      )}
      
      {/* Guide Dots (Star points) at 3,3; 3,11; 11,3; 11,11 */}
      {((x === 3 && y === 3) || (x === 11 && y === 3) || (x === 3 && y === 11) || (x === 11 && y === 11)) && !value && (
          <div className={`absolute w-1.5 h-1.5 rounded-full z-0 ${gridColor}`} />
      )}

      {/* Piece */}
      {value && (
        <div
          className={`
            relative z-10 w-[80%] h-[80%] rounded-full transition-all duration-300 transform scale-100 flex items-center justify-center overflow-hidden
            ${pieceClass}
            ${isLastMove ? 'scale-105 shadow-lg' : 'shadow-md'}
            ${isLastMove && !isWinning && !isThreat && value === 'black' ? 'ring-2 ring-red-500/80 ring-offset-1' : ''}
            ${isLastMove && !isWinning && !isThreat && value === 'white' ? 'ring-2 ring-red-500/80 ring-offset-1' : ''}
            ${isWinning ? 'animate-pulse ring-4 ring-yellow-400 ring-offset-2' : ''}
            ${isThreat && !isWinning ? 'animate-pulse ring-4 ring-orange-400/80 ring-offset-1' : ''}
          `}
        >
             {/* Pattern (SVG) */}
             {patternPath && (
               <svg viewBox="0 0 24 24" className={`w-[70%] h-[70%] ${patternColor}`}>
                 <path d={patternPath} />
               </svg>
             )}

             {/* Default shine effect */}
             {!patternPath && (
                <div className="absolute top-1 left-1 w-1/3 h-1/3 bg-white opacity-20 rounded-full pointer-events-none"></div>
             )}
        </div>
      )}
      
      {/* Hover effect for human player */}
      {!value && !disabled && (
        <div className="absolute w-4 h-4 rounded-full bg-current opacity-0 hover:opacity-20 transition-opacity z-20 pointer-events-none" style={{color: 'gray'}} />
      )}
    </div>
  );
};