import { BOARD_SIZE, BoardState, Move, Player, GameStatus } from '../types';

export const createEmptyBoard = (): BoardState => {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );
};

const getConsecutiveCells = (
  board: BoardState,
  x: number,
  y: number,
  dx: number,
  dy: number,
  player: Player
): Move[] => {
  const cells: Move[] = [{ x, y, player }];
  
  // Forward
  let i = 1;
  while(true) {
    const nx = x + dx * i;
    const ny = y + dy * i;
    if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[ny][nx] === player) {
      cells.push({ x: nx, y: ny, player });
      i++;
    } else {
      break;
    }
  }

  // Backward
  i = 1;
  while(true) {
    const nx = x - dx * i;
    const ny = y - dy * i;
    if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[ny][nx] === player) {
      cells.push({ x: nx, y: ny, player });
      i++;
    } else {
      break;
    }
  }
  return cells;
};

export const checkWin = (board: BoardState, lastMove: Move): GameStatus => {
  const { x, y, player } = lastMove;
  const directions = [
    [1, 0],   // Horizontal
    [0, 1],   // Vertical
    [1, 1],   // Diagonal \
    [1, -1]   // Diagonal /
  ];

  for (const [dx, dy] of directions) {
    const winningLine = getConsecutiveCells(board, x, y, dx, dy, player);
    if (winningLine.length >= 5) {
      return {
        isGameOver: true,
        winner: player,
        winningLine
      };
    }
  }

  // Check draw
  const isFull = board.every(row => row.every(cell => cell !== null));
  if (isFull) {
    return {
      isGameOver: true,
      winner: null,
      winningLine: null
    };
  }

  return {
    isGameOver: false,
    winner: null,
    winningLine: null
  };
};

export const checkThreat = (board: BoardState, lastMove: Move): Move[] | null => {
  const { x, y, player } = lastMove;
  const directions = [
    [1, 0], [0, 1], [1, 1], [1, -1]
  ];
  
  let threats: Move[] = [];

  for (const [dx, dy] of directions) {
    const line = getConsecutiveCells(board, x, y, dx, dy, player);
    // If length is 3 or 4, it's a threat (Check)
    if (line.length === 3 || line.length === 4) {
        threats = [...threats, ...line];
    }
  }
  
  return threats.length > 0 ? threats : null;
};