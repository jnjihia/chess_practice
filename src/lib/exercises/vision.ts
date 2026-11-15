import { createRng, int, pick, sample, type Rng } from '../rng';
import {
  ALL_SQUARES,
  diagonalBetween,
  edgeDiagonals,
  pieceMoves,
  squareColor,
  type PieceKind,
} from '../squares';
import type { Level, Task } from '../types';

let counter = 0;
const id = () => `vision-${Date.now()}-${counter++}`;

function squareColorTask(rng: Rng, level: Level): Task {
  const sq = pick(rng, ALL_SQUARES);
  const color = squareColor(sq);
  return {
    id: id(),
    module: 'vision',
    level,
    title: 'Square colour',
    prompt: `Without looking at a board: what colour is ${sq}?`,
    input: { type: 'choice', options: ['Light', 'Dark'], correct: color === 'light' ? 0 : 1 },
    explanation: `${sq} is ${color}. Tip: a1 is dark, and a square is dark when its file number (a=1) and rank have the same parity.`,
  };
}

function diagonalColorTask(rng: Rng, level: Level): Task {
  const [a, b] = pick(rng, edgeDiagonals(3));
  const color = squareColor(a);
  return {
    id: id(),
    module: 'vision',
    level,
    title: 'Diagonal colour',
    prompt: `What colour are the squares on the diagonal ${a}–${b}?`,
    input: { type: 'choice', options: ['Light', 'Dark'], correct: color === 'light' ? 0 : 1 },
    explanation: `Every square on a diagonal shares one colour. ${a} is ${color}, so the whole diagonal ${a}–${b} is ${color}.`,
  };
}

function diagonalSquaresTask(rng: Rng, level: Level): Task {
  const [a, b] = pick(rng, edgeDiagonals(level === 2 ? 3 : 5));
  const squares = diagonalBetween(a, b)!;
  return {
    id: id(),
    module: 'vision',
    level,
    title: 'Name the diagonal',
    prompt: `Tap every square on the diagonal ${a}–${b} on the blank board.`,
    input: { type: 'squares', correct: squares },
    explanation: `The diagonal ${a}–${b} is ${squares.join(', ')}.`,
  };
}

function bishopReachTask(rng: Rng, level: Level): Task {
  const [from, to] = sample(rng, ALL_SQUARES, 2);
  const yes = squareColor(from) === squareColor(to);
  return {
    id: id(),
    module: 'vision',
    level,
    title: 'Bishop reach',
    prompt: `Can a bishop on ${from} ever reach ${to}?`,
    input: { type: 'choice', options: ['Yes', 'No'], correct: yes ? 0 : 1 },
    explanation: `${from} is ${squareColor(from)} and ${to} is ${squareColor(to)}. A bishop never changes colour, so the answer is ${yes ? 'yes' : 'no'}.`,
  };
}

function attackedSquaresTask(rng: Rng, level: Level): Task {
  const kind: PieceKind = pick(rng, level === 2 ? (['N', 'K'] as PieceKind[]) : (['N', 'B', 'R'] as PieceKind[]));
  const from = pick(rng, ALL_SQUARES);
  const names: Record<PieceKind, string> = { N: 'knight', K: 'king', B: 'bishop', R: 'rook', Q: 'queen' };
  const correct = pieceMoves(kind, from);
  return {
    id: id(),
    module: 'vision',
    level,
    title: 'Controlled squares',
    prompt: `A lone ${names[kind]} stands on ${from}. Tap every square it controls.`,
    input: { type: 'squares', correct },
    explanation: `A ${names[kind]} on ${from} controls ${correct.length} squares: ${correct.join(', ')}.`,
  };
}

function sameDiagonalTask(rng: Rng, level: Level): Task {
  const a = pick(rng, ALL_SQUARES);
  // Bias towards pairs that are on the same diagonal half the time.
  let b: string;
  if (rng() < 0.5) {
    const dirs = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    const [dx, dy] = pick(rng, dirs);
    const k = int(rng, 1, 6);
    const x = a.charCodeAt(0) - 97 + dx * k;
    const y = Number(a[1]) - 1 + dy * k;
    b = x >= 0 && x < 8 && y >= 0 && y < 8 ? `${String.fromCharCode(97 + x)}${y + 1}` : pick(rng, ALL_SQUARES);
  } else {
    b = pick(rng, ALL_SQUARES);
  }
  if (a === b) return sameDiagonalTask(rng, level);
  const yes = diagonalBetween(a, b) !== null;
  return {
    id: id(),
    module: 'vision',
    level,
    title: 'Same diagonal?',
    prompt: `Do ${a} and ${b} lie on the same diagonal?`,
    input: { type: 'choice', options: ['Yes', 'No'], correct: yes ? 0 : 1 },
    explanation: yes
      ? `Yes: ${diagonalBetween(a, b)!.join(' → ')}.`
      : `No. Two squares share a diagonal only when the file distance equals the rank distance.`,
  };
}

/** Board-vision drills: from single square colours up to whole lines and piece reach. */
export function visionTask(level: Level, rng: Rng = createRng()): Task {
  const pool: Record<Level, ((r: Rng, l: Level) => Task)[]> = {
    1: [squareColorTask, squareColorTask, diagonalColorTask],
    2: [diagonalColorTask, diagonalSquaresTask, attackedSquaresTask, squareColorTask],
    3: [bishopReachTask, sameDiagonalTask, diagonalSquaresTask, attackedSquaresTask],
  };
  return pick(rng, pool[level])(rng, level);
}
