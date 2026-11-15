import type { Level, ModuleId } from './types';

/** Correct answers needed at a level to unlock the next one. */
export const UNLOCK_AT = 8;
/** Exercises in one daily session, following the book's "five tasks a day" routine. */
export const DAILY_SIZE = 5;

export const RANKS = [
  { name: 'Novice', xp: 0 },
  { name: 'Apprentice', xp: 150 },
  { name: 'Club Player', xp: 400 },
  { name: 'Expert', xp: 900 },
  { name: 'Candidate Master', xp: 1700 },
  { name: 'Master', xp: 3000 },
  { name: 'Grandmaster', xp: 5000 },
] as const;

export interface LevelStats {
  attempts: number;
  correct: number;
}

export interface Progress {
  version: 1;
  xp: number;
  streak: number;
  bestStreak: number;
  lastDay: string | null;
  dailyDoneOn: string | null;
  solvedCases: string[];
  stats: Record<ModuleId, Record<Level, LevelStats>>;
}

const KEY = 'cognitive-chess/progress';
const MODULE_IDS: ModuleId[] = ['vision', 'routes', 'mates', 'detective', 'playthrough'];

const emptyLevels = (): Record<Level, LevelStats> => ({
  1: { attempts: 0, correct: 0 },
  2: { attempts: 0, correct: 0 },
  3: { attempts: 0, correct: 0 },
});

export function freshProgress(): Progress {
  return {
    version: 1,
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lastDay: null,
    dailyDoneOn: null,
    solvedCases: [],
    stats: Object.fromEntries(MODULE_IDS.map((m) => [m, emptyLevels()])) as Progress['stats'],
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshProgress();
    const parsed = JSON.parse(raw) as Progress;
    if (parsed.version !== 1) return freshProgress();
    // Fill in modules added after the save was written.
    const base = freshProgress();
    return { ...base, ...parsed, stats: { ...base.stats, ...parsed.stats } };
  } catch {
    return freshProgress();
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable (private mode); progress lives for this session only */
  }
}

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function xpFor(level: Level, correct: boolean, usedHelp: boolean): number {
  if (!correct) return 2;
  const base = { 1: 10, 2: 20, 3: 35 }[level];
  return usedHelp ? Math.round(base / 2) : base;
}

/** Record one answer and return the updated progress (pure). */
export function recordAnswer(
  p: Progress,
  module: ModuleId,
  level: Level,
  correct: boolean,
  usedHelp: boolean,
  now = new Date(),
): { progress: Progress; gained: number } {
  const gained = xpFor(level, correct, usedHelp);
  const d = today(now);
  let streak = p.streak;
  if (p.lastDay !== d) {
    streak = p.lastDay && dayDiff(p.lastDay, d) === 1 ? p.streak + 1 : 1;
  }
  const lv = p.stats[module][level];
  const progress: Progress = {
    ...p,
    xp: p.xp + gained,
    streak,
    bestStreak: Math.max(p.bestStreak, streak),
    lastDay: d,
    stats: {
      ...p.stats,
      [module]: { ...p.stats[module], [level]: { attempts: lv.attempts + 1, correct: lv.correct + (correct ? 1 : 0) } },
    },
  };
  return { progress, gained };
}

/** Streak shown on the home screen: it resets once a full day is missed. */
export function liveStreak(p: Progress, now = new Date()): number {
  if (!p.lastDay) return 0;
  return dayDiff(p.lastDay, today(now)) <= 1 ? p.streak : 0;
}

export function isUnlocked(p: Progress, module: ModuleId, level: Level): boolean {
  if (level === 1) return true;
  return p.stats[module][(level - 1) as Level].correct >= UNLOCK_AT;
}

/** 0–3 stars per level: 3, 8 and 15 correct answers. */
export function stars(stats: LevelStats): number {
  return [3, 8, 15].filter((t) => stats.correct >= t).length;
}

export function rankFor(xp: number) {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (xp >= r.xp) idx = i;
  });
  const cur = RANKS[idx];
  const next = RANKS[idx + 1];
  return {
    name: cur.name,
    index: idx,
    next: next?.name ?? null,
    progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1,
    toNext: next ? next.xp - xp : 0,
  };
}

export function highestUnlocked(p: Progress, module: ModuleId): Level {
  return isUnlocked(p, module, 3) ? 3 : isUnlocked(p, module, 2) ? 2 : 1;
}
