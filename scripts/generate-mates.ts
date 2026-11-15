/**
 * Builds src/data/mates.json: an original, computer-generated bank of forced-mate
 * puzzles in sparse positions (ideal for solving from a piece list, without a board).
 *
 *   npx tsx scripts/generate-mates.ts
 */
import { Chess } from 'chess.js';
import { writeFileSync } from 'node:fs';
import { createRng, pick, type Rng } from '../src/lib/rng';
import { hasForcedMate, mateKeys } from '../src/lib/solver';
import { ALL_SQUARES } from '../src/lib/squares';

interface Spec {
  level: 1 | 2 | 3;
  moves: number;
  white: string[][]; // material sets (excluding king)
  black: string[][];
  count: number;
}

const SPECS: Spec[] = [
  { level: 1, moves: 1, white: [['Q'], ['R'], ['R', 'R'], ['Q', 'N'], ['R', 'B']], black: [[]], count: 80 },
  { level: 2, moves: 2, white: [['R'], ['Q'], ['B', 'B'], ['R', 'B'], ['R', 'N'], ['Q', 'B']], black: [[]], count: 80 },
  { level: 3, moves: 2, white: [['R', 'B'], ['Q', 'N'], ['R', 'R'], ['R', 'N'], ['Q', 'R'], ['R', 'P']], black: [['P'], ['P', 'P'], ['N'], ['B']], count: 80 },
];

function randomFen(rng: Rng, white: string[], black: string[]): string | null {
  const board: (string | null)[] = Array(64).fill(null);
  const place = (p: string) => {
    for (let t = 0; t < 50; t++) {
      const sq = pick(rng, ALL_SQUARES);
      const idx = (8 - Number(sq[1])) * 8 + (sq.charCodeAt(0) - 97);
      const rank = Number(sq[1]);
      if (board[idx]) continue;
      if (p.toLowerCase() === 'p' && (rank === 1 || rank === 8)) continue;
      board[idx] = p;
      return true;
    }
    return false;
  };
  if (!place('K') || !place('k')) return null;
  for (const p of white) if (!place(p)) return null;
  for (const p of black) if (!place(p.toLowerCase())) return null;
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const c = board[r * 8 + f];
      if (!c) empty++;
      else {
        if (empty) row += empty;
        empty = 0;
        row += c;
      }
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return `${rows.join('/')} w - - 0 1`;
}

function accept(fen: string, moves: number): boolean {
  let game: Chess;
  try {
    game = new Chess(fen);
  } catch {
    return false;
  }
  // Black must not already be in check (otherwise the position is illegal with White to move).
  const flipped = fen.replace(' w ', ' b ');
  try {
    if (new Chess(flipped).inCheck()) return false;
  } catch {
    return false;
  }
  if (game.isGameOver()) return false;
  if (moves > 1) {
    // Cheap filters first: mates in sparse positions need the defending king near an edge
    // and the attacking king close by.
    const board = game.board().flat().filter(Boolean) as { type: string; color: string; square: string }[];
    const bk = board.find((p) => p.type === 'k' && p.color === 'b')!.square;
    const wk = board.find((p) => p.type === 'k' && p.color === 'w')!.square;
    const edge = (s: string) => Math.min(s.charCodeAt(0) - 97, 104 - s.charCodeAt(0), Number(s[1]) - 1, 8 - Number(s[1]));
    const kdist = Math.max(Math.abs(bk.charCodeAt(0) - wk.charCodeAt(0)), Math.abs(Number(bk[1]) - Number(wk[1])));
    if (edge(bk) > 1 || kdist > 3) return false;
    if (hasForcedMate(game, moves - 1)) return false;
  }
  const keys = mateKeys(fen, moves);
  return keys.length === 1;
}

const rng = createRng(20261115);
const out: { fen: string; moves: number; level: number; key: string }[] = [];
for (const spec of SPECS) {
  let made = 0;
  let tries = 0;
  const seen = new Set<string>();
  while (made < spec.count && tries < 2_000_000) {
    tries++;
    const fen = randomFen(rng, pick(rng, spec.white), pick(rng, spec.black));
    if (!fen || seen.has(fen)) continue;
    seen.add(fen);
    if (!accept(fen, spec.moves)) continue;
    out.push({ fen, moves: spec.moves, level: spec.level, key: mateKeys(fen, spec.moves)[0].san });
    made++;
    if (made % 20 === 0) console.log(`level ${spec.level}: ${made}/${spec.count} (${tries} tries)`);
  }
}
writeFileSync(new URL('../src/data/mates.json', import.meta.url), JSON.stringify(out));
console.log(`wrote ${out.length} puzzles`);
