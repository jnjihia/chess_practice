import { createRng, int, pick, sample, type Rng } from '../rng';
import { ALL_SQUARES, distance, minMovesToCaptureAll, squareColor, type PieceKind } from '../squares';
import type { Level, Task } from '../types';

let counter = 0;
const id = () => `routes-${Date.now()}-${counter++}`;
const NAMES: Record<PieceKind, string> = { N: 'knight', K: 'king', B: 'bishop', R: 'rook', Q: 'queen' };

function travelTask(rng: Rng, level: Level): Task {
  const kind: PieceKind = pick(rng, ['N', 'N', 'K'] as PieceKind[]);
  let from: string, to: string, d: number;
  do {
    [from, to] = sample(rng, ALL_SQUARES, 2);
    d = distance(kind, from, to);
  } while (d < 2 || d > 5);
  return {
    id: id(),
    module: 'routes',
    level,
    title: 'Shortest route',
    prompt: `What is the fewest number of moves a ${NAMES[kind]} needs to go from ${from} to ${to}?`,
    input: { type: 'number', correct: d },
    explanation: `A ${NAMES[kind]} needs ${d} moves to get from ${from} to ${to}.`,
  };
}

function captureTask(rng: Rng, level: Level): Task {
  const kind: PieceKind = level === 2 ? pick(rng, ['R', 'B', 'N'] as PieceKind[]) : pick(rng, ['N', 'B', 'Q'] as PieceKind[]);
  const count = level === 2 ? int(rng, 2, 3) : int(rng, 3, 4);
  for (;;) {
    const [from, ...targets] = sample(rng, ALL_SQUARES, count + 1);
    if (kind === 'B' && targets.some((t) => squareColor(t) !== squareColor(from))) continue;
    const d = minMovesToCaptureAll(kind, from, targets);
    if (!Number.isFinite(d) || d < count + (level === 3 ? 1 : 0) || d > 9) continue;
    return {
      id: id(),
      module: 'routes',
      level,
      title: 'Pawn hunt',
      prompt: `A ${NAMES[kind]} on ${from} must capture black pawns on ${targets.join(', ')} (in any order). The pawns do not move. What is the fewest number of moves?`,
      memo: `${NAMES[kind][0].toUpperCase() + NAMES[kind].slice(1)} ${from} · pawns ${targets.join(' ')}`,
      input: { type: 'number', correct: d },
      explanation: `The best route takes ${d} moves. Uncaptured pawns block sliding pieces, so the order you take them in matters.`,
    };
  }
}

/** Route-finding drills that train calculating piece paths without a board. */
export function routesTask(level: Level, rng: Rng = createRng()): Task {
  if (level === 1) return travelTask(rng, level);
  return captureTask(rng, level);
}
