import { Chess } from 'chess.js';
import { useMemo } from 'react';
import { FILES, toXY } from '../lib/squares';

const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

export interface BoardProps {
  /** Position to draw. Omit for an empty board. */
  fen?: string;
  /** "blind" draws every square the same colour, so colour questions cannot be read off the board. */
  variant?: 'normal' | 'blind';
  selected?: string[];
  /** Extra highlight (e.g. correct answers after submitting). */
  marked?: { square: string; tone: 'good' | 'bad' | 'hint' }[];
  lastMove?: { from: string; to: string } | null;
  onSquare?: (square: string) => void;
  size?: 'full' | 'small';
  label?: string;
}

export function Board({ fen, variant = 'normal', selected = [], marked = [], lastMove, onSquare, size = 'full', label }: BoardProps) {
  const pieces = useMemo(() => {
    if (!fen) return [];
    return (new Chess(fen).board().flat().filter(Boolean) as { square: string; type: string; color: string }[]);
  }, [fen]);
  const sel = new Set(selected);
  const markMap = new Map(marked.map((m) => [m.square, m.tone]));
  const squares = [];
  for (let rank = 8; rank >= 1; rank--) {
    for (let f = 0; f < 8; f++) {
      const sq = `${FILES[f]}${rank}`;
      const [x, y] = toXY(sq);
      const dark = (x + y) % 2 === 0;
      const tone = markMap.get(sq);
      const fill =
        variant === 'blind' ? 'var(--sq-blind)' : dark ? 'var(--sq-dark)' : 'var(--sq-light)';
      squares.push(
        <g key={sq} onClick={onSquare ? () => onSquare(sq) : undefined} className={onSquare ? 'sq clickable' : 'sq'}>
          <rect x={f} y={8 - rank} width={1} height={1} fill={fill} stroke={variant === 'blind' ? 'var(--sq-blind-line)' : 'none'} strokeWidth={0.02} />
          {lastMove && (lastMove.from === sq || lastMove.to === sq) && (
            <rect x={f} y={8 - rank} width={1} height={1} fill="var(--sq-last)" />
          )}
          {sel.has(sq) && <rect x={f + 0.04} y={8 - rank + 0.04} width={0.92} height={0.92} fill="var(--sq-select)" rx={0.08} />}
          {tone && (
            <rect
              x={f + 0.06}
              y={8 - rank + 0.06}
              width={0.88}
              height={0.88}
              rx={0.1}
              fill="none"
              stroke={`var(--tone-${tone})`}
              strokeWidth={0.09}
            />
          )}
        </g>,
      );
    }
  }
  return (
    <figure className={`board board-${size}`}>
      <svg viewBox="-0.45 0 8.45 8.45" role="img" aria-label={label ?? 'Chess board'}>
        {squares}
        {pieces.map((p) => {
          const [x, y] = toXY(p.square);
          return (
            <text
              key={p.square}
              x={x + 0.5}
              y={7 - y + 0.8}
              textAnchor="middle"
              fontSize={0.86}
              className={`piece piece-${p.color}`}
              pointerEvents="none"
            >
              {GLYPH[p.type]}
            </text>
          );
        })}
        {FILES.map((f, i) => (
          <text key={f} x={i + 0.5} y={8.36} textAnchor="middle" fontSize={0.28} className="coord">
            {f}
          </text>
        ))}
        {[8, 7, 6, 5, 4, 3, 2, 1].map((r, i) => (
          <text key={r} x={-0.22} y={i + 0.6} textAnchor="middle" fontSize={0.28} className="coord">
            {r}
          </text>
        ))}
      </svg>
      {label && size === 'small' && <figcaption>{label}</figcaption>}
    </figure>
  );
}
