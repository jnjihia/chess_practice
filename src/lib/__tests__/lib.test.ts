import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { createRng } from '../rng';
import { diagonalBetween, distance, edgeDiagonals, minMovesToCaptureAll, pieceMoves, squareColor } from '../squares';
import { CASES, caseHistory, detectiveTask, samePlacement } from '../exercises/detective';
import { playthroughTask, plausibleGame } from '../exercises/playthrough';
import { visionTask } from '../exercises/vision';
import { routesTask } from '../exercises/routes';
import { mateKeys, moveKeepsMate, stubbornReply } from '../solver';
import { freshProgress, isUnlocked, rankFor, recordAnswer, UNLOCK_AT } from '../progress';
import type { Level } from '../types';

describe('squares', () => {
  it('knows square colours', () => {
    expect(squareColor('a1')).toBe('dark');
    expect(squareColor('h1')).toBe('light');
    expect(squareColor('e4')).toBe('light');
    expect(squareColor('d4')).toBe('dark');
  });
  it('walks diagonals', () => {
    expect(diagonalBetween('a5', 'd8')).toEqual(['a5', 'b6', 'c7', 'd8']);
    expect(diagonalBetween('a1', 'b3')).toBeNull();
    expect(edgeDiagonals(3).length).toBe(22);
  });
  it('computes knight distances', () => {
    expect(distance('N', 'a1', 'b3')).toBe(1);
    expect(distance('N', 'a1', 'h8')).toBe(6);
    expect(distance('N', 'a1', 'b2')).toBe(4);
    expect(pieceMoves('N', 'a1').sort()).toEqual(['b3', 'c2']);
  });
  it('hunts pawns with blocking', () => {
    expect(minMovesToCaptureAll('R', 'a1', ['a4', 'a8'])).toBe(2);
    expect(minMovesToCaptureAll('B', 'a1', ['h1'])).toBe(Infinity);
  });
});

describe('generators produce well-formed tasks', () => {
  const rng = createRng(42);
  for (const level of [1, 2, 3] as Level[]) {
    it(`level ${level}`, () => {
      for (let i = 0; i < 40; i++) {
        for (const t of [visionTask(level, rng), routesTask(level, rng), playthroughTask(level, rng)]) {
          expect(t.prompt.length).toBeGreaterThan(10);
          if (t.input.type === 'choice') expect(t.input.correct).toBeGreaterThanOrEqual(0);
          if (t.input.type === 'number') expect(Number.isFinite(t.input.correct)).toBe(true);
        }
      }
    });
  }
  it('plausible games are legal', () => {
    const g = plausibleGame(createRng(7), 16);
    expect(new Chess().loadPgn).toBeDefined();
    expect(g.history().length).toBeGreaterThan(0);
  });
});

describe('detective cases', () => {
  it('every case is a legal line', () => {
    for (const c of CASES) expect(() => caseHistory(c)).not.toThrow();
  });
  it('each level has cases and clue diagrams', () => {
    for (const level of [1, 2, 3] as Level[]) {
      const t = detectiveTask(level, createRng(1));
      expect(t.input.type).toBe('reconstruct');
    }
  });
  it('compares by placement only', () => {
    const a = new Chess();
    a.move('Nf3');
    a.move('Nf6');
    a.move('Nc3');
    const b = new Chess();
    b.move('Nc3');
    b.move('Nf6');
    b.move('Nf3');
    expect(samePlacement(a.fen(), b.fen())).toBe(true);
  });
});

describe('solver', () => {
  it('finds back-rank mates', () => {
    const fen = '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1';
    expect(mateKeys(fen, 1).map((m) => m.san)).toEqual(['Re8#']);
    expect(moveKeepsMate(fen, 1, 'Re8')).toBe(true);
    expect(moveKeepsMate(fen, 1, 'Re7')).toBe(false);
  });
  it('picks a reply when one exists', () => {
    expect(stubbornReply('6k1/5ppp/8/8/8/8/8/4R1K1 b - - 0 1', 1)).not.toBeNull();
  });
});

describe('progress', () => {
  it('awards xp, streaks and unlocks', () => {
    let p = freshProgress();
    for (let i = 0; i < UNLOCK_AT; i++) p = recordAnswer(p, 'vision', 1, true, false, new Date(2026, 0, 1)).progress;
    expect(isUnlocked(p, 'vision', 2)).toBe(true);
    expect(isUnlocked(p, 'vision', 3)).toBe(false);
    expect(p.xp).toBe(UNLOCK_AT * 10);
    p = recordAnswer(p, 'vision', 1, true, false, new Date(2026, 0, 2)).progress;
    expect(p.streak).toBe(2);
    p = recordAnswer(p, 'vision', 1, true, false, new Date(2026, 0, 5)).progress;
    expect(p.streak).toBe(1);
    expect(rankFor(0).name).toBe('Novice');
    expect(rankFor(400).name).toBe('Club Player');
  });
});

describe('notation', async () => {
  const { parseMove } = await import('../notation');
  it('accepts SAN and coordinate forms', () => {
    const fen = '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1';
    expect(parseMove(new Chess(fen), 'Re8')?.san).toBe('Re8#');
    expect(parseMove(new Chess(fen), 'e1-e8')?.san).toBe('Re8#');
    expect(parseMove(new Chess(fen), 'e1e8')?.san).toBe('Re8#');
    expect(parseMove(new Chess(fen), 'Re8#')?.san).toBe('Re8#');
    expect(parseMove(new Chess(fen), 'Qd4')).toBeNull();
  });
});

describe('mate bank', async () => {
  const bank = (await import('../../data/mates.json')).default as { fen: string; moves: number; level: number; key: string }[];
  it('has puzzles for every level', () => {
    for (const l of [1, 2, 3]) expect(bank.filter((e) => e.level === l).length).toBeGreaterThan(50);
  });
  it('every sampled puzzle has exactly the stored key move', () => {
    const sample = bank.filter((_, i) => i % 12 === 0);
    for (const e of sample) expect(mateKeys(e.fen, e.moves).map((m) => m.san)).toEqual([e.key]);
  }, 60_000);
});
