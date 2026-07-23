# Arcade Demo — Sprint Plan (repo-mode build in `workspaces/game-zone`)

## Context

The scaffolded demo content (`scripts/helpers/workspace-template.js`) that ships with
`create-flowkit-app`/`create-flowkit-workspace` is a generic 5-screen onboarding+home demo.
The goal is to replace it with a genuinely fun, complete arcade demo — a splash/welcome
intro into a hub of 6 fully-playable, correctly-implemented mini-games (Blackjack, Dice,
Tic-Tac-Toe, 2048, Memory Match, Math Quiz) — with proper reusable components and real
design tokens instead of inline hex codes.

Per explicit direction this turn: **build and test the whole thing in this repo's existing
`workspaces/game-zone/` first** (repo mode), not directly in the consumer-mode scaffolder.
This lets us use `npm run dev` to actually click through every game before it's ever ported
to `workspace-template.js` — and it turns out repo mode is strictly more capable for this:

- **`useAppNav().navigateTo(id)`** (confirmed in `src/shared/utils/useAppNav.ts`) works
  unconditionally, standalone or in-flow, no flowplan required — true hub-and-spoke free
  navigation, exactly what an arcade needs. No "umbrella flowplan" workaround needed.
- **`useDb()`** (`@flowkit-shared/utils/useDb`, wrapping `src/shared/contexts/
DashboardContext.tsx`'s `updateDb`) is the one `db` API every game screen uses — a real,
  general-purpose, guarded read/write suite. Screens can genuinely persist high
  scores/bankroll to `db`, any time, not gated by flow playback. (This is the one place repo
  mode and consumer mode diverge hard: consumer mode's `defineFlow` steps can only apply
  static, one-shot `DotPathPatch` literals, never live writes — confirmed via
  `applyDotPathPatch.ts` and `FlowPlaybackContext.tsx`. That gap becomes an explicit,
  disclosed constraint only when we later port this to `workspace-template.js` — not a
  concern for this phase.) See the `db` mutation bullet further down for the concrete API.

Flowplans in this phase are exactly what you described: **small, named, optional journeys**
("Play Tic-Tac-Toe", "Check high score in Memory Match", "Place a bet in Blackjack") layered
on top of screens that already navigate themselves via `useAppNav()` — never the thing that
drives navigation. This matches the existing convention already generated into
`workspaces/game-zone/flows/onboarding-flow/welcome-screen/WelcomeScreen.tsx` (uses
`useAppNav()`, and its button carries both the flowplan-matching `id="get-started"` _and_
a real `onClick={() => navigateTo(...)}` — works with or without a flowplan active).

`workspaces/game-zone` is currently an untouched stock scaffold (confirmed: 5 demo screens,
2 flowplans, empty `tokens.css`, empty `.agent/project.md`) — a clean slate we build into.

---

## Verified platform facts this plan depends on

- **Screen anatomy** (repo mode): default-exported component, no required props (unlike
  consumer mode's `PageProps`) — reads/writes data via `const db = useDb()`
  (`get`/`set`/`has`/`remove`/`update`/`reset`), navigates via `const { navigateTo } =
useAppNav()`. `pageMeta` export: `{ label?, desc?, canEnter?, canNotEnter?, tags?, ... }`
  (`PageMeta`, `src/types/index.ts`).
- **Path aliases** (this workspace's own generated `CLAUDE.md`): `@flowkit/` → `src/`
  (read-only, never edit), `@workspace/` → `workspaces/game-zone/` (this workspace root).
  Screens import shared code as `@workspace/lib/components/...`, never relative `../../`.
- **Styling**: `bg-theme-*`/`text-theme-*`/`shadow-theme-*` Tailwind classes are already
  live platform-wide (defined in `src/index.css`'s `@theme` block, confirmed exhaustively:
  full neutral/primary/warning/success scales, `text-ui-2xs..xl`, `shadow-card/device/float`,
  all `--color-theme-*` runtime aliases). `workspaces/game-zone/lib/design-system/tokens.css`
  is an **additive** layer for tokens the platform doesn't already cover (card suits, 2048
  tile ramp, felt green, dice pip color) — a plain `:root {}` block (not `@theme{}` — this
  file is injected as a second `<style>` tag at runtime via `loadWorkspaceTokens()`, never
  scanned into Tailwind's own `@theme` merge).
- **Flowplan step gating** (`src/core/layout/FlowMaster.tsx`): a step's `on` field must match
  a **real DOM `id`** on the tappable element (confirmed bug in the current stock
  `WelcomeScreen` template scaffolder output — missing there, but done correctly in this
  workspace's own generated screens, e.g. `id="get-started"`). Every new screen's
  navigation-out elements should carry a real `id` even when built primarily for
  `useAppNav()`, so they _also_ work inside any named flowplan journey for free.
- **`db` mutation — every game screen uses `useDb()`, never raw `updateDb`.**
  `@flowkit-shared/utils/useDb` (built on `dbHelpers.ts`, documented in full in
  `changelog-db.md` at the repo root) is a small, safe, `Map`-like verb suite:
  `const db = useDb()` gives `db.get(path, fallback?)`, `db.set(path, value)`,
  `db.has(path)`, `db.remove(path)`, `db.update(path, fn)` (read-modify-write — the right
  one for bankroll/score increments and keep-max/keep-min high scores), and `db.reset()`.
  All six auto-create missing intermediate paths and reject `__proto__`/`prototype`/
  `constructor` keys by throwing, rather than silently corrupting or crashing. Example —
  blackjack's bankroll: `db.update('blackjack.bankroll', (v = 500) => v - bet)`. Writes are
  real and persist across navigation within a session (unlike consumer mode, where a
  flowplan step can only apply a static, one-shot patch).
- **Component/logic reuse**: `lib/components/{ui,forms,layout,navigation}/` is the existing
  convention (already scaffolded, empty). `lib/game-logic/` (new) holds pure game-logic
  modules with zero React/JSX — safe to colocate anything, but keeping logic separate from
  components keeps each game's screen thin and testable in isolation. Import `useDb()`
  directly from `@flowkit-shared/utils` in each screen — no local re-export needed.

---

## Design language (Phase 0 — before any game logic)

An arcade needs a distinct visual identity beyond generic platform chrome — this is the
"design tokens instead of inline hex codes" part of the ask. New tokens go in
`workspaces/game-zone/lib/design-system/tokens.css`, layered on top of (never replacing)
the existing `bg-theme-*` vocabulary:

```css
:root {
  /* Playing cards */
  --card-suit-red: #d92d2d;
  --card-suit-black: #1a1a1a;
  --card-back: #1e3a5f;
  --card-face-bg: #fdfdfb;

  /* Game table / felt */
  --table-felt: #0b6e4f;
  --table-felt-dark: #08543c;

  /* Dice */
  --dice-face: #f5f5f0;
  --dice-pip: #1a1a1a;

  /* 2048 tile value ramp */
  --tile-2: #eee4da;
  --tile-4: #ede0c8;
  --tile-8: #f2b179;
  --tile-16: #f59563;
  --tile-32: #f67c5f;
  --tile-64: #f65e3b;
  --tile-128: #edcf72;
  --tile-256: #edcc61;
  --tile-512: #edc850;
  --tile-1024: #edc53f;
  --tile-2048: #edc22e;
  --tile-super: #3c3a32;
  --tile-text-light: #f9f6f2;
  --tile-text-dark: #776e65;

  /* Memory match */
  --memory-card-back: #4a3f8f;
}
```

Consumed via Tailwind v4 arbitrary-value classes (`bg-[var(--tile-2)]`) or inline
`style={{}}` where the value is computed at runtime (e.g. tile color keyed by numeric
value) — never a raw hex literal in JSX.

**Shared components** (`lib/components/ui/` unless noted), built once, reused by every game:

| Component          | Props (sketch)                                                      | Used by                                                                                                          |
| ------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `PrimaryButton`    | `id?, onClick?, children, disabled?, variant?: 'default'\|'danger'` | Every CTA (Play, Play Again, Confirm Bet, Back)                                                                  |
| `IconButton`       | `id?, onClick?, icon, label`                                        | Back buttons, header icons                                                                                       |
| `SectionHeader`    | `title, onBack?, backId?`                                           | Consistent header bar (extracted from the repeated inline markup in the current stock Setup/Home/Detail screens) |
| `GameCard`         | `id, title, icon, blurb, onClick?`                                  | Hub grid — one per game                                                                                          |
| `Grid<T>`          | `items, columns, renderItem, gap?`                                  | Hub grid, Memory grid, 2048 grid, Tic-Tac-Toe grid                                                               |
| `ScoreBadge`       | `label, value, tone?`                                               | Bankroll, score, streak displays across all games                                                                |
| `GameOverModal`    | `open, title, message, onPlayAgain?, onBackToHub?`                  | Every game's end-state (in-screen overlay, board stays visible behind it)                                        |
| `PlayingCard`      | `card: {rank, suit}, faceDown?`                                     | Blackjack hands                                                                                                  |
| `HowToPlayList`    | `steps: string[]`                                                   | Every how-to-play screen                                                                                         |
| `DifficultyPicker` | `value, onSelect?`                                                  | Math Quiz                                                                                                        |

**Verification for Phase 0**: a throwaway `/design-check` screen rendering one of every
component with placeholder data, viewed via `npm run dev` — confirms tokens + components
compile and look right before any game logic depends on them. Deleted once every game is done.

---

## Game logic reference (already researched, ready to implement — no further research needed)

- **Blackjack**: 52-card deck, ace = 11-or-1 (soft/hard), dealer hits until hard-17+,
  bust > 21, blackjack (natural 21) pays out distinctly, push on tie.
- **Dice** (simplified craps): come-out roll — 7/11 wins, 2/3/12 loses, else establish
  point and re-roll until point (win) or 7 ("seven-out", lose).
- **Tic-Tac-Toe**: 3×3 flat array, 8 win-lines (3 rows, 3 cols, 2 diagonals), draw when
  full with no winner. Local 2-player pass-and-play (simplest to get fully correct — no AI
  needed this pass; flagged as an open question below, not silently built as vs-AI).
- **2048**: 4×4 grid, spawn 2 (90%) or 4 (10%) in a random empty cell per move, slide+merge
  toward the swipe direction (each tile merges at most once per move), win at a 2048 tile
  (offer "keep playing"), lose when no empty cells and no adjacent equal-value merge exists
  in any direction.
- **Memory Match**: grid of paired cards (start fixed at 4×4 = 8 pairs), flip one, flip a
  second, check match; non-matches auto-flip back after a short delay (`setTimeout`, cleaned
  up on unmount); win when all pairs matched. Track moves + elapsed time.
- **Math Quiz**: generate an equation whose length/operator mix scales with difficulty
  (easy: 1 operator, small numbers → hard: 3-4 operators including clean division). Generate
  3 wrong answers as `round(correct * (1 + offsetPct))` for varied offsets, with an explicit
  **dedupe/collision guard** (reject a candidate equal to the correct answer or to an
  already-chosen wrong answer, retry with a new offset) and a **zero-guard** (if
  `correctAnswer === 0`, percentage offsets all degenerate to 0 — fall back to fixed additive
  offsets like ±1/±2/±3 in that case).

### Platform-feature coverage — deliberately incorporated, not just games

An audit of `src/` against this plan (full method: a broad Explore-agent sweep of every
flowplan/screen/theming feature, cross-checked by hand against the actual source for the
two claims that mattered most) found the plan was on track to skip several real,
screen-author-facing platform features entirely — not because they don't fit, but because
nothing in a straightforward "6 games + a hub" build naturally reaches for them. Four are
confirmed genuinely useful here and are folded in below; several others (hotspots, autoPlay,
`FlowplanRef` composition, A/B screen variants) were checked and are real but don't fit an
interactive game demo, so they're deliberately left out. **Also checked and confirmed NOT a
gap at all**: `colorBlindMode`/`blurryVision` (simulator accessibility filters) are applied
automatically as a canvas-level CSS filter over any screen — no author-side code needed,
already "working" for every screen in this plan with zero changes.

1. **`canEnter` screen guards** (`PageMeta`, `src/types/index.ts`): both **2048's** and
   **Memory Match's** `high-scores` screens gate on having played at least once —
   `canEnter: ({ db }) => db.has('highScores.twentyFortyEight')` /
   `db.has('highScores.memoryMatch.bestMoves')` respectively. Sidebar shows a lock icon
   until the player's first game writes that path via `db.update()`. No artificial
   gameplay-progression logic invented elsewhere — this is the one place a "have you done
   X yet" gate is a natural fit.
2. **`simulator.controls`** (`SimulatorControl[]` on a flowplan): the Blackjack bet-journey
   flowplan (`journey-place-a-bet-blackjack.ts`, built in Phase 8 alongside the other named
   journeys) declares two — a `count` control bound to `blackjack.bankroll` (reviewer can
   bump the bankroll live during a demo) and a `select` control bound to `dice.forcedRoll`
   (`'none'` plus every value 2–12) that the Dice game's roll logic checks first, if set,
   instead of a real random roll — a concrete, demoable "force a specific outcome" reviewer
   control.
3. **Screen `tags`** (`PageMeta.tags`): every game's `game-view` screen gets a one-word
   category tag for Screens-tab filtering — `['type:card']` (Blackjack), `['type:dice']`
   (Dice), `['type:strategy']` (Tic-Tac-Toe), `['type:puzzle']` (2048), `['type:memory']`
   (Memory Match), `['type:trivia']` (Math Quiz). Near-zero cost, real organizational value.
4. **Flowplan `forks[]`**: the Blackjack bet-journey flowplan forks on the hand's outcome
   after it resolves — a `win` branch and a `lose` branch, each with its own `actionNote`
   narrating the moment, both `mergesTo: 'next'` rejoining at a shared "hand settled" step.
   This is the one flowplan in the whole plan that exercises conditional branching; every
   other named journey stays a plain linear `steps[]`.

State shapes (all screen-local `useState`, persisted fields also mirrored to `db` via
`useDb()` where noted — `db.set()` for a plain seed-once/overwrite value, `db.update()` for
anything read-modify-write like a running bankroll or a keep-max high score):

```
Blackjack:   { deck, playerHand, dealerHand, bet, bankroll (↔ db.update, +/- per hand), phase, result }
Dice:        { phase, point, lastRoll, bankroll (↔ db.update, +/- per roll), result, rollHistory }
TicTacToe:   { board, currentPlayer, result (derived), sessionTally (↔ db.update, optional) }
2048:        { grid, score, best (↔ db.update, keep-max: (v = 0) => Math.max(v, score)), gameOver, won, continuedPastWin }
MemoryMatch: { cards, selected, moves, matchCount, gameOver, elapsedMs, bestMoves (↔ db.update, keep-min), bestTimeMs (↔ db.update, keep-min) }
MathQuiz:    { difficulty (↔ db.set/db.get), equation, correctAnswer, options, selected, isCorrect, round, streak, score (↔ db.update, best only) }
```

---

## File structure (`workspaces/game-zone/`)

```
workspace.ts                       # flows: [...], startPage: 'splash'
flowplans/
  intro-flow.ts                    # splash → welcome → hub (replaces onboarding-flow.ts)
  journey-play-tic-tac-toe.ts
  journey-check-memory-high-score.ts
  journey-place-a-bet-blackjack.ts
  journey-play-2048-to-a-win.ts
flows/
  intro-flow/
    splash-screen/SplashScreen.tsx
    welcome-screen/WelcomeScreen.tsx        # repurposed from stock
    hub-screen/HubScreen.tsx
  blackjack-flow/
    blackjack-game-screen/BlackjackGameScreen.tsx
    blackjack-how-to-play-screen/BlackjackHowToPlayScreen.tsx
  dice-flow/
    dice-game-screen/DiceGameScreen.tsx
    dice-how-to-play-screen/DiceHowToPlayScreen.tsx
  tic-tac-toe-flow/
    tic-tac-toe-game-screen/TicTacToeGameScreen.tsx
    tic-tac-toe-how-to-play-screen/TicTacToeHowToPlayScreen.tsx
  2048-flow/
    2048-game-screen/TwentyFortyEightGameScreen.tsx
    2048-high-scores-screen/TwentyFortyEightHighScoresScreen.tsx
    2048-how-to-play-screen/TwentyFortyEightHowToPlayScreen.tsx
  memory-match-flow/
    memory-match-game-screen/MemoryMatchGameScreen.tsx
    memory-match-high-scores-screen/MemoryMatchHighScoresScreen.tsx
    memory-match-how-to-play-screen/MemoryMatchHowToPlayScreen.tsx
  math-quiz-flow/
    math-quiz-difficulty-screen/MathQuizDifficultyScreen.tsx
    math-quiz-game-screen/MathQuizGameScreen.tsx
    math-quiz-how-to-play-screen/MathQuizHowToPlayScreen.tsx
lib/
  components/ui/           # PrimaryButton, IconButton, SectionHeader, GameCard, Grid,
                            # ScoreBadge, GameOverModal, PlayingCard, HowToPlayList,
                            # DifficultyPicker
  game-logic/
    deck.ts                # shuffle/deal/hand-value (shared: Blackjack)
    blackjack.ts
    dice.ts
    ticTacToe.ts
    twentyFortyEight.ts
    memoryMatch.ts
    mathQuiz.ts
  data/db.ts                # blackjack, dice, twentyFortyEight, memoryMatch, mathQuiz seeds
  design-system/tokens.css   # Phase 0 tokens above
```

Old stock screens/flowplans (`onboarding-flow`, `home-flow`, Setup/Ready/Home/Detail
screens) are deleted as each is superseded — `SplashScreen`/`WelcomeScreen`/`HubScreen`
replace the onboarding trio + Home, `DetailScreen` and its `db.items` seed are removed
entirely (no longer relevant to an arcade).

---

## Sprint phases (build order — each phase ends in a runnable, clickable state)

**Phase 0 — Design language & shared components.** Tokens + all 10 shared components +
final `db.ts` shape. Verify via a throwaway screen, then delete it.

**Phase 1 — App shell.** `SplashScreen` (auto-advance), `WelcomeScreen` (Play button, repurposed
from stock), `HubScreen` (grid of `GameCard`s via `useAppNav().navigateTo(...)`, using
placeholder `onClick`s pointing at not-yet-built screens is fine since `navigateTo` only
fails at click-time, not build-time). `intro-flow.ts` flowplan wired alongside. Confirms the
free-navigation shell works before any game exists.

**Phase 2 — Tic-Tac-Toe** (simplest: no deck, no timers, no percentage math). Proves the
"useState game, GameOverModal, ScoreBadge, real navigation-out `id`" pattern once, cleanly,
before repeating it 5 more times. Wire the hub's card to it.

**Phase 3 — Dice.** Next-simplest state machine; introduces the `bankroll ↔ db` persistence
pattern via `useDb().update()`. Roll logic should check `db.get('dice.forcedRoll')` first
(falling back to a real random roll when unset/`'none'`) even though nothing sets that path
until Phase 8's `simulator.controls` wiring — cheap to leave the check in from the start
rather than retrofit it later.

**Phase 4 — Blackjack.** Reuses `deck.ts`; full soft/hard ace handling, dealer AI, bet
flow — highest logic complexity, tackled once simpler patterns are proven.

**Phase 5 — 2048.** Grid slide/merge correctness, spawn RNG, first screen needing the
high-scores pattern (`best` in `db`, a dedicated high-scores screen reading it live —
this genuinely updates in repo mode, unlike the future consumer-mode port). Add its
`canEnter` guard here (gate on `db.has('highScores.twentyFortyEight')`) and its `tags:
['type:puzzle']` — both are one-line `pageMeta` additions, no reason to defer them.

**Phase 6 — Memory Match.** Reuses the high-scores pattern from 2048; adds flip-delay
timer cleanup and move/time tracking. Same one-line additions: `canEnter` guard on
`db.has('highScores.memoryMatch.bestMoves')`, `tags: ['type:memory']`.

**Phase 7 — Math Quiz.** Built last — its wrong-answer dedupe/collision + zero-guard logic
is a self-contained algorithmic unit best tackled once every reusable UI piece (modal,
badge, difficulty picker) already exists to assemble around it.

**Phase 8 — Named journey flowplans.** `journey-play-tic-tac-toe.ts`,
`journey-check-memory-high-score.ts`, `journey-place-a-bet-blackjack.ts`,
`journey-play-2048-to-a-win.ts` — built last since they reference final screen/element ids.
Each is a short, optional, additive `defineFlow`, never required for the app to function.
`journey-place-a-bet-blackjack.ts` is the one that carries the extra platform-coverage work
from this phase: its `simulator: { controls: [...] }` field declares the bankroll `count`
control and the dice `forcedRoll` `select` control (see "Platform-feature coverage" above),
and its `steps[]` forks on the hand's win/lose outcome instead of staying purely linear like
the other three journeys. Also add each remaining game-view screen's `tags` (`type:card`,
`type:dice`, `type:strategy`, `type:trivia`) here if not already added during its own phase
— convenient to batch the ones that don't have a natural earlier phase.

**Phase 9 — Full playthrough pass.** `npm run dev`, click every path: splash → welcome →
hub → each of the 6 games → back to hub → a different game → high-scores screens showing
real persisted values → each named flowplan via the Flow Library. Fix anything broken.

**(Later, separate task, not this sprint)**: port the proven repo-mode build into
`scripts/helpers/workspace-template.js` for the consumer-mode scaffolder, adapting to that
mode's constraints (props instead of hooks, static `db` seeds instead of live persistence,
the umbrella-flowplan-for-navigation workaround) — explicitly deferred per this turn's
instruction to test here first.

---

## Open questions (flagging, not silently deciding)

1. **Tic-Tac-Toe**: local 2-player pass-and-play (recommended — simplest to build fully
   correct) vs. an AI opponent. Building 2-player-only for Phase 2 unless you say otherwise.
2. **Memory Match grid size**: fixed 4×4 for the base build (recommended) vs. a
   settings-driven size picker. Repo mode _can_ support a real settings screen (unlike
   consumer mode) since `useDb().set()` is a real write — so this is more open here than it
   will be later; still recommend starting fixed and adding a picker only if it feels thin.
3. Should `workspaces/game-zone`'s existing empty `.agent/project.md` be filled in with the
   arcade's product brief as part of Phase 0 (hand-owned, never auto-regenerated — a good
   place to record "this is a demo arcade app, 6 games, X/Y decisions") — recommend yes,
   small effort, keeps the workspace's own docs coherent with what's actually built.

---

## Verification

- `npm run dev` after each phase — the project already has an active workspace
  (`game-zone`), so `npm run build`'s virtual-module gate is satisfied throughout.
- `npx tsc --noEmit` (or the repo's `tsc -b`) after each phase to catch type errors early
  given the volume of new files.
- `flowkit check` (or `flowkit check:screens`/`check:flowplans`) periodically to catch
  authoring mistakes (missing `pageMeta`, broken flowplan references) before they compound.
- Final Phase 9 pass is a real, manual click-through — no automated test replaces actually
  playing all 6 games end-to-end once.

### Critical files

- `/Users/mac/Documents/flowkit-app/workspaces/game-zone/` — everything built lives here
- `/Users/mac/Documents/flowkit-app/src/shared/utils/useAppNav.ts` — navigation primitive
- `/Users/mac/Documents/flowkit-app/src/shared/utils/useDb.ts` — **the `db` API every game screen should actually use** (`get`/`set`/`has`/`remove`/`update`/`reset`), not raw `updateDb`
- `/Users/mac/Documents/flowkit-app/src/shared/utils/dbHelpers.ts` — the underlying pure logic behind `useDb()`, if you need to see exactly what each verb does
- `/Users/mac/Documents/flowkit-app/src/shared/contexts/DashboardContext.tsx` — `db`/`updateDb`, the lower-level primitive `useDb()` wraps
- `/Users/mac/Documents/flowkit-app/src/types/index.ts` — `PageMeta`, `FlowStep`, `SimulatorControl`
- `/Users/mac/Documents/flowkit-app/src/index.css` — existing token vocabulary to build on top of
- `/Users/mac/Documents/flowkit-app/changelog-db.md` — full history of the `db.*` helper consolidation, in case a game screen's write behaves unexpectedly and you need the "why" behind the guard/auto-create rules
