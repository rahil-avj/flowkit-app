# _trackerTim/docs — condensed FlowKit planning source

Condensed from `flowkit-app/Documentation/project-plans/` and `flowkit-app/Documentation/product/`
on 2026-07-02, with every status claim re-verified against the live codebase (not just the docs).
This is the source-of-truth snapshot the future tracker app will read/render — nothing here should
be trusted as "currently true" without re-verifying against code once more time has passed.

## Files

- **`features.md`** — the single master feature/task list, one row per trackable item, condensed
  from `FEATURES.md` + all 4 subsystem trackers + the two execution docs (npm checklist,
  pre-launch runbook) + the flat-mode to-do. This is the file a tracker app should treat as its
  primary data source.
- **`specs.md`** — condensed FRDs/specs (canvas viewer/canvas mode, FlowLens ReportsOverlay revamp,
  Flowaid onboarding) — kept separate from `features.md` because they're design documents, not
  task rows, but each spec is linked from its corresponding feature row.
- **`decisions.md`** — condensed architectural decision log, pulled from the 4 trackers' "Decision
  Log" sections. Append-only in the originals; kept as one merged, de-duplicated, chronological
  list here.
- **`vision.md`** — condensed product vision/north-star + persona/user-stories summary (source:
  `product/vision/VISION.md`, `product/features-by-persona.md`, `product/user-stories.md`).
- **`verification-log.md`** — the specific claims checked against live code on 2026-07-02, and
  what was found. Read this first if a status in `features.md` looks surprising — it explains
  which numbers are "as documented" vs. "corrected after checking code."

## How this stays useful

Docs rot the moment code moves. Every status field in `features.md` has a `verified` column —
`2026-07-02` means it was code-checked on that date, blank means it's carried over from the source
doc unverified. Re-run spot checks before trusting a stale `verified` date for anything you're
about to act on.
