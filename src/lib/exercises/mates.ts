import { Chess } from 'chess.js';
import bank from '../../data/mates.json';
import { createRng, pick, type Rng } from '../rng';
import type { Level, Task } from '../types';

interface MateEntry {
  fen: string;
  moves: number;
  level: number;
  key: string;
}

const ENTRIES = bank as MateEntry[];
const ORDER = ['K', 'Q', 'R', 'B', 'N', 'P'];
let counter = 0;

/** "White: Kc3, Rd3. Black: Ka2." from a FEN, the notation used for board-free solving. */
export function pieceList(fen: string): { white: string; black: string } {
  const pieces = new Chess(fen).board().flat().filter(Boolean) as { type: string; color: string; square: string }[];
  const fmt = (color: string) =>
    pieces
      .filter((p) => p.color === color)
      .sort((a, b) => ORDER.indexOf(a.type.toUpperCase()) - ORDER.indexOf(b.type.toUpperCase()) || a.square.localeCompare(b.square))
      .map((p) => `${p.type === 'p' ? '' : p.type.toUpperCase()}${p.square}`)
      .join(', ');
  return { white: fmt('w'), black: fmt('b') };
}

export function mateTask(level: Level, rng: Rng = createRng()): Task {
  const entry = pick(rng, ENTRIES.filter((e) => e.level === level));
  const { white, black } = pieceList(entry.fen);
  return {
    id: `mates-${Date.now()}-${counter++}`,
    module: 'mates',
    level,
    title: entry.moves === 1 ? 'Mate in one' : `Mate in ${entry.moves}`,
    prompt: `Picture the position without a board. White to move and mate in ${entry.moves}. Enter White's ${entry.moves === 1 ? 'move' : 'first move'}.`,
    memo: `White: ${white}. Black: ${black}.`,
    input: { type: 'mate', fen: entry.fen, moves: entry.moves },
    explanation: `The key move is ${entry.key}.`,
  };
}

export const MATE_COUNTS = { 1: 0, 2: 0, 3: 0, ...Object.fromEntries([1, 2, 3].map((l) => [l, ENTRIES.filter((e) => e.level === l).length])) };
