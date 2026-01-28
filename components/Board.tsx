import React from 'react';
import { BoardState, Move, BoardTheme, PieceTheme } from '../types';
import { Cell } from './Cell';

interface BoardProps {
  board: BoardState;
  lastMove: Move | null;
  winningLine: Move[] | null;
  threatLine: Move[] | null;
  disabled: boolean;
  theme: BoardTheme;
  pieceTheme: PieceTheme;
  onCellClick: (x: number, y: number) => void;
}

export const Board: React.FC<BoardProps> = ({
  board,
  lastMove,
  winningLine,
  threatLine,
  disabled,
  theme,
  pieceTheme,
  onCellClick
}) => {
  const isWinningCell = (x: number, y: number) => {
    return winningLine?.some(m => m.x === x && m.y === y) ?? false;
  };

  const isThreatCell = (x: number, y: number) => {
    return threatLine?.some(m => m.x === x && m.y === y) ?? false;
  };

  const isLastMoveCell = (x: number, y: number) => {
    return lastMove?.x === x && lastMove?.y === y;
  };

  return (
    <div className={`p-2 sm:p-4 rounded-lg shadow-xl border-4 transition-colors duration-500 ${theme.boardBg} ${theme.borderColor}`}>
      <div className={`grid grid-cols-[repeat(15,minmax(0,1fr))] transition-colors duration-500 ${theme.boardBg}`}>
        {board.map((row, y) => (
          row.map((cellValue, x) => (
            <Cell
              key={`${x}-${y}`}
              x={x}
              y={y}
              value={cellValue}
              isLastMove={isLastMoveCell(x, y)}
              isWinning={isWinningCell(x, y)}
              isThreat={isThreatCell(x, y)}
              disabled={disabled || cellValue !== null}
              gridColor={theme.gridColor}
              pieceTheme={pieceTheme}
              onClick={onCellClick}
            />
          ))
        ))}
      </div>
    </div>
  );
};