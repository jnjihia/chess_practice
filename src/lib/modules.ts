import { createRng, type Rng } from './rng';
import { detectiveTask } from './exercises/detective';
import { mateTask } from './exercises/mates';
import { playthroughTask } from './exercises/playthrough';
import { routesTask } from './exercises/routes';
import { visionTask } from './exercises/vision';
import type { Level, ModuleId, ModuleInfo, Task } from './types';

/**
 * The five training worlds, ordered to follow the book's progression:
 * board vision → calculation of routes → blindfold mates → game reconstruction → longer lines.
 */
export const MODULES: ModuleInfo[] = [
  {
    id: 'vision',
    name: 'Board Vision',
    tagline: 'See the board with your eyes closed.',
    method: 'Square and diagonal colours, lines and piece reach, all without a board.',
    icon: '◐',
    levelNames: ['Colours', 'Lines', 'Geometry'],
  },
  {
    id: 'routes',
    name: 'Piece Routes',
    tagline: 'Count the moves before you make them.',
    method: 'Shortest routes and pawn hunts, to train calculating piece paths.',
    icon: '♞',
    levelNames: ['Journeys', 'Pawn hunt', 'Long hunt'],
  },
  {
    id: 'mates',
    name: 'Blindfold Mates',
    tagline: 'Solve from a piece list alone.',
    method: 'Positions given only as text. Hold them in your head and find the mate.',
    icon: '♛',
    levelNames: ['Mate in one', 'Mate in two', 'Defended'],
  },
  {
    id: 'detective',
    name: 'Chess Detective',
    tagline: 'Reconstruct the crime from the clues.',
    method: 'Rebuild a whole game from its final position, a clue diagram and the move count.',
    icon: '🔍',
    levelNames: ['Rookie', 'Inspector', 'Chief'],
  },
  {
    id: 'playthrough',
    name: 'Mind Replay',
    tagline: 'Play the whole line in your head.',
    method: 'Read a game score, follow it mentally, then answer about the final position.',
    icon: '🧠',
    levelNames: ['Short', 'Medium', 'Long'],
  },
];

export function moduleInfo(id: ModuleId): ModuleInfo {
  return MODULES.find((m) => m.id === id)!;
}

export function makeTask(module: ModuleId, level: Level, rng: Rng = createRng(), exclude: string[] = []): Task {
  switch (module) {
    case 'vision':
      return visionTask(level, rng);
    case 'routes':
      return routesTask(level, rng);
    case 'mates':
      return mateTask(level, rng);
    case 'playthrough':
      return playthroughTask(level, rng);
    case 'detective':
      return detectiveTask(level, rng, exclude);
  }
}
