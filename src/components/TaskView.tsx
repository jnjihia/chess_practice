import { Chess, type Square as ChessSquare } from "chess.js";
import { useEffect, useRef, useState } from 'react';
import { samePlacement } from '../lib/exercises/detective';
import { parseMove } from '../lib/notation';
import { moveKeepsMate, stubbornReply } from '../lib/solver';
import type { Task, TaskInput } from '../lib/types';
import { Board } from './Board';

export interface Outcome {
  correct: boolean;
  usedHelp: boolean;
}

interface Props {
  task: Task;
  onDone: (o: Outcome) => void;
}

/** Renders one exercise and reports the outcome once the player has answered. */
export function TaskView({ task, onDone }: Props) {
  const [result, setResult] = useState<Outcome | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const finish = (o: Outcome, note?: string) => {
    setResult(o);
    setDetail(note ?? null);
  };

  return (
    <div className="task">
      <div className="task-head">
        <span className="pill">Level {task.level}</span>
        <h2>{task.title}</h2>
      </div>
      <p className="prompt">{task.prompt}</p>
      {task.memo && <pre className="memo">{task.memo}</pre>}
      <Input key={task.id} input={task.input} answered={result !== null} onAnswer={finish} />
      {result && (
        <div className={`feedback ${result.correct ? 'good' : 'bad'}`} role="status">
          <strong>{result.correct ? (result.usedHelp ? 'Solved with help' : 'Correct!') : 'Not quite'}</strong>
          {detail && <p>{detail}</p>}
          <p>{task.explanation}</p>
          <button className="btn primary" onClick={() => onDone(result)} autoFocus>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

interface InputProps<T extends TaskInput['type']> {
  input: Extract<TaskInput, { type: T }>;
  answered: boolean;
  onAnswer: (o: Outcome, note?: string) => void;
}

function Input({ input, answered, onAnswer }: { input: TaskInput; answered: boolean; onAnswer: (o: Outcome, note?: string) => void }) {
  switch (input.type) {
    case 'choice':
      return <ChoiceInput input={input} answered={answered} onAnswer={onAnswer} />;
    case 'number':
      return <NumberInput input={input} answered={answered} onAnswer={onAnswer} />;
    case 'squares':
      return <SquaresInput input={input} answered={answered} onAnswer={onAnswer} />;
    case 'square':
      return <SquareInput input={input} answered={answered} onAnswer={onAnswer} />;
    case 'mate':
      return <MateInput input={input} answered={answered} onAnswer={onAnswer} />;
    case 'reconstruct':
      return <ReconstructInput input={input} answered={answered} onAnswer={onAnswer} />;
  }
}

function ChoiceInput({ input, answered, onAnswer }: InputProps<'choice'>) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="choices">
      {input.options.map((o, i) => {
        const state = !answered ? '' : i === input.correct ? 'good' : i === picked ? 'bad' : 'dim';
        return (
          <button
            key={o}
            className={`btn choice ${state}`}
            disabled={answered}
            onClick={() => {
              setPicked(i);
              onAnswer({ correct: i === input.correct, usedHelp: false });
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function NumberInput({ input, answered, onAnswer }: InputProps<'number'>) {
  const [value, setValue] = useState('');
  const submit = () => {
    if (value === '') return;
    const n = Number(value);
    onAnswer({ correct: n === input.correct, usedHelp: false }, n === input.correct ? undefined : `You answered ${n}; the answer is ${input.correct}.`);
  };
  return (
    <div className="keypad">
      <div className="keypad-display" aria-live="polite">{value || '–'}</div>
      <div className="keypad-grid">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map((k) => (
          <button
            key={k}
            className={`btn key ${k === '✓' ? 'primary' : ''}`}
            disabled={answered || (k === '✓' && value === '')}
            aria-label={k === '⌫' ? 'Delete' : k === '✓' ? 'Submit' : k}
            onClick={() => {
              if (k === '⌫') setValue((v) => v.slice(0, -1));
              else if (k === '✓') submit();
              else setValue((v) => (v + k).slice(0, 2));
            }}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

function SquaresInput({ input, answered, onAnswer }: InputProps<'squares'>) {
  const [picked, setPicked] = useState<string[]>([]);
  const correct = new Set(input.correct);
  const toggle = (sq: string) => setPicked((p) => (p.includes(sq) ? p.filter((s) => s !== sq) : [...p, sq]));
  const submit = () => {
    const ok = picked.length === correct.size && picked.every((s) => correct.has(s));
    const missed = input.correct.filter((s) => !picked.includes(s));
    const extra = picked.filter((s) => !correct.has(s));
    onAnswer(
      { correct: ok, usedHelp: false },
      ok ? undefined : [missed.length ? `Missed: ${missed.join(', ')}.` : '', extra.length ? `Not part of it: ${extra.join(', ')}.` : ''].join(' '),
    );
  };
  const marked = answered
    ? [
        ...input.correct.map((s) => ({ square: s, tone: picked.includes(s) ? ('good' as const) : ('hint' as const) })),
        ...picked.filter((s) => !correct.has(s)).map((s) => ({ square: s, tone: 'bad' as const })),
      ]
    : [];
  return (
    <div className="board-input">
      <Board variant="blind" selected={answered ? [] : picked} marked={marked} onSquare={answered ? undefined : toggle} label="Blank board for answering" />
      <div className="row">
        <span className="muted">{picked.length} selected</span>
        <button className="btn ghost" disabled={answered || !picked.length} onClick={() => setPicked([])}>
          Clear
        </button>
        <button className="btn primary" disabled={answered || !picked.length} onClick={submit}>
          Check
        </button>
      </div>
    </div>
  );
}

function SquareInput({ input, answered, onAnswer }: InputProps<'square'>) {
  const [picked, setPicked] = useState<string | null>(null);
  const marked = answered
    ? [{ square: input.correct, tone: 'good' as const }, ...(picked && picked !== input.correct ? [{ square: picked, tone: 'bad' as const }] : [])]
    : [];
  return (
    <div className="board-input">
      <Board
        variant="blind"
        marked={marked}
        onSquare={
          answered
            ? undefined
            : (sq) => {
                setPicked(sq);
                onAnswer({ correct: sq === input.correct, usedHelp: false }, sq === input.correct ? undefined : `You tapped ${sq}.`);
              }
        }
        label="Blank board: tap the square"
      />
    </div>
  );
}

function MateInput({ input, answered, onAnswer }: InputProps<'mate'>) {
  const [fen, setFen] = useState(input.fen);
  const [movesLeft, setMovesLeft] = useState(input.moves);
  const [line, setLine] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [from, setFrom] = useState<string | null>(null);
  const [peek, setPeek] = useState(false);
  const [usedPeek, setUsedPeek] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const play = (raw: string) => {
    const game = new Chess(fen);
    const mv = parseMove(game, raw);
    if (!mv) {
      setError(`"${raw}" is not a legal move here. Use notation like Rd1 or d3-d1.`);
      return;
    }
    setError(null);
    setText('');
    setFrom(null);
    if (!moveKeepsMate(fen, movesLeft, mv.san)) {
      onAnswer({ correct: false, usedHelp: usedPeek }, `${[...line, mv.san].join(' ')} does not force mate.`);
      return;
    }
    if (game.isCheckmate()) {
      setLine([...line, mv.san]);
      setFen(game.fen());
      onAnswer({ correct: true, usedHelp: usedPeek }, `Line: ${[...line, mv.san].join(' ')}`);
      return;
    }
    const reply = stubbornReply(game.fen(), movesLeft - 1)!;
    game.move(reply);
    setLine([...line, mv.san, reply]);
    setFen(game.fen());
    setMovesLeft(movesLeft - 1);
  };

  const doPeek = () => {
    setUsedPeek(true);
    setPeek(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPeek(false), 3000);
  };

  return (
    <div className="mate">
      {line.length > 0 && (
        <p className="line">
          So far: <strong>{line.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}.${m}` : m)).join(' ')}</strong>
          {!answered && <> · Black replied {line[line.length - 1]}. Mate in {movesLeft} more.</>}
        </p>
      )}
      <Board
        fen={peek || answered ? fen : undefined}
        variant={peek || answered ? 'normal' : 'blind'}
        selected={from ? [from] : []}
        onSquare={
          answered
            ? undefined
            : (sq) => {
                if (!from) setFrom(sq);
                else if (from === sq) setFrom(null);
                else play(`${from}-${sq}`);
              }
        }
        label={peek ? 'Peeking at the position' : 'Blank board: tap the from-square, then the to-square'}
      />
      {!answered && (
        <>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              play(text);
            }}
          >
            <input
              className="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a move, e.g. Rd1"
              aria-label="Your move"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button className="btn primary" disabled={!text.trim()}>
              Play
            </button>
          </form>
          <div className="row">
            <button className="btn ghost" onClick={doPeek} disabled={peek}>
              Peek for 3s (half XP)
            </button>
            <button className="btn ghost" onClick={() => onAnswer({ correct: false, usedHelp: true }, 'Solution revealed.')}>
              Give up
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </>
      )}
    </div>
  );
}

function ReconstructInput({ input, answered, onAnswer }: InputProps<'reconstruct'>) {
  const [history, setHistory] = useState<string[]>([]);
  const [from, setFrom] = useState<string | null>(null);
  const [hints, setHints] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const game = new Chess();
  history.forEach((m) => game.move(m));
  const verbose = game.history({ verbose: true });
  const last = verbose[verbose.length - 1];

  const commit = (next: string[]) => {
    setHistory(next);
    setFrom(null);
    if (next.length === input.plies) {
      const g = new Chess();
      next.forEach((m) => g.move(m));
      if (samePlacement(g.fen(), input.targetFen)) {
        onAnswer({ correct: true, usedHelp: hints > 0 }, `Case closed in ${input.plies} half-moves.`);
      } else {
        setMsg('That reaches a different position. Undo and look at the clues again.');
      }
    } else {
      setMsg(null);
    }
  };

  const tap = (sq: string) => {
    if (history.length >= input.plies) return;
    const piece = game.get(sq as ChessSquare);
    if (!from) {
      if (piece && piece.color === game.turn()) setFrom(sq);
      return;
    }
    if (piece && piece.color === game.turn()) {
      setFrom(sq);
      return;
    }
    try {
      const mv = game.move({ from: from as ChessSquare, to: sq as ChessSquare, promotion: 'q' });
      commit([...history, mv.san]);
    } catch {
      setFrom(null);
    }
  };

  const hint = () => {
    // Rewind to the longest correct prefix, then reveal the next move.
    let k = 0;
    while (k < history.length && history[k] === input.solution[k]) k++;
    setHints((h) => h + 1);
    commit([...input.solution.slice(0, k), input.solution[k]].filter(Boolean));
  };

  return (
    <div className="reconstruct">
      <div className="clues">
        {input.clues.map((c) => (
          <Board key={c.ply} size="small" fen={c.fen} label={`Clue: after ${c.ply} half-moves`} />
        ))}
        <Board size="small" fen={input.targetFen} label={`Final: after ${input.plies} half-moves`} />
      </div>
      <p className="line">
        Move {Math.min(history.length + 1, input.plies)} of {input.plies} · {game.turn() === 'w' ? 'White' : 'Black'} to play
        {history.length > 0 && (
          <>
            {' '}
            · <strong>{history.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}.${m}` : m)).join(' ')}</strong>
          </>
        )}
      </p>
      <Board
        fen={answered ? input.targetFen : game.fen()}
        selected={from ? [from] : []}
        lastMove={last ? { from: last.from, to: last.to } : null}
        onSquare={answered ? undefined : tap}
        label="Your reconstruction board"
      />
      {!answered && (
        <div className="row">
          <button className="btn ghost" disabled={!history.length} onClick={() => commit(history.slice(0, -1))}>
            Undo
          </button>
          <button className="btn ghost" disabled={!history.length} onClick={() => commit([])}>
            Restart
          </button>
          <button className="btn ghost" onClick={hint}>
            Hint (half XP)
          </button>
          <button className="btn ghost" onClick={() => onAnswer({ correct: false, usedHelp: true }, 'Solution revealed.')}>
            Give up
          </button>
        </div>
      )}
      {msg && <p className="error">{msg}</p>}
    </div>
  );
}
