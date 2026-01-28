import React, { useState, useEffect } from 'react';

interface SudokuBoardProps {
  initialBoard: number[][]; // The puzzle with holes (0)
  currentBoard: number[][]; // The current state including user input
  onCellChange: (row: number, col: number, value: number) => void;
  isGameOver: boolean;
}

export const SudokuBoard: React.FC<SudokuBoardProps> = ({
  initialBoard,
  currentBoard,
  onCellChange,
  isGameOver
}) => {
  const [selectedCell, setSelectedCell] = useState<{ r: number, c: number } | null>(null);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || isGameOver) return;
      
      // If original puzzle cell, cannot change
      if (initialBoard[selectedCell.r][selectedCell.c] !== 0) return;

      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        onCellChange(selectedCell.r, selectedCell.c, num);
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        onCellChange(selectedCell.r, selectedCell.c, 0);
      } else if (e.key === 'ArrowUp') {
          setSelectedCell(prev => prev ? { r: Math.max(0, prev.r - 1), c: prev.c } : null);
      } else if (e.key === 'ArrowDown') {
          setSelectedCell(prev => prev ? { r: Math.min(8, prev.r + 1), c: prev.c } : null);
      } else if (e.key === 'ArrowLeft') {
          setSelectedCell(prev => prev ? { r: prev.r, c: Math.max(0, prev.c - 1) } : null);
      } else if (e.key === 'ArrowRight') {
          setSelectedCell(prev => prev ? { r: prev.r, c: Math.min(8, prev.c + 1) } : null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, initialBoard, onCellChange, isGameOver]);

  const getNumpad = () => {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button
            key={n}
            onClick={() => {
                if (selectedCell && initialBoard[selectedCell.r][selectedCell.c] === 0 && !isGameOver) {
                    onCellChange(selectedCell.r, selectedCell.c, n);
                }
            }}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-white border border-gray-300 rounded-lg shadow-sm text-lg font-bold text-gray-700 hover:bg-pink-100 active:bg-pink-200"
          >
            {n}
          </button>
      ));
  };

  return (
    <div className="flex flex-col items-center">
      <div className="bg-gray-800 p-1 rounded-lg shadow-xl">
        <div className="grid grid-rows-9 bg-white border-2 border-gray-800">
          {currentBoard.map((row, r) => (
            <div key={r} className="flex">
              {row.map((val, c) => {
                const isInitial = initialBoard[r][c] !== 0;
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                // Highlight same numbers
                const isSameNumber = selectedCell && currentBoard[selectedCell.r][selectedCell.c] === val && val !== 0;
                
                // Borders for 3x3 grids
                const borderRight = (c + 1) % 3 === 0 && c !== 8 ? 'border-r-2 border-gray-800' : 'border-r border-gray-300';
                const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? 'border-b-2 border-gray-800' : 'border-b border-gray-300';
                
                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => setSelectedCell({ r, c })}
                    className={`
                      w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center text-lg sm:text-xl cursor-pointer select-none transition-colors
                      ${borderRight} ${borderBottom}
                      ${isSelected ? 'bg-pink-200' : isSameNumber ? 'bg-pink-100' : 'bg-white'}
                      ${isInitial ? 'font-bold text-gray-900' : 'font-medium text-blue-600'}
                    `}
                  >
                    {val !== 0 ? val : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Mobile Numpad */}
      <div className="mt-6 grid grid-cols-5 gap-2 sm:gap-4">
         {getNumpad()}
         <button 
           onClick={() => {
             if (selectedCell && initialBoard[selectedCell.r][selectedCell.c] === 0 && !isGameOver) {
                onCellChange(selectedCell.r, selectedCell.c, 0);
             }
           }}
           className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 border border-red-200 rounded-lg shadow-sm text-xs font-bold text-red-500 hover:bg-red-100"
         >
           清除
         </button>
      </div>
    </div>
  );
};