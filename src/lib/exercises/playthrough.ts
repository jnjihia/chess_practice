import { Chess, type Move, type Square as ChessSquare } from 'chess.js';
import { createRng, pick, shuffle, type Rng } from '../rng';
import type { Level, Task } from '../types';

let counter = 0;
const id = () => `play-${Date.now()}-${counter++}`;

const PIECE_NAMES: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Generate a plausible-looking opening sequence: early on it prefers central pawn moves and
 * development, later it prefers captures. Purely heuristic so lines stay readable.
 */
export function plausibleGame(rng: Rng, plies: number): Chess {
  const game = new Chess();
  for (let i = 0; i < plies; i++) {
    const moves = game.moves({ verbose: true });
    if (!moves.length) break;
    const scored = moves.map((m) => ({ m, s: scoreMove(m, i) + rng() * 3 }));
    scored.sort((a, b) => b.s - a.s);
    const top = scored.slice(0, Math.min(4, scored.length));
    game.move(pick(rng, top).m);
    if (game.isGameOver()) break;
  }
  return game;
}

function scoreMove(m: Move, ply: number): number {
  let s = 0;
  if (m.captured) s += VALUE[m.captured] * 1.5 - VALUE[m.piece] * 0.3;
  if (m.san.includes('+')) s += 0.8;
  const centre = ['d4', 'e4', 'd5', 'e5', 'c4', 'c5', 'f4', 'f5', 'c3', 'f3', 'c6', 'f6'];
  if (ply < 8 && centre.includes(m.to)) s += 1.5;
  if (ply < 10 && (m.piece === 'n' || m.piece === 'b') && (m.from[1] === '1' || m.from[1] === '8')) s += 1.2;
  if (m.piece === 'k' && !m.san.startsWith('O-')) s -= 2;
  if (m.piece === 'q' && ply < 6) s -= 1;
  if (m.san.startsWith('O-')) s += 1.5;
  return s;
}

/** "1.e4 e5 2.Nf3 Nc6" style move list. */
export function moveList(history: string[]): string {
  return history
    .map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}.${san}` : san))
    .join(' ');
}

const PLIES: Record<Level, [number, number]> = { 1: [4, 6], 2: [8, 10], 3: [12, 16] };

/** Read a move list, play it out mentally, then answer a question about the final position. */
export function playthroughTask(level: Level, rng: Rng = createRng()): Task {
  const [lo, hi] = PLIES[level];
  const plies = lo + Math.floor(rng() * (hi - lo + 1));
  const game = plausibleGame(rng, plies);
  const history = game.history();
  const list = moveList(history);
  const board = game.board().flat().filter(Boolean) as { square: ChessSquare; type: string; color: string }[];
  const questionKinds = level === 1 ? ['whereIs', 'whatOn'] : ['whereIs', 'whatOn', 'attackers', 'check'];
  const kind = pick(rng, questionKinds);
  const base = {
    id: id(),
    module: 'playthrough' as const,
    level,
    title: 'Play it in your head',
    memo: list,
  };

  if (kind === 'whereIs') {
    // Choose a piece that moved, so the question needs the whole line.
    const moved = new Set(game.history({ verbose: true }).map((m) => m.to));
    const candidates = board.filter((p) => moved.has(p.square) && p.type !== 'p');
    const target = candidates.length ? pick(rng, candidates) : pick(rng, board);
    const same = board.filter((p) => p.type === target.type && p.color === target.color);
    const colour = target.color === 'w' ? 'White' : 'Black';
    const name = PIECE_NAMES[target.type];
    return {
      ...base,
      prompt:
        same.length > 1
          ? `Play through the moves without a board. Tap every square with a ${colour.toLowerCase()} ${name}.`
          : `Play through the moves without a board. Where is the ${colour.toLowerCase()} ${name} now?`,
      input: same.length > 1 ? { type: 'squares', correct: same.map((p) => p.square) } : { type: 'square', correct: target.square },
      explanation: `${colour}'s ${name}${same.length > 1 ? 's are' : ' is'} on ${same.map((p) => p.square).join(', ')}.`,
    };
  }

  if (kind === 'whatOn') {
    const touched = [...new Set(game.history({ verbose: true }).flatMap((m) => [m.to, m.from]))];
    const sq = pick(rng, touched) as ChessSquare;
    const piece = game.get(sq);
    const label = piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[piece.type]}` : 'Empty';
    const pool = ['Empty', 'White pawn', 'Black pawn', 'White knight', 'Black knight', 'White bishop', 'Black bishop', 'White queen', 'Black queen'];
    const options = shuffle(rng, [label, ...shuffle(rng, pool.filter((o) => o !== label)).slice(0, 3)]);
    return {
      ...base,
      prompt: `Play through the moves without a board. What stands on ${sq} now?`,
      input: { type: 'choice', options, correct: options.indexOf(label) },
      explanation: `${sq}: ${label.toLowerCase()}.`,
    };
  }

  if (kind === 'check') {
    const yes = game.inCheck();
    const side = game.turn() === 'w' ? 'White' : 'Black';
    return {
      ...base,
      prompt: `Play through the moves without a board. Is ${side}'s king in check in the final position?`,
      input: { type: 'choice', options: ['Yes', 'No'], correct: yes ? 0 : 1 },
      explanation: yes ? `Yes, the last move ${history[history.length - 1]} gives check.` : `No, ${side}'s king is not in check.`,
    };
  }

  // attackers: how many legal captures does the side to move have?
  const captures = game.moves({ verbose: true }).filter((m) => m.captured);
  const side = game.turn() === 'w' ? 'White' : 'Black';
  return {
    ...base,
    prompt: `Play through the moves without a board. It is ${side}'s move. How many different legal captures does ${side} have?`,
    input: { type: 'number', correct: captures.length },
    explanation: captures.length
      ? `${captures.length}: ${captures.map((m) => m.san).join(', ')}.`
      : `None: ${side} has no captures available.`,
  };
}
