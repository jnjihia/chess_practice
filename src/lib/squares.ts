/** Pure board-geometry helpers. Squares are algebraic strings ("a1".."h8"). */

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export type Square = string;
export type SquareColor = 'light' | 'dark';
export type PieceKind = 'K' | 'Q' | 'R' | 'B' | 'N';

export const ALL_SQUARES: Square[] = RANKS.flatMap((r) => FILES.map((f) => `${f}${r}`));

export function toXY(sq: Square): [number, number] {
  return [sq.charCodeAt(0) - 97, Number(sq[1]) - 1];
}

export function fromXY(x: number, y: number): Square | null {
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  return `${FILES[x]}${y + 1}`;
}

export function isSquare(s: string): boolean {
  return /^[a-h][1-8]$/.test(s);
}

/** a1 is dark; a square is dark when file index + rank index is even. */
export function squareColor(sq: Square): SquareColor {
  const [x, y] = toXY(sq);
  return (x + y) % 2 === 0 ? 'dark' : 'light';
}

/** Squares strictly on the straight diagonal from `a` to `b`, inclusive. Null if not a diagonal. */
export function diagonalBetween(a: Square, b: Square): Square[] | null {
  const [x1, y1] = toXY(a);
  const [x2, y2] = toXY(b);
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 || Math.abs(dx) !== Math.abs(dy)) return null;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const out: Square[] = [];
  for (let i = 0; i <= Math.abs(dx); i++) out.push(fromXY(x1 + i * sx, y1 + i * sy)!);
  return out;
}

/** Every full edge-to-edge diagonal with at least `minLen` squares, as [start, end]. */
export function edgeDiagonals(minLen = 3): [Square, Square][] {
  const result: [Square, Square][] = [];
  const seen = new Set<string>();
  for (const sq of ALL_SQUARES) {
    for (const [sx, sy] of [
      [1, 1],
      [1, -1],
    ]) {
      let [x, y] = toXY(sq);
      while (fromXY(x - sx, y - sy)) {
        x -= sx;
        y -= sy;
      }
      const start = fromXY(x, y)!;
      let len = 0;
      let ex = x;
      let ey = y;
      while (fromXY(ex + sx, ey + sy)) {
        ex += sx;
        ey += sy;
        len++;
      }
      const end = fromXY(ex, ey)!;
      const key = [start, end].sort().join('-');
      if (len + 1 >= minLen && !seen.has(key)) {
        seen.add(key);
        result.push([start, end]);
      }
    }
  }
  return result;
}

const KNIGHT = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const ROOK_DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
];
const BISHOP_DIRS = [
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Squares a lone piece of `kind` on `from` can reach in one move, given a set of
 * occupied squares it may land on (capture) but not pass through.
 */
export function pieceMoves(kind: PieceKind, from: Square, occupied: Set<Square> = new Set()): Square[] {
  const [x, y] = toXY(from);
  const out: Square[] = [];
  const steps = (deltas: number[][]) => {
    for (const [dx, dy] of deltas) {
      const s = fromXY(x + dx, y + dy);
      if (s) out.push(s);
    }
  };
  const slides = (dirs: number[][]) => {
    for (const [dx, dy] of dirs) {
      let i = 1;
      for (;;) {
        const s = fromXY(x + dx * i, y + dy * i);
        if (!s) break;
        out.push(s);
        if (occupied.has(s)) break;
        i++;
      }
    }
  };
  switch (kind) {
    case 'N':
      steps(KNIGHT);
      break;
    case 'K':
      steps(KING);
      break;
    case 'R':
      slides(ROOK_DIRS);
      break;
    case 'B':
      slides(BISHOP_DIRS);
      break;
    case 'Q':
      slides([...ROOK_DIRS, ...BISHOP_DIRS]);
      break;
  }
  return out;
}

/** Minimum moves for a lone piece to travel between two squares on an empty board (Infinity if unreachable). */
export function distance(kind: PieceKind, from: Square, to: Square): number {
  if (from === to) return 0;
  const seen = new Map<Square, number>([[from, 0]]);
  const queue: Square[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of pieceMoves(kind, cur)) {
      if (seen.has(n)) continue;
      const d = seen.get(cur)! + 1;
      if (n === to) return d;
      seen.set(n, d);
      queue.push(n);
    }
  }
  return Infinity;
}

/**
 * Minimum number of moves for a lone piece to capture every target, in any order.
 * Uncaptured targets block sliding pieces; landing on a target captures it.
 * Returns Infinity when impossible (e.g. a bishop and an opposite-colour target).
 */
export function minMovesToCaptureAll(kind: PieceKind, from: Square, targets: Square[]): number {
  const n = targets.length;
  const full = (1 << n) - 1;
  const key = (sq: Square, mask: number) => `${sq}|${mask}`;
  const seen = new Set<string>([key(from, 0)]);
  let frontier: [Square, number][] = [[from, 0]];
  let depth = 0;
  while (frontier.length) {
    depth++;
    const next: [Square, number][] = [];
    for (const [sq, mask] of frontier) {
      const occupied = new Set(targets.filter((_, i) => !(mask & (1 << i))));
      for (const to of pieceMoves(kind, sq, occupied)) {
        const idx = targets.indexOf(to);
        const m = idx >= 0 && !(mask & (1 << idx)) ? mask | (1 << idx) : mask;
        if (m === full) return depth;
        const k = key(to, m);
        if (!seen.has(k)) {
          seen.add(k);
          next.push([to, m]);
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}
