export type ModuleId = 'vision' | 'routes' | 'mates' | 'playthrough' | 'detective';
export type Level = 1 | 2 | 3;

export type TaskInput =
  | { type: 'choice'; options: string[]; correct: number }
  /** Tap a set of squares on a blank board (order does not matter). */
  | { type: 'squares'; correct: string[] }
  /** Tap exactly one square on a blank board. */
  | { type: 'square'; correct: string }
  | { type: 'number'; correct: number }
  /** Forced mate puzzle: White to move and mate in `moves`. */
  | { type: 'mate'; fen: string; moves: number }
  /** Rebuild the game that reaches `targetFen` after `plies` half-moves from the start. */
  | { type: 'reconstruct'; plies: number; targetFen: string; clues: { ply: number; fen: string }[]; solution: string[] };

export interface Task {
  id: string;
  module: ModuleId;
  level: Level;
  /** Short heading, e.g. "Square colour". */
  title: string;
  /** The question, in plain language. */
  prompt: string;
  /** Optional piece list or move list that must be held in the head. */
  memo?: string;
  input: TaskInput;
  /** Shown after answering. */
  explanation: string;
}

export interface ModuleInfo {
  id: ModuleId;
  name: string;
  tagline: string;
  /** Which part of the book's training method this module follows. */
  method: string;
  icon: string;
  levelNames: [string, string, string];
}
