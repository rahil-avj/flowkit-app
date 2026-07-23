# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Overview

This release replaces FlowKit's fixed-depth, filename-driven screen-authoring model with a variable-depth, folder-driven identity system, and renames the platform's core vocabulary from Flow/Screen to Chapter/Page. It also fixes several silent-failure and silent-collision bugs uncovered while building the new system.

---

### Added

- **Variable-depth page folders.** A page can now live at `flowBook/<chapter>/.../<page>/<File>.tsx` with any number of organizational folders in between — not just the previous fixed two levels. The first folder is always the chapter id; the last folder is always the page id; everything in between is cosmetic and ignored for identity, but preserved for display.
  - A file with no chapter/page folder at all (`flowBook/File.tsx`) now falls back to chapter id `"misc"`, with the page id derived from the filename.
- **Collision-proof composite page ids.** Page ids are now `${chapterId}-${pageId}` (e.g. `onboarding-welcome`), computed by the new shared `makePageId()` function. This closes a real bug where two different chapters each containing a same-named page folder (e.g. both having a `confirm/` folder) would silently collide into a single merged record, with whichever one "won" determined by nondeterministic filesystem/glob iteration order.
- **`_` / `__` filename-prefix visibility system.**
  - A single `_` prefix on a file or folder marks it **Hidden** — fully real, parsed, compiled, checked, playable, and referenceable by flowplans, but excluded from the default Pages-tab browsing UI. A settings toggle can reveal hidden items.
  - A double `__` prefix marks it **practically non-existent** — excluded from parsing, `check:*` validation, flowplan reference resolution, and `flowkit status` counts.
  - Parent-dominance applies at any nesting depth: any `__` ancestor makes the whole subtree non-existent regardless of what's inside it; otherwise any `_` ancestor makes it hidden.
  - New `flowkit list:pages` flags: `--hidden` (include hidden pages), `--gone` (list only non-existent items — the only way to find them, since they're excluded everywhere else by default), `--all` (show every tier, labeled).
- **`screen/ambiguous-folder` → `page/ambiguous-folder` check rule.** When a page folder contains two or more unprefixed candidate component files, the alphabetically-first file is deterministically chosen as the real page, and a new non-blocking warning is raised (never fails the build). The finding is marked `requiresAcknowledgment: true` and surfaced in a distinct, boxed section of the check report output, separate from the normal flat findings list.
- **Per-page `screenMeta`/`pageMeta.annotations` field.** Annotation badges (the ephemeral review markers shown in the Pages panel) are now declared directly on the screen they apply to, replacing the retired workspace-level `_tags.ts` sidecar file.
- **`.variant-<serial>.tsx` / `.v-<serial>.tsx` variant suffix.** Replaces the old `.variant.<serial>.tsx` form. Both the long form and the shorthand are accepted and equivalent; the serial is captured greedily so hyphenated serials (e.g. `red-theme`) parse correctly.
- **Shared, dependency-free identity module** (`src/shared/utils/screenPathIdentity.js`) — the single source of truth for path parsing, visibility resolution, variant parsing, and composite id construction, used identically by both repo mode (`useWorkspaceHierarchy.ts`, browser/Vite-glob context) and flat mode (`vite-plugin.js`, Node build-time context). Eliminates the previous divergence where flat mode had none of repo mode's filtering (no suffix check, no `_`/`__` handling, no variant parsing, no depth limit).
- `CHANGELOG.md` (this file).

### Changed

#### Directory renames (sequential)

- `flows/` → `flowDesigns/` → **`flowBook/`** (final name)
- `flowplans/` → `flowPaths/` → **`flowStories/`** (final name)

Each rename was centralized behind a single constant in `scripts/helpers/config-filenames.js` (`FLOW_BOOK_DIRNAME`, `FLOW_STORIES_DIRNAME`), so the directory name is defined in exactly one place.

#### Vocabulary rename: Screen → Page, Flow → Chapter

The platform's core vocabulary has changed. A **Flow** (a grouping of screens) is now a **Chapter**; a **Screen** (one component file/folder) is now a **Page**.

- **CLI verbs:**
  | Old | New |
  |---|---|
  | `create:screen` | `create:page` |
  | `remove:screen` | `remove:page` |
  | `rename:screen` | `rename:page` |
  | `move:screen` | `move:page` |
  | `list:screens` | `list:pages` |
  | `screen:info` | `page:info` |
  | `create:flow` | `create:chapter` |
  | `remove:flow` | `remove:chapter` |
  | `list:flows` | `list:chapters` |
  | `promote:flow` | `promote:chapter` |

  Flowplan-domain verbs are **unaffected**: `create:flowplan`, `remove:flowplan`, `add:step`, `remove:step`, `list:steps`, `flowplan:info`, `check:flowplans`, `plan:ls`.

- **Check domains and rule ids:**
  | Old | New |
  |---|---|
  | `check:screens` | `check:pages` |
  | `screen/ambiguous-folder` | `page/ambiguous-folder` |
  | `screen/no-default-export` | `page/no-default-export` |
  | `screen/missing-meta` | `page/missing-meta` |
  | `screen/meta-id-mismatch` | `page/meta-id-mismatch` |
  | `screen/meta-missing-label` | `page/meta-missing-label` |
  | `config/flow-mismatch` | `config/chapter-mismatch` |
  | `config/empty-flow` | `config/empty-chapter` |
  | `flowplan/invalid-screen` | `flowplan/invalid-page` |

- **Core types** (`src/types/index.ts` and related):
  | Old | New |
  |---|---|
  | `ScreenMeta` | `PageMeta` |
  | `ScreenVariant` | `PageVariant` |
  | `FlowMeta` | `ChapterMeta` |
  | `FlowNode` | `Chapter` |
  | `FlowConfig` | `ChapterConfig` (`.screens` → `.pages`, `.initialScreen` → `.initialPage`) |
  | `FlowScreenProps` | `PageProps` (`.isFlow` → `.isChapter`, `.flowState` → `.state`) |
  | `FlowkitConfig.flows` / `FlowkitProjectConfig.flows` | `.chapters` |
  | `FlowkitConfig.screenOrder` / `FlowkitProjectConfig.screenOrder` | `.pageOrder` |
  | `FlowkitConfig.startScreen` | `.startPage` |
  | `FeedbackComment.screenId` / `.screenLabel` | `.pageId` / `.pageLabel` |
  | `AnnotationTag.screens` / `.flows` | `.pages` / `.chapters` |
  | `ScreenResolver` / `ResolvedScreen` | `PageResolver` / `ResolvedPage` |
  | `useFlowNav()` | `useNav()` (prefix dropped entirely, not renamed to `useChapterNav`) |

- **Filename convention:** scaffolded screen files are now named `<Name>Page.tsx` (was `<Name>Screen.tsx`), with `export default function <Name>Page()`. The suffix is no longer *required* for any file — screen/page identity has always come from folder position, never the filename — but the CLI still generates it by default for readability.

- **Renamed files:**
  | Old | New |
  |---|---|
  | `scripts/authoring/screens.js` | `scripts/authoring/pages.js` |
  | `scripts/authoring/flows.js` | `scripts/authoring/chapters.js` |
  | `scripts/authoring/promote-flow.js` | `scripts/authoring/promote-chapter.js` |
  | `scripts/checks/screens.js` | `scripts/checks/pages.js` |
  | `src/shared/utils/useFlowNav.ts` | `src/shared/utils/useNav.ts` |

#### Explicitly unchanged (not part of this rename)

The following were deliberately excluded, as brand/product names or as a separate concept from the Flow→Chapter rename:

- `FlowMaster`, `FlowLens`, `Flowkit`/`flowkit` (package name)
- `flowBook`, `flowStories` (directory names)
- The entire **Flowplan** domain: `FlowplanDef`, `FlowplanRef`, `FlowplanStepEntry`, `Fork`, `defineFlow`, and all `flowplan/*` check rule ids and CLI verbs — a flowplan (the authored playback script) is a distinct concept from a chapter (the grouping of pages), and is not renamed
- `FlowSummary`, `FlowLibraryData`, `useFlowLibrary`, and the "Flow Library" UI panel name
- `useFlowEngine` (FlowMaster's internal engine hook)
- The "Screens tab" UI panel label (`ScreensHierarchy.tsx`, `KitSideExplorer.tsx`) — still literally labeled "Screens" in the live UI
- `FlowkitProjectConfig.modules` (a `@deprecated` legacy alias for `.chapters`) — left untouched as dead-but-supported compatibility surface, not part of the active vocabulary

#### Composite id shape

Unchanged in format — still `${first}-${second}` joined by a hyphen (e.g. `onboarding-welcome`). Only what the two halves are called changed (chapter, page), not the shape of the string itself. No data migration is needed for the id format.

### Fixed

- **Silent screen-collision bug.** Two different flows/chapters each containing a same-named screen/page folder previously merged into a single record with no warning, non-deterministically. Now permanently prevented by construction via composite ids.
- **Fixed-depth silent failure.** A screen placed at any depth other than exactly two folders below the root previously vanished from the app with no error. Now any depth ≥1 is supported and correctly resolved.
- **`FlowkitProjectConfig.flows` fallback chains** in `useWorkspaceHierarchy.ts` and `useFlowLibrary.ts` — updated to read `.chapters` (with `.modules` retained as the deprecated fallback), matching the renamed config field.
- **Stale `makeScreenId`/`parseScreenSegments`/`pickScreenFile` imports** in `scripts/platform/sessions/_shared.js` and `scripts/authoring/flowplans.js` — both files were still importing pre-rename export names from the shared identity module, which would have thrown `SyntaxError: does not provide an export named ...` the first time either code path actually ran. Also fixed a `parsed.flow` → `parsed.chapter` field-name mismatch in the same files' composite-id construction (the shared module returns `.chapter`, not `.flow`).
- **`cmdAddStep` composite-id construction.** `flowkit add:step` previously wrote whatever bare screen id the user passed via `--screen:` directly into the flowplan step, without converting it to the composite `chapter-page` form checks now expect. It now looks up which chapter the bare page id is actually registered under and builds the correct composite id.
- **Duplicate `PageMeta` interface declaration** in `src/types/index.ts` introduced mid-refactor (both `ScreenMeta` and the unrelated `FlowMeta` had been renamed to the same name) — resolved by renaming the latter to `ChapterMeta`, which is what it actually described.
- **`ChapterConfig.pages` field never declared** despite call sites already expecting it — the type declaration lagged behind consumers during the refactor; now consistent.
- Several doc/comment-only inconsistencies (stale `flowState`/`isFlow` wording, stale dirname mentions in generated `.agent/*` content, a stale three-file claim in `CLAUDE.md`'s "Agent spec system" section describing `agent:sync` output that no longer matches its actual single-file-per-workspace behavior — flagged, not fixed, as it predates and is unrelated to this rename).

### Migration notes

- Existing workspaces authored against the pre-rename directory names (`flows/`, `flowplans/`) or the pre-rename `screenId`/bare-id scheme are **not automatically migrated**. They continue to fail `tsc`/`check:*` until manually updated to the new `flowBook/`/`flowStories/` directories, `chapters`/`pageOrder` config fields, and composite page ids in flowplan steps.
- Any hand-authored code importing `useFlowNav` from `@flowkit-shared/utils` must switch to `useNav`.
- Any code destructuring `.isFlow`/`.flowState` from `PageProps` (the props injected into a page by FlowMaster) must switch to `.isChapter`/`.state`.
