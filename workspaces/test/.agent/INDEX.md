# INDEX — test

The map. Find your task, go straight to the action — no blind search.
Read order for a cold start: **rules.md → this INDEX → platform.md** (depth only when a row points there).

| Task                             | Action                                                                     | Detail                                            |
| -------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| Understand the platform fast     | read `.agent/rules.md` then this INDEX                                     | Documentation/FLOWKIT.md                          |
| Add a flow + screens             | create folder `flowBook/<F>/<Screen>/` + `<Screen>.tsx`                    | platform.md → CLI                                 |
| Add a screen to an existing flow | create `flowBook/<F>/<S>/<S>.tsx`                                          | platform.md → CLI                                 |
| Wire a tap / interaction         | add `interactions` map in the flowplan step (`flowStories/<f>.ts`)         | platform.md → Flows · Documentation/FLOWMASTER.md |
| Navigate programmatically        | `useNav()`                                                                 | platform.md → Navigation                          |
| Read or change data              | `useDb()` → `get`/`has`/`set`/`remove`/`update`                            | platform.md → Data                                |
| Gate a screen (access guard)     | `canEnter` / `canNotEnter` in `pageMeta` (exported from the screen `.tsx`) | platform.md → Guards                              |
| Reorder chapters                 | edit `workspace.ts` → `chapters[]`, or use **Manage tab** in right panel   | platform.md → Flows                               |
| Style with the active kit        | Tailwind + tokens.css / `useTheme()`                                       | platform.md → Styling & kit                       |
| Add a reviewer toggle            | edit `data/simulator.tsx`                                                  | platform.md → Simulator                           |
| Record / replay sessions         | always-on recorder; `flowkit sessions:*`                                   | Documentation/FLOWLENS.md                         |
| Full CLI reference               | `flowkit help`                                                             | Documentation/CLI.md                              |
| What this product IS             | read `.agent/project.md`                                                   | project.md (hand-owned)                           |

Detail lives in `.agent/platform.md` and `/Documentation/*.md`. Product specifics live in `.agent/project.md`.

_Generated (spec v4) — `flowkit agent:sync` to refresh._
