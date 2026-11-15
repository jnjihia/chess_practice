import { Chess, type Move } from 'chess.js';

/**
 * Tiny forced-mate solver for sparse positions. Side to move is the attacker.
 * `n` counts the attacker's moves (mate in n).
 */
export function hasForcedMate(game: Chess, n: number): boolean {
  if (n <= 0) return false;
  for (const move of game.moves({ verbose: true })) {
    game.move(move);
    const ok = defenderLoses(game, n - 1);
    game.undo();
    if (ok) return true;
  }
  return false;
}

/** After the attacker moved: true when every defence still loses within `remaining` attacker moves. */
function defenderLoses(game: Chess, remaining: number): boolean {
  if (game.isCheckmate()) return true;
  if (remaining === 0 || game.isGameOver()) return false;
  for (const reply of game.moves({ verbose: true })) {
    game.move(reply);
    const ok = hasForcedMate(game, remaining);
    game.undo();
    if (!ok) return false;
  }
  return true;
}

/** All attacker first moves that force mate in `n`. */
export function mateKeys(fen: string, n: number): Move[] {
  const game = new Chess(fen);
  const keys: Move[] = [];
  for (const move of game.moves({ verbose: true })) {
    game.move(move);
    if (defenderLoses(game, n - 1)) keys.push(move);
    game.undo();
  }
  return keys;
}

/** True when the attacker's `move` (already the side to move in `fen`) keeps a forced mate within `n` total moves. */
export function moveKeepsMate(fen: string, n: number, san: string): boolean {
  const game = new Chess(fen);
  try {
    game.move(san);
  } catch {
    return false;
  }
  return defenderLoses(game, n - 1);
}

/**
 * Pick the defender's most stubborn reply: one that delays mate the longest, so the
 * player must still find the full line. Returns null when the defender has no moves.
 */
export function stubbornReply(fen: string, attackerMovesLeft: number): string | null {
  const game = new Chess(fen);
  let candidates = game.moves({ verbose: true });
  if (!candidates.length) return null;
  for (let quick = 1; quick < attackerMovesLeft; quick++) {
    const survivors = candidates.filter((r) => {
      game.move(r);
      const fast = hasForcedMate(game, quick);
      game.undo();
      return !fast;
    });
    if (!survivors.length) break;
    candidates = survivors;
  }
  return candidates[0].san;
}
