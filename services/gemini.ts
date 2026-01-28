import { GoogleGenAI, Type } from "@google/genai";
import { BoardState, AiResponse, Player, BOARD_SIZE, LiarAiResponse } from '../types';

// Lazily init AI to prevent crash on module load if something is wrong
const getAI = () => {
    const apiKey = process.env.API_KEY || "";
    if (!apiKey) {
        console.warn("API Key is missing for GoogleGenAI");
    }
    return new GoogleGenAI({ apiKey });
};

const getOccupiedCells = (board: BoardState) => {
  const cells = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x]) {
        cells.push({ x, y, p: board[y][x] });
      }
    }
  }
  return cells;
};

export const getXiaoLinMove = async (
  board: BoardState,
  currentPlayer: Player
): Promise<AiResponse> => {
  try {
    const ai = getAI(); // Init here
    
    const occupied = getOccupiedCells(board);
    
    // Fallback for empty board (first move) to save time/tokens if AI is black
    if (occupied.length === 0) {
       return {
         x: 7,
         y: 7,
         message: "那就由我先開始囉！下在正中間吧～"
       };
    }

    const prompt = `
      You are playing Gomoku (Five-in-a-Row) on a 15x15 board.
      You are a character named "Xiao Lin" (曉琳).
      Your personality: Playful, slightly flirty, "ambiguous relationship" (曖昧) with the opponent. You use emojis and soft tone in Traditional Chinese (Taiwan).
      
      Current board state (occupied cells): ${JSON.stringify(occupied)}
      Your color: ${currentPlayer}
      Board size: 15x15 (indices 0-14).
      
      Task:
      1. Analyze the board to find the best move to win or block the opponent.
      2. Return the x (column) and y (row) coordinates.
      3. Provide a short, engaging message (max 20 words) reacting to the game or teasing the player.
      
      Valid moves must be empty cells.
      If you are about to win, be excited. If you are blocking, be cheeky.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.INTEGER, description: "The x coordinate (0-14)" },
            y: { type: Type.INTEGER, description: "The y coordinate (0-14)" },
            message: { type: Type.STRING, description: "A playful message from Xiao Lin in Traditional Chinese" }
          },
          required: ["x", "y", "message"]
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text) as AiResponse;
      
      // Basic validation to ensure move is valid (AI hallucinations check)
      if (result.x >= 0 && result.x < BOARD_SIZE && result.y >= 0 && result.y < BOARD_SIZE && !board[result.y][result.x]) {
        return result;
      } else {
        // Fallback: simple random search around center if AI returns invalid move
        console.warn("AI returned invalid move, using fallback.");
        return findRandomMove(board);
      }
    }
    throw new Error("No response from AI");

  } catch (error) {
    console.error("Error getting AI move:", error);
    return findRandomMove(board);
  }
};

const findRandomMove = (board: BoardState): AiResponse => {
    // Simple fallback: find first empty spot near center or random
    const center = Math.floor(BOARD_SIZE / 2);
    // Spiral search from center
    for (let d = 1; d < BOARD_SIZE; d++) {
        for (let i = -d; i <= d; i++) {
             for (let j = -d; j <= d; j++) {
                 const nx = center + i;
                 const ny = center + j;
                 if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && !board[ny][nx]) {
                     return {
                         x: nx,
                         y: ny,
                         message: "哎呀，我想了一下... 就下這裡吧！"
                     };
                 }
             }
        }
    }
    return { x: 0, y: 0, message: "都滿了嗎？那我隨便下囉！" };
};

// --- Liar's Dice Logic ---

export const getXiaoLinLiarMove = async (
    aiDice: number[],
    totalDiceCount: number,
    currentBid: { quantity: number; face: number } | null,
    history: string[],
    persona: string = "Xiao Lin"
): Promise<LiarAiResponse> => {
    try {
        const ai = getAI(); // Init here
        
        let personalityDesc = "";
        if (persona === "Xiao Lin") {
            personalityDesc = "Role: Xiao Lin (Playful, flirty, smart). Speaks in Traditional Chinese (Taiwan), cute tone.";
        } else if (persona === "Aggressive") {
            personalityDesc = "Role: Brother Hao (Aggressive, loud, likes to bluff big numbers). Speaks in Traditional Chinese, rough slang.";
        } else if (persona === "Cautious") {
            personalityDesc = "Role: Xiao Mei (Timid, cautious, mathematical, prefers logical bets). Speaks in Traditional Chinese, polite.";
        } else {
             personalityDesc = "Role: A generic smart player.";
        }

        const prompt = `
          You are playing Liar's Dice (Perudo).
          ${personalityDesc}
          
          Game State:
          - Your Hand: ${JSON.stringify(aiDice)}
          - Total Dice in Game (all players): ${totalDiceCount}
          - Current Bid on Table: ${currentBid ? `${currentBid.quantity} of face ${currentBid.face}` : "None (You start)"}
          - '1' is wild (counts as any face).
          - Recent history: ${JSON.stringify(history.slice(-3))}

          Task:
          Decide whether to BID (raise) or CALL (challenge the current bid).
          
          Rules:
          - If Current Bid is None, you MUST BID.
          - To BID, you must increase quantity OR increase face value at same quantity.
          - If you think the current bid is improbable based on your hand and total dice, CALL.
          
          Output JSON:
          {
             "action": "BID" or "CALL",
             "quantity": number (required if BID),
             "face": number (required if BID, 1-6),
             "message": "Short in-character reasoning or taunt"
          }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        action: { type: Type.STRING, enum: ["BID", "CALL"] },
                        quantity: { type: Type.INTEGER },
                        face: { type: Type.INTEGER },
                        message: { type: Type.STRING }
                    },
                    required: ["action", "message"]
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as LiarAiResponse;
        }
        throw new Error("No AI response");
    } catch (e) {
        console.error(e);
        // Fallback Logic
        if (!currentBid) {
            return { action: 'BID', quantity: 1, face: 2, message: "那我先叫囉！一個 2！" };
        }
        // Simple heuristic fallback
        if (Math.random() > 0.7) {
            return { action: 'CALL', message: "這太扯了吧，我抓！" };
        }
        return { 
            action: 'BID', 
            quantity: currentBid.quantity, 
            face: currentBid.face === 6 ? 1 : currentBid.face + 1, // Buggy fallback but OK for error handling
            message: "哼，那我再加一點！" 
        };
    }
};

// --- Archery Logic ---

export const getXiaoLinArcheryReaction = async (
  score: number,
  isWinning: boolean
): Promise<string> => {
  try {
    const ai = getAI(); // Init here

    const prompt = `
      You are playing an Archery game. You are Xiao Lin (playful, cute, speaks Traditional Chinese).
      You just shot an arrow and scored ${score} points (out of 10).
      ${isWinning ? "You are currently winning or beat the player's last shot." : "You are losing or did worse than the player."}
      
      Give a very short reaction (max 1 sentence) to your shot.
      If score is 10: Excited, proud.
      If score is 0-3: Embarrassed, make excuse.
      If score is 4-9: Normal comment.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "text/plain",
      }
    });

    return response.text?.trim() || (score > 7 ? "嘿嘿，不錯吧！" : "哎呀，手滑了...");
  } catch (error) {
    console.error("Error getting AI reaction:", error);
    return score > 5 ? "運氣不錯！" : "下次會更好！";
  }
};
