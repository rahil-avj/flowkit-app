# FlowLens User Guide

A practical walkthrough for recording, reviewing, organising, and analysing prototype sessions with FlowLens.

---

## Table of Contents

1. [How FlowLens Works](#how-flowlens-works)
2. [Session Storage — Two Tiers](#session-storage--two-tiers)
3. [Studies — Organising Sessions Into Rounds](#studies--organising-sessions-into-rounds)
4. [Recording a Session](#recording-a-session)
5. [Reviewing Sessions in the Browser](#reviewing-sessions-in-the-browser)
6. [Promoting a Session to the Library](#promoting-a-session-to-the-library)
7. [Importing / Exporting Session Files](#importing--exporting-session-files)
8. [CLI Reference — Sessions](#cli-reference--sessions)
9. [CLI Reference — Studies](#cli-reference--studies)
10. [CLI Reference — Reports](#cli-reference--reports)
11. [Reports in the Browser](#reports-in-the-browser)
12. [Folder Structure](#folder-structure)
13. [Typical Team Workflows](#typical-team-workflows)

---

## How FlowLens Works

FlowLens has two parts:

- **FlowTracer** — runs inside the prototype and records every screen visit, tap, navigation, dwell, and frustration signal in real time.
- **FlowLens Mode** — a separate analytics layer you switch into to replay sessions, inspect heatmaps, funnels, and reports.

FlowLens is included by default in this repo (`npm run dev` / `npm run build` — no
env var needed). Availability is **presence-based**: it's included whenever
`src/modes/flowlens/index.ts` exists on disk, and stripped entirely (via Rollup dead
code elimination) if that folder is removed. There is no `VITE_ENABLE_FLOWLENS`
env-var gate — a doc/comment previously suggested one existed; it did not actually
control anything and has been removed.

To exclude FlowLens from a build, delete or rename `src/modes/flowlens/` before
`npm run build`. `flowkit export` (standalone HTML export, works in every mode)
always includes FlowLens if the folder is present — there's currently no
export-time flag to exclude it separately from a regular build; remove the
folder first if you need a FlowLens-free standalone export.

Open the app, then click the **FlowLens** toggle (top-right of the canvas bar) to enter analytics mode.

---

## Session Storage — Two Tiers

Sessions exist in one of two places:

| Tier         | Location                                         | Persists in git | Visible in   |
| ------------ | ------------------------------------------------ | --------------- | ------------ |
| **Recorded** | IndexedDB (browser-local)                        | No              | Recorded tab |
| **Library**  | `workspaces/<ws>/lib/flowLens/sessions/<study>/` | Yes (committed) | Library tab  |

**Recorded** sessions are live and local — they disappear if you clear browser data.  
**Library** sessions are committed JSON files — they travel with the repo and are visible to every team member who runs the app.

The goal is always to promote worthy recorded sessions to the library.

---

## Studies — Organising Sessions Into Rounds

A **study** is a named folder that groups sessions from one testing round. Every workspace starts with `initial-study`. When you revise your flows and start a new round of testing, create a new study to keep sessions separate.

**Anatomy of studies.json:**

```json
{
  "workspace": "nClarity",
  "activeStudyId": "round-2-post-revision",
  "studies": [
    {
      "id": "initial-study",
      "name": "Initial Study",
      "status": "archived",
      "createdAt": "2026-06-01T10:00:00.000Z",
      "archivedAt": "2026-06-20T12:00:00.000Z",
      "description": "Baseline round before home screen redesign"
    },
    {
      "id": "round-2-post-revision",
      "name": "Round 2 — Post Revision",
      "status": "active",
      "createdAt": "2026-06-20T14:00:00.000Z",
      "archivedAt": null,
      "description": ""
    }
  ]
}
```

`activeStudyId` controls where new sessions land. Only one study receives new sessions at a time.

---

## Recording a Session

1. Run the dev server normally (no FlowLens flag needed for recording).
2. In the right-panel **Sessions** tab, click **Start recording**.
3. Navigate the prototype as a user would.
4. Click **Stop** to end. The session is saved to IndexedDB.

Sessions are scoped to the active workspace automatically (`meta.workspaceId`).

**Settings** — Click the **Settings** icon (⚙) before starting to configure recording options: session name template, cursor tracking sample rate, and which event channels to record (Interactions and Navigation are always on; you can toggle Effects, State changes, Simulator changes, Panel activity, etc.).

---

## Reviewing Sessions in the Browser

Switch to FlowLens mode (toggle in the canvas bar).

### Left panel — Library tab

Shows sessions committed to `workspaces/<ws>/lib/flowLens/sessions/`. Each row shows:

- Session name
- Study badge (e.g. `initial-study`)
- Date, duration, event count, quality score

Click a row to load it into the replay canvas.

### Left panel — Recorded tab

Shows sessions in IndexedDB (live recordings + imports). These are browser-local.

Click a row to select it for review. In dev mode, each row has a **save icon** (Archive) to promote it to the library.

### Right panel tabs

| Tab      | What it shows                                          |
| -------- | ------------------------------------------------------ |
| Overview | Quality breakdown, key metrics, most visited screens   |
| Timeline | Event timeline scrubber                                |
| Paths    | Navigation paths — top screens by visit count          |
| Funnel   | Flow completion rates                                  |
| Heatmap  | Cursor density on the current screen                   |

Click **View all** in any tab to open a full-screen overlay with more detail. Use the **playback bar** at the bottom to scrub or auto-play the session.

---

## Promoting a Session to the Library

### Option A — Browser (dev only)

1. Go to the **Recorded** tab.
2. Hover a session row → click the **Archive icon** (from lucide).
3. The session POSTs to `/__flowlens/save-session` (Vite dev middleware).
4. File is written to `workspaces/<ws>/lib/flowLens/sessions/<active-study>/`.
5. Vite HMR picks it up → the session appears in the **Library** tab within seconds.

### Option B — CLI

```bash
# Export from browser first (right panel → Export JSON)
flowkit sessions:import:<ws> path/to/session.json

# Target a specific study:
flowkit sessions:import:<ws> path/to/session.json --study "Round 2 — Post Revision"
```

---

## Importing / Exporting Session Files

### Import a JSON file into the browser (IndexedDB)

In the **Recorded** tab, click the **↑ Upload** button in the toolbar. Pick a `.flowkit-session.json` or `.json` file. The session appears in the list immediately.

Supports bulk import: if the JSON is an array of sessions, all are imported.

### Export a session from the browser

Select a session → right panel **Overview** tab → **Export JSON** button. Downloads a `.flowkit-session.json` file you can share or import via CLI.

### Export a committed session via CLI

```bash
flowkit sessions:export:<ws> <session-name-or-id>
# With custom destination:
flowkit sessions:export:<ws> <name> --dest ~/Desktop/
```

---

## CLI Reference — Sessions

All session commands follow the pattern `flowkit sessions:<sub>:<ws> [args]`.

| Command                                            | What it does                                     |
| -------------------------------------------------- | ------------------------------------------------ |
| `sessions:ls:<ws>`                                 | List all committed sessions                      |
| `sessions:ls:<ws> --study "<name>"`                | Filter list to one study                         |
| `sessions:import:<ws> <file>`                      | Import a JSON file to the active study           |
| `sessions:import:<ws> <file> --study "<name>"`     | Import to a specific study                       |
| `sessions:import:<ws> <file> --force`              | Overwrite if id already exists                   |
| `sessions:export:<ws> <name>`                      | Export a committed session to a file             |
| `sessions:rm:<ws> <name-or-id>`                    | Delete a committed session                       |
| `sessions:check:<ws>`                              | Validate all sessions (schema + screen ids)      |
| `sessions:stats:<ws>`                              | Quick stats: count, avg quality, completion rate |
| `sessions:sample:<ws>`                             | Generate a synthetic test session                |
| `sessions:purge:<ws> --test-only`                  | Delete all test-mode sessions                    |
| `sessions:purge:<ws> --older-than 30`              | Delete sessions older than 30 days               |
| `sessions:purge:<ws> --study "<name>" --test-only` | Purge scoped to a study                          |

---

## CLI Reference — Studies

All study commands follow `flowkit sessions:study:<action>:<ws> [args]`.

### Create a new study

```bash
flowkit sessions:study:new:<ws> "Round 2 — Post Revision"
flowkit sessions:study:new:<ws> "Round 2" --desc "After home screen redesign"
```

Creates the study folder, sets it as `activeStudyId`. Future session imports and browser promotions land here.

### List studies

```bash
flowkit sessions:study:ls:<ws>
```

Output:

```
 Studies — nClarity
 ────────────────────────────────────────────
  ○ Initial Study [archived] — initial-study · 4 sessions
  ● Round 2 — Post Revision — round-2-post-revision · 1 session
 ────────────────────────────────────────────
  Active: round-2-post-revision
```

`●` = active study (new sessions go here).  
`○` = not active.

### Get / set the active study

```bash
# Print current active study:
flowkit sessions:study:active:<ws>

# Switch active study:
flowkit sessions:study:active:<ws> "Round 2 — Post Revision"
```

### Archive a study

```bash
flowkit sessions:study:archive:<ws> "Initial Study"
# Skip the confirm prompt:
flowkit sessions:study:archive:<ws> "Initial Study" --force
```

Archiving sets `status: "archived"` and clears `activeStudyId` if it pointed here. Archived sessions remain on disk and in the library — archiving is organisational only, not destructive.

---

## CLI Reference — Reports

### Unified report command

```bash
flowkit sessions:report:<ws> [--format json|md|both] [--study "<name>"] [--agent] [--dest <path>]
```

Output lands in `workspaces/<ws>/lib/flowLens/reports/` by default (gitignored).

**Examples:**

```bash
# JSON report for all sessions:
flowkit sessions:report:nClarity

# Markdown brief for one study:
flowkit sessions:report:nClarity --format md --study "Initial Study"

# Both formats for all studies:
flowkit sessions:report:nClarity --format both

# Append markdown brief directly into .agent/project.md:
flowkit sessions:report:nClarity --format md --agent

# Write to a custom folder:
flowkit sessions:report:nClarity --format json --dest ~/reports/
```

### Legacy aliases (still work)

```bash
# Same as --format json:
flowkit lens:report:<ws>
flowkit lr:<ws>

# Same as --format md:
flowkit sessions:brief:<ws>
# Append to .agent/project.md:
flowkit sessions:brief:<ws> --append
```

### What the reports contain

**JSON report** (`flowlens-report-<ws>-<date>.json`):

- `sessionCount`, `avgQuality`, `completionRate`
- `topFrustratedScreens` — screens with the most dead taps
- `sessionList` — one record per session with id, name, quality, event count

**Markdown brief** (`flowlens-brief-<ws>-<date>.md`):

- Summary table
- Screens with highest avg dwell time
- Frustrated-click hotspots
- Drop-off screens
- Guard-blocked screens
- Suggested focus for next iteration

---

## Reports in the Browser

Click **Reports** in the right-panel header (when no session is selected) to open the full-screen Reports overlay.

The overlay loads all library + recorded sessions and provides:

- **Filter bar**: screen, device, connection, outcome, source (library/recorded), study, quality threshold, test mode toggle
- **Stats cards**: completion rate, avg quality, avg duration, frustration rate, avg screens, total events
- **Funnel chart**: screen-by-screen drop-off
- **Heatmap**: merged cursor density across sessions, per screen
- **Export cohort**: download the filtered cohort as a metrics CSV or markdown summary

Use the **Study** dropdown in the filter bar to isolate a single round of testing.

---

## Folder Structure

```
workspaces/<ws>/
  lib/
    flowLens/
      studies.json                  ← study registry (committed)
      sessions/
        initial-study/              ← one folder per study
          .gitkeep
          session-name-abc123.json
        round-2-post-revision/
          another-session-def456.json
      reports/                      ← gitignored; generated on demand
        flowlens-report-<ws>-<date>.json
        flowlens-brief-<ws>-<date>.md
  .agent/
    project.md                      ← sessions:report --agent appends here
```

Sessions are committed JSON — they travel with the repo.  
Reports are generated artifacts — they are gitignored and always reproducible.

---

## Typical Team Workflows

### Baseline testing round

```bash
# 1. Workspace already has initial-study from scaffold
flowkit sessions:study:ls:nClarity   # confirm initial-study is active

# 2. Testers record sessions in the browser
# 3. Designer exports promising sessions and imports via CLI
flowkit sessions:import:nClarity session-user1.json
flowkit sessions:import:nClarity session-user2.json

# 4. Generate brief for the team / AI agent
flowkit sessions:report:nClarity --format both --agent

# 5. Commit sessions
git add workspaces/nClarity/lib/flowLens/sessions/
git commit -m "chore: add round 1 sessions"
```

### Starting a new round after revisions

```bash
# 1. Archive the finished round
flowkit sessions:study:archive:nClarity "Initial Study"

# 2. Create the next study (becomes active automatically)
flowkit sessions:study:new:nClarity "Round 2 — Post Revision" --desc "After home screen redesign"

# 3. Import new sessions — they land in round-2-post-revision/
flowkit sessions:import:nClarity new-session.json

# 4. Compare across rounds in the browser
#    Open Reports → Study dropdown → switch between rounds
```

### Quick team handoff

```bash
# Export a specific session for a teammate who doesn't have the repo
flowkit sessions:export:nClarity "User 3 walkthrough" --dest ~/Desktop/
# Teammate imports via the Upload button in the Recorded tab
```

### Purge test sessions before a release

```bash
flowkit sessions:purge:nClarity --test-only
# Scoped to one study:
flowkit sessions:purge:nClarity --test-only --study "Round 2 — Post Revision"
```
