import { useEffect, useMemo, useState } from 'react';
import { TaskView, type Outcome } from './components/TaskView';
import { createRng } from './lib/rng';
import { makeTask, moduleInfo, MODULES } from './lib/modules';
import {
  DAILY_SIZE,
  highestUnlocked,
  isUnlocked,
  liveStreak,
  loadProgress,
  rankFor,
  recordAnswer,
  saveProgress,
  stars,
  today,
  UNLOCK_AT,
  xpFor,
  type Progress,
} from './lib/progress';
import type { Level, ModuleId, Task } from './lib/types';

type Plan = { kind: 'daily' } | { kind: 'practice'; module: ModuleId; level: Level };
type Screen = { name: 'home' } | { name: 'session'; plan: Plan; run: number } | { name: 'summary'; plan: Plan; results: SessionResult[] } | { name: 'about' };
interface SessionResult {
  task: Task;
  outcome: Outcome;
  gained: number;
}

const ROUND = 5;

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  return (
    <div className="app">
      <TopBar progress={progress} onHome={() => setScreen({ name: 'home' })} />
      <main>
        {screen.name === 'home' && (
          <Home
            progress={progress}
            onStart={(plan) => setScreen({ name: 'session', plan, run: Date.now() })}
            onAbout={() => setScreen({ name: 'about' })}
          />
        )}
        {screen.name === 'session' && (
          <Session
            key={screen.run}
            plan={screen.plan}
            progress={progress}
            onAnswer={(t, o) => {
              setProgress((p) => {
                const next = recordAnswer(p, t.module, t.level, o.correct, o.usedHelp).progress;
                if (t.module === 'detective' && o.correct && !next.solvedCases.includes(t.title)) {
                  next.solvedCases = [...next.solvedCases, t.title];
                }
                return next;
              });
              return xpFor(t.level, o.correct, o.usedHelp);
            }}
            onFinish={(results) => {
              if (screen.plan.kind === 'daily') setProgress((p) => ({ ...p, dailyDoneOn: today() }));
              setScreen({ name: 'summary', plan: screen.plan, results });
            }}
            onQuit={() => setScreen({ name: 'home' })}
          />
        )}
        {screen.name === 'summary' && (
          <Summary
            results={screen.results}
            progress={progress}
            onAgain={() => setScreen({ name: 'session', plan: screen.plan, run: Date.now() })}
            onHome={() => setScreen({ name: 'home' })}
          />
        )}
        {screen.name === 'about' && <About onBack={() => setScreen({ name: 'home' })} onReset={() => setProgress(loadProgressReset())} />}
      </main>
    </div>
  );
}

function loadProgressReset(): Progress {
  try {
    localStorage.removeItem('cognitive-chess/progress');
  } catch {
    /* ignore */
  }
  return loadProgress();
}

function TopBar({ progress, onHome }: { progress: Progress; onHome: () => void }) {
  const rank = rankFor(progress.xp);
  const streak = liveStreak(progress);
  return (
    <header className="topbar">
      <button className="brand" onClick={onHome} aria-label="Home">
        <span className="logo">♞</span> Mind Gym
      </button>
      <div className="stats">
        <span title="Daily streak" className="stat">
          🔥 {streak}
        </span>
        <span title="Experience points" className="stat">
          ⭐ {progress.xp}
        </span>
      </div>
      <div className="rankbar" title={rank.next ? `${rank.toNext} XP to ${rank.next}` : 'Top rank'}>
        <div className="rankbar-fill" style={{ width: `${Math.round(rank.progress * 100)}%` }} />
      </div>
    </header>
  );
}

function Home({ progress, onStart, onAbout }: { progress: Progress; onStart: (p: Plan) => void; onAbout: () => void }) {
  const rank = rankFor(progress.xp);
  const dailyDone = progress.dailyDoneOn === today();
  return (
    <div className="home">
      <section className="hero card">
        <p className="eyebrow">Rank</p>
        <h1>{rank.name}</h1>
        <p className="muted">{rank.next ? `${rank.toNext} XP to ${rank.next}` : 'You reached the top rank. Keep the streak alive.'}</p>
        <button className="btn primary big" onClick={() => onStart({ kind: 'daily' })}>
          {dailyDone ? 'Extra daily workout' : "Start today's workout"}
        </button>
        <p className="muted small">
          {DAILY_SIZE} mixed exercises, solved without moving pieces. {dailyDone ? 'Today is done ✓' : 'Keep your streak going.'}
        </p>
      </section>

      <h2 className="section-title">Training worlds</h2>
      <div className="modules">
        {MODULES.map((m) => (
          <article key={m.id} className="card module">
            <div className="module-head">
              <span className="module-icon" aria-hidden>
                {m.icon}
              </span>
              <div>
                <h3>{m.name}</h3>
                <p className="muted small">{m.tagline}</p>
              </div>
            </div>
            <div className="levels">
              {([1, 2, 3] as Level[]).map((l) => {
                const open = isUnlocked(progress, m.id, l);
                const st = progress.stats[m.id][l];
                const prev = l > 1 ? progress.stats[m.id][(l - 1) as Level].correct : 0;
                return (
                  <button
                    key={l}
                    className={`btn level ${open ? '' : 'locked'}`}
                    disabled={!open}
                    onClick={() => onStart({ kind: 'practice', module: m.id, level: l })}
                    title={open ? `Practice level ${l}` : `Solve ${UNLOCK_AT - prev} more at level ${l - 1} to unlock`}
                  >
                    <span className="level-name">{open ? m.levelNames[l - 1] : '🔒'}</span>
                    <span className="level-stars" aria-label={`${stars(st)} of 3 stars`}>
                      {'★'.repeat(stars(st))}
                      <span className="empty">{'☆'.repeat(3 - stars(st))}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      <button className="btn link" onClick={onAbout}>
        About the method
      </button>
    </div>
  );
}

function Session({
  plan,
  progress,
  onAnswer,
  onFinish,
  onQuit,
}: {
  plan: Plan;
  progress: Progress;
  onAnswer: (t: Task, o: Outcome) => number;
  onFinish: (r: SessionResult[]) => void;
  onQuit: () => void;
}) {
  const rng = useMemo(() => createRng(), []);
  const size = plan.kind === 'daily' ? DAILY_SIZE : ROUND;
  const [results, setResults] = useState<SessionResult[]>([]);
  const [task, setTask] = useState<Task>(() => nextTask(plan, progress, rng, 0, []));
  const [lastGain, setLastGain] = useState<number | null>(null);

  const done = (o: Outcome) => {
    const gained = onAnswer(task, o);
    const all = [...results, { task, outcome: o, gained }];
    setResults(all);
    setLastGain(gained);
    if (all.length >= size) onFinish(all);
    else setTask(nextTask(plan, progress, rng, all.length, all.map((r) => r.task.title)));
  };

  const title = plan.kind === 'daily' ? "Today's workout" : `${moduleInfo(plan.module).name} · ${moduleInfo(plan.module).levelNames[plan.level - 1]}`;
  return (
    <div className="session">
      <div className="session-head">
        <button className="btn ghost" onClick={onQuit} aria-label="Quit session">
          ✕
        </button>
        <div className="session-title">{title}</div>
        <div className="dots" aria-label={`Exercise ${results.length + 1} of ${size}`}>
          {Array.from({ length: size }, (_, i) => (
            <span key={i} className={`dot ${i < results.length ? (results[i].outcome.correct ? 'good' : 'bad') : i === results.length ? 'cur' : ''}`} />
          ))}
        </div>
      </div>
      {lastGain !== null && (
        <div className="gain" key={results.length}>
          +{lastGain} XP
        </div>
      )}
      <TaskView key={task.id} task={task} onDone={done} />
    </div>
  );
}

/** Daily sessions rotate through every world at the highest level the player has unlocked. */
function nextTask(plan: Plan, progress: Progress, rng: () => number, index: number, used: string[]): Task {
  if (plan.kind === 'practice') return makeTask(plan.module, plan.level, rng, used);
  const order: ModuleId[] = ['vision', 'routes', 'mates', 'playthrough', 'detective'];
  const module = order[index % order.length];
  return makeTask(module, highestUnlocked(progress, module), rng, used);
}

function Summary({ results, progress, onAgain, onHome }: { results: SessionResult[]; progress: Progress; onAgain: () => void; onHome: () => void }) {
  const correct = results.filter((r) => r.outcome.correct).length;
  const xp = results.reduce((s, r) => s + r.gained, 0);
  const rank = rankFor(progress.xp);
  const verdict = correct === results.length ? 'Flawless!' : correct >= results.length * 0.6 ? 'Strong session' : 'Good effort';
  return (
    <div className="summary card">
      <p className="eyebrow">Session complete</p>
      <h1>{verdict}</h1>
      <div className="summary-stats">
        <div>
          <strong>
            {correct}/{results.length}
          </strong>
          <span>solved</span>
        </div>
        <div>
          <strong>+{xp}</strong>
          <span>XP</span>
        </div>
        <div>
          <strong>{liveStreak(progress)}</strong>
          <span>day streak</span>
        </div>
      </div>
      <p className="muted">
        Rank: {rank.name}
        {rank.next && ` · ${rank.toNext} XP to ${rank.next}`}
      </p>
      <ul className="review">
        {results.map((r) => (
          <li key={r.task.id} className={r.outcome.correct ? 'good' : 'bad'}>
            <span>{r.outcome.correct ? '✓' : '✗'}</span> {r.task.title}
          </li>
        ))}
      </ul>
      <div className="row">
        <button className="btn ghost" onClick={onHome}>
          Home
        </button>
        <button className="btn primary" onClick={onAgain}>
          Another round
        </button>
      </div>
    </div>
  );
}

function About({ onBack, onReset }: { onBack: () => void; onReset: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="about card">
      <h1>About the method</h1>
      <p>
        Mind Gym is a training companion inspired by the ideas in <em>Cognitive Chess</em> by Konstantin Chernyshov: many players calculate
        poorly because their picture of the board is weak. Every exercise here is solved in your head, without moving pieces.
      </p>
      <ol>
        <li>
          <strong>Board Vision</strong> builds an inner board: colours, diagonals and the reach of each piece.
        </li>
        <li>
          <strong>Piece Routes</strong> trains counting moves before you make them.
        </li>
        <li>
          <strong>Blindfold Mates</strong> gives a position only as text. Hold it in memory and find the mate.
        </li>
        <li>
          <strong>Chess Detective</strong> asks you to reconstruct a whole game from its final position and a clue.
        </li>
        <li>
          <strong>Mind Replay</strong> has you follow a game score mentally and answer about the result.
        </li>
      </ol>
      <p>
        Work in short daily sessions, take your time over each exercise, and peek only when you are truly stuck. All exercises are original and
        generated by the app; for the full method and the author's own exercises, read the book.
      </p>
      <div className="row">
        <button className="btn ghost" onClick={onBack}>
          Back
        </button>
        {confirm ? (
          <button
            className="btn danger"
            onClick={() => {
              onReset();
              setConfirm(false);
            }}
          >
            Yes, erase my progress
          </button>
        ) : (
          <button className="btn ghost" onClick={() => setConfirm(true)}>
            Reset progress
          </button>
        )}
      </div>
    </div>
  );
}
