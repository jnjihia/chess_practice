import { Chess, type Square as ChessSquare } from 'chess.js';

/** Parse "Rd1", "d3d1", "d3-d1" or "Rd3-d1" into a legal move for `game`. */
export function parseMove(game: Chess, text: string) {
  const t = text.trim().replace(/[+#!?]/g, '').replace(/0/g, 'O');
  if (!t) return null;
  try {
    return game.move(t, { strict: false });
  } catch {
    /* fall through to coordinate form */
  }
  const m = t.toLowerCase().match(/([a-h][1-8])\s*[-x:]?\s*([a-h][1-8])(?:=?([qrbn]))?$/);
  if (!m) return null;
  try {
    return game.move({ from: m[1] as ChessSquare, to: m[2] as ChessSquare, promotion: (m[3] ?? 'q') as 'q' });
  } catch {
    return null;
  }
}
