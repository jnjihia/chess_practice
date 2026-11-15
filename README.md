# Mind Gym · Chess Vision Training

A gamified chess training app inspired by the ideas in *Cognitive Chess* by Konstantin Chernyshov: strong calculation depends on a clear inner picture of the board. Every exercise is solved in your head, without moving pieces.

It runs in any browser and installs on phones as a Progressive Web App (PWA), so it works offline from the home screen on both iOS and Android.

## Training worlds

The five worlds follow the book's progression, from basic board vision to whole games played in the head. Each world has three levels; solving 8 exercises at one level unlocks the next.

| World | What you train | Level 1 → 3 |
| --- | --- | --- |
| **Board Vision** | Square and diagonal colours, lines, piece reach | Colours → Lines → Geometry |
| **Piece Routes** | Counting moves before making them | Single journeys → Pawn hunts with blocking pawns |
| **Blindfold Mates** | Holding a position given as text and finding the mate | Mate in 1 → Mate in 2 → Mate in 2 with defenders |
| **Chess Detective** | Reconstructing a game from its final position and a clue diagram | Short traps → Longer miniatures |
| **Mind Replay** | Following a game score mentally, then answering about the result | 4–6 → 12–16 half-moves |

### Game layer

- **Daily workout:** five mixed exercises a day, one from each world, at your highest unlocked level.
- **XP and ranks:** from Novice to Grandmaster. Harder levels pay more XP; using a peek or hint pays half.
- **Streaks:** consecutive training days.
- **Stars:** up to three per level (3, 8 and 15 correct answers).

Progress is stored on the device (`localStorage`). Accounts and sync are planned for the multiplayer phase.

## Content and copyright

All exercises are original. Board-vision, route and replay exercises are generated on the fly; mate puzzles come from a computer-generated bank (`src/data/mates.json`, built by `npm run generate:mates`, every puzzle verified to have a unique key move); detective cases use well-known public opening traps. No text, diagrams or exercises from the book are included. Do not commit the book or any scans of it (the `.gitignore` blocks PDFs).

## Development

```bash
npm install
npm run dev            # local dev server
npm test               # unit tests (Vitest)
npm run lint
npm run build          # type-check and production build into dist/
npm run generate:mates # rebuild the mate puzzle bank (takes several minutes)
```

Stack: React 18, TypeScript, Vite, [chess.js](https://github.com/jhlywa/chess.js) for rules and move validation, `vite-plugin-pwa` for offline support and install. The board is a dependency-free SVG component.

### Project layout

```
src/
  lib/
    squares.ts        board geometry (colours, diagonals, piece routes)
    solver.ts         forced-mate solver used to verify answers
    progress.ts       XP, ranks, streaks, unlocks (pure functions)
    modules.ts        world definitions and task factory
    exercises/        one generator per world
  components/
    Board.tsx         SVG board (normal and "blind" variants)
    TaskView.tsx      exercise UI for every answer type
  App.tsx             screens: home, session, summary, about
scripts/
  generate-mates.ts   builds the mate puzzle bank
```

## Deployment

Every push to `main` is built and published to GitHub Pages by `.github/workflows/deploy.yml`, at `https://<owner>.github.io/<repo>/`. One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. You can also run the workflow by hand from the Actions tab.

To use a custom domain later, add it under Settings → Pages and set `BASE_PATH: /` in the workflow.

## Roadmap

1. **Native app stores:** wrap the PWA with Capacitor for App Store and Google Play builds.
2. **Accounts and sync:** cloud progress so training continues across devices.
3. **Multiplayer:** head-to-head visualization duels and leaderboards.
4. **Spaced repetition:** resurface exercise types you miss most often.
