import React from 'react';

export type Player = 'black' | 'white';
export type CellValue = Player | null;
export type BoardState = CellValue[][];

export enum GameMode {
  PVP = 'PVP', // Local 2 players
  PVE = 'PVE', // Player vs AI (Xiao Lin)
  ONLINE = 'ONLINE' // Remote P2P
}

export enum GameType {
  GOMOKU = 'GOMOKU',
  LIARS_DICE = 'LIARS_DICE',
  ROULETTE = 'ROULETTE',
  ARCHERY = 'ARCHERY'
}

export interface Move {
  x: number;
  y: number;
  player: Player;
}

export interface GameStatus {
  isGameOver: boolean;
  winner: Player | null;
  winningLine: Move[] | null; // Coordinates of the winning 5 cells
}

export interface AiResponse {
  x: number;
  y: number;
  message: string;
}

export interface UserProfile {
  name: string;
  avatarUrl: string; // Base64 or URL
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'opponent';
  content: string;
  isSticker: boolean;
  timestamp: number;
}

export interface BoardTheme {
  id: string;
  name: string;
  boardBg: string;      // Tailwind class for board background
  borderColor: string;  // Tailwind class for board border
  gridColor: string;    // Tailwind class for grid lines and dots
  coordinateColor: string; // Color for text/ui around board
}

export interface PieceTheme {
  id: string;
  name: string;
  blackClass: string;   // CSS classes for black piece container
  whiteClass: string;   // CSS classes for white piece container
  blackPattern?: string; // Optional SVG path data for black piece
  whitePattern?: string; // Optional SVG path data for white piece
}

export const BOARD_SIZE = 15;

// --- Liar's Dice Types (Multiplayer) ---
export interface DicePlayer {
  id: string;
  name: string;
  isAi: boolean;
  persona?: string; // For AI logic (e.g., 'Xiao Lin', 'Aggressive', 'Cautious')
  dice: number[];
  diceCount: number;
  avatar?: string;
  isRemote?: boolean; // True if this is the online opponent
}

export interface DiceState {
  players: DicePlayer[];
  currentPlayerIndex: number; // Index in players array
  currentBid: { quantity: number; face: number; playerId: string } | null;
  history: string[];
  roundWinner: string | null; // Player ID
  gameWinner: string | null; // Player ID
  isThinking: boolean;
}

export interface LiarAiResponse {
  action: 'BID' | 'CALL';
  quantity?: number;
  face?: number;
  message: string;
}

// Actions sent via PeerJS for Liar's Dice
export type LiarActionType = 'BID' | 'CALL' | 'REVEAL' | 'NEW_ROUND' | 'SYNC_STATE';

export interface LiarAction {
    type: LiarActionType;
    payload?: {
        quantity?: number;
        face?: number;
        dice?: number[]; // For REVEAL
        diceCount?: number; // For keeping track
    };
}

// --- Roulette Types ---
export interface RouletteItem {
  id: string;
  text: string;
  color: string;
}

// --- Archery Types ---
export interface ArcheryState {
  myScore: number;
  opponentScore: number;
  round: number;
  maxRounds: number;
  isMyTurn: boolean;
  myShots: number[];
  opponentShots: number[];
  winner: 'me' | 'opponent' | 'draw' | null;
}

export interface ArcheryTargetTheme {
  id: string;
  name: string;
  bgColor: string;
  svgContent: React.ReactNode;
}