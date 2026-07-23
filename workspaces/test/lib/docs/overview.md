# game-zone — Project Overview

## What this is

An arcade demo: a splash/welcome intro into a hub of 6 fully-playable mini-games —
Blackjack, Dice, Tic-Tac-Toe, 2048, Memory Match, and Math Quiz. Navigation is
free/hub-and-spoke via `useAppNav()`, not flowplan-driven; flowplans layer small,
optional named journeys on top (see below). Game state (bankroll, high scores,
session tallies) persists to `db` at runtime via `useDb()`.

## File organization

```
workspace.ts                 # flows[], pageOrder{}, startPage: 'hub-screen'
flowplans/                   # defineFlow() files — one per named journey
flows/
  <flow-name>/
    <screen-name>/<ScreenName>.tsx   # default-exported component + pageMeta
lib/
  components/ui/              # shared, reused across every game screen
  game-logic/                 # pure logic, zero React — one file per game (+ deck.ts, shared)
  data/
    db.ts                    # mock db seeds — named exports become top-level db keys
    simulator.tsx            # always-visible simulator panel controls
  design-system/
    tokens.css               # additive CSS vars + keyframes, layered on platform tokens
  docs/overview.md           # this file
  assets/logo.svg            # workspace switcher-bar icon
```

Each screen lives in its own folder under its flow (`flows/<flow>/<screen>/`),
one `.tsx` file per folder, matching the platform's own convention — this is
what lets `flowkit check`/`plan:ls` discover screens and flowplan `pageId`s
by folder name. Screens import shared code via the `@workspace/lib/...` alias,
never relative `../../` paths, and only ever import `@flowkit/*` (read-only
platform code) or plain React — `db`/`navigateTo` are pulled in via hooks
(`useDb()`, `useAppNav()`), not injected as props (that's the consumer-mode
convention, not this repo-mode one).

`lib/game-logic/` is kept free of any component/JSX so each game's rules can
be reasoned about (and in principle unit-tested) independently of how they're
rendered — a game screen is mostly `useState` + calls into its matching
`lib/game-logic/<game>.ts` module, wired to shared UI from `lib/components/ui/`.

## Platform

- **Target OS:** iOS / Android
- **Primary device:** iPhone 16 Pro (393×852)
- **Form factor:** Phone-first

## Key flows

| Flow              | Screens                                                                                    | Purpose                                           |
| ----------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| intro-flow        | splash-screen → welcome-screen → hub-screen                                                | Splash intro into the game hub                    |
| tic-tac-toe-flow  | tic-tac-toe-how-to-play-screen, tic-tac-toe-game-screen                                    | 2-player pass-and-play tic-tac-toe                |
| dice-flow         | dice-how-to-play-screen, dice-game-screen                                                  | Simplified craps — come-out roll, point, resolve  |
| blackjack-flow    | blackjack-how-to-play-screen, blackjack-game-screen                                        | Blackjack vs. dealer — soft/hard aces, 3:2 payout |
| 2048-flow         | 2048-how-to-play-screen, 2048-game-screen, 2048-high-scores-screen                         | Slide-and-merge puzzle, best score persists       |
| memory-match-flow | memory-match-how-to-play-screen, memory-match-game-screen, memory-match-high-scores-screen | 4×4 pair-matching, best moves/time persist        |
| math-quiz-flow    | math-quiz-difficulty-screen, math-quiz-game-screen, math-quiz-how-to-play-screen           | Speed math with scaling difficulty and streaks    |

Hub navigation (`hub-screen`) links to each game directly — the flows above are
organizational groupings of screens, not required playback paths.

## Named journeys (flowplans)

Small, optional journeys layered on top of the free-navigation screens above —
useful for guided demos/reviewers, never required for the app to function:

| Flowplan                          | Path                                                     |
| --------------------------------- | -------------------------------------------------------- |
| `intro-flow`                      | splash → welcome → hub                                   |
| `journey-play-tic-tac-toe`        | hub → Tic-Tac-Toe → places a mark                        |
| `journey-check-memory-high-score` | hub → Memory Match → high scores screen                  |
| `journey-play-2048-to-a-win`      | hub → 2048 → slides a tile                               |
| `journey-place-a-bet-blackjack`   | hub → Blackjack → deal → forks on win/lose → deals again |

`journey-place-a-bet-blackjack` is the one flowplan with `simulator.controls`
(a bankroll `count` control, a `dice.forcedRoll` `select` control) and `forks[]`
branching on the hand's outcome — every other journey is a plain linear `steps[]`.

## Mock data

Seed data lives in `lib/data/db.ts`. Named exports become top-level `db` keys:
`user`, `blackjack` (bankroll), `dice` (bankroll, forcedRoll), `ticTacToe`
(sessionTally), `mathQuiz` (difficulty). `twentyFortyEight.best`,
`memoryMatch.bestMoves`/`bestTimeMs`, `mathQuiz.score`, and any `highScores.*`
path are deliberately **not** seeded — the 2048 and Memory Match high-scores
screens gate on `db.has(...)` for those paths, so they must stay absent until
the player's first game writes them via `db.update()`.

Simulator controls for mutating data at runtime are in `lib/data/simulator.tsx`.

Screens read/write `db` via `const db = useDb()` (`get`/`set`/`has`/`remove`/
`update`/`reset`) from `@flowkit-shared/utils` — never raw `updateDb`.

## Game logic

Pure logic (zero React/JSX), one module per game, in `lib/game-logic/`:
`deck.ts` (shared: shuffle/deal/hand-value for Blackjack), `blackjack.ts`,
`dice.ts`, `ticTacToe.ts`, `twentyFortyEight.ts`, `memoryMatch.ts`, `mathQuiz.ts`.

## Design system

Tokens live in `lib/design-system/tokens.css` — additive on top of the
platform's `bg-theme-*`/`text-theme-*` vocabulary: card suits, felt green,
dice pips, the 2048 tile ramp, memory card back, plus the `card-deal-in` and
`result-banner-in` keyframes used by Blackjack's card and hand-result
animations.

Shared UI components in `lib/components/ui/` (10 total, built once in Phase 0,
reused by every game — do not recreate a one-off version inline):

| Component          | Purpose                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `PrimaryButton`    | Every CTA (Deal, Play Again, Confirm, Start Playing, Exit to Hub)                                           |
| `IconButton`       | Header back/utility buttons (back, how-to-play, high-scores)                                                |
| `SectionHeader`    | Consistent header bar for how-to-play/high-scores/difficulty screens                                        |
| `GameCard`         | Hub grid — one per game                                                                                     |
| `Grid`             | Generic `columns` grid — hub, Tic-Tac-Toe board, 2048 board                                                 |
| `ScoreBadge`       | Bankroll/score/streak/best displays across every game                                                       |
| `GameOverModal`    | End-state overlay (board stays visible behind it); optional `primaryLabel` override (2048's "Keep Playing") |
| `PlayingCard`      | Blackjack hands — flip animation (face-down→up) + staggered deal-in                                         |
| `HowToPlayList`    | Numbered rules list on every how-to-play screen                                                             |
| `DifficultyPicker` | Math Quiz's easy/medium/hard segmented control                                                              |

Blackjack is a deliberate exception to `GameOverModal`: per-hand outcomes show
an inline result banner (win/lose/push + payout) instead of a full-screen
modal, since a modal on every single hand was too interruptive for repeated
play — the end-of-hand controls are just "Deal (again)" or "Exit to Hub", no
separate confirmation screen.

## Scaffold commands

```
flowkit create:screen --flow:<flow> --name:<screen>   # add a screen
flowkit create:flow --name:<flow>                     # add a flow
flowkit create:component --name:<Name> --path:lib/components/ui
flowkit add:step --flowplan:<id> --screen:<pageId> --action:"description"
```
