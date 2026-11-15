import { Chess } from 'chess.js';
import { createRng, pick, type Rng } from '../rng';
import type { Level, Task } from '../types';

/**
 * Well-known opening traps and miniatures (standard chess knowledge, not taken from the book).
 * Each case is a short "crime" to reconstruct from clue diagrams.
 */
export interface Case {
  name: string;
  level: Level;
  moves: string;
  story: string;
}

export const CASES: Case[] = [
  { name: "The Fool's Errand", level: 1, moves: 'f3 e5 g4 Qh4#', story: 'White weakened the king in record time.' },
  { name: 'The Reversed Errand', level: 1, moves: 'e4 g5 d4 f6 Qh5#', story: 'Black made the same mistake with colours reversed.' },
  { name: 'The Hasty Queen', level: 1, moves: 'e4 e5 Bc4 Nc6 Qh5 Nf6 Qxf7#', story: 'Queen and bishop met on the weakest square.' },
  { name: 'The Smothered Knight', level: 2, moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2 Ngf6 Nd6#', story: "A knight finished a king boxed in by its own pieces." },
  { name: 'The Greedy Pawn', level: 2, moves: 'e4 e5 Nf3 Nf6 Nxe5 Nxe4 Qe2 Nf6 Nc6+', story: 'Copying the opponent cost Black the queen.' },
  { name: 'The Undefended Diagonal', level: 2, moves: 'e4 e5 Nf3 f6 Nxe5 fxe5 Qh5+ Ke7 Qxe5+ Kf7 Bc4+', story: 'A weak pawn move let the white pieces flood in.' },
  { name: 'The Pinned Bishop', level: 2, moves: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#', story: 'White gave up the queen and mated with minor pieces.' },
  { name: 'The Gambit Gone Wrong', level: 3, moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Bc3 Bb4 Qd2 Bxc3 Qxc3 Qc1#', story: 'White grabbed material and walked into a back-rank mate.' },
  { name: 'The Knight on d3', level: 3, moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5 axb4 Nd3#', story: 'Taking a free bishop allowed a smothered mate.' },
  { name: 'The Lost Queen', level: 3, moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5 Nxd5 Nxd5 Bxd8 Bb4+ Qd2 Bxd2+ Kxd2 Kxd8', story: 'Winning a pawn looked safe, but a pin turned the tables.' },
];

let counter = 0;

/** Validate a case line and return the SAN history. Throws for an illegal line. */
export function caseHistory(c: Case): string[] {
  const g = new Chess();
  for (const san of c.moves.split(' ')) g.move(san);
  return g.history();
}

function fenAfter(history: string[], plies: number): string {
  const g = new Chess();
  history.slice(0, plies).forEach((m) => g.move(m));
  return g.fen();
}

/** Placement-only comparison so any move order that reaches the same position counts. */
export function samePlacement(a: string, b: string): boolean {
  return a.split(' ')[0] === b.split(' ')[0];
}

export function detectiveTask(level: Level, rng: Rng = createRng(), exclude: string[] = []): Task {
  const pool = CASES.filter((c) => c.level === level && !exclude.includes(c.name));
  const c = pick(rng, pool.length ? pool : CASES.filter((x) => x.level === level));
  const history = caseHistory(c);
  const plies = history.length;
  const clues = level === 1 ? [] : [{ ply: Math.ceil(plies / 2), fen: fenAfter(history, Math.ceil(plies / 2)) }];
  const fullMoves = Math.ceil(plies / 2);
  return {
    id: `detective-${Date.now()}-${counter++}`,
    module: 'detective',
    level,
    title: c.name,
    prompt: `${c.story} Reconstruct the game: play the moves for both sides from the starting position until you reach the final diagram. ${plies} half-moves (${fullMoves} moves) were played.`,
    input: { type: 'reconstruct', plies, targetFen: fenAfter(history, plies), clues, solution: history },
    explanation: `The game went ${history.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}.${m}` : m)).join(' ')}.`,
  };
}
