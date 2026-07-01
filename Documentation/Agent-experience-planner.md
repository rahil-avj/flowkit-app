# Flowaid — end-to-end onboarding & cross-session persistence strategy

## Context

`create-flowkit-app` scaffolds new FlowKit author projects. A prior change removed the
fixed UI-kit picker (apple/material/neo-brutalism) at scaffold time and replaced it with a
smarter approach: the generated project's `CLAUDE.md` now instructs whichever AI coding
agent opens the project to introduce itself as **Flowaid** — a FlowKit-native persona, not
a generic agent — and profile the author conversationally instead of forcing a static
choice.

This plan completes that system: how Flowaid behaves on a cold-start task request, how its
tone is calibrated concretely (not just described in adjectives), and — the hard part —
how what it learns about the author persists across sessions and across different AI
agents (Claude, Cursor, any `AGENTS.md`-reading tool) that might open the same project over
its life. The goal stated by the user: **multi-session continuity must feel like one
continuous relationship, not a series of first meetings** — this is the design constraint
every other decision below serves.

## Decisions locked in

1. **Cold start**: if the author's first message is already a concrete task ("build me a
   login screen"), Flowaid does not block on the interview. It starts building with stated
   sane defaults and threads the profiling questions into the natural course of the work
   (e.g. ask look-and-feel right before touching styling, ask working-style right before a
   multi-file change) rather than up front.
2. **Tone**: warm-but-efficient by default (friendly, no filler), calibrating after the
   interview toward more explanatory (non-technical author) or more terse (experienced
   dev). Needs concrete example phrasing baked into the instructions, not just adjectives —
   different agents/models interpret vague tone labels inconsistently.
3. **Persistence file**: a separate file, `.flowaid/profile.md`, not an appended CLAUDE.md
   section. CLAUDE.md is "how to behave" (instructions); `.flowaid/profile.md` is "what we
   learned" (mutable state). Keeps the instructions file stable and makes profile edits
   surgical (one small file) instead of edits inside fixed surrounding prose.
4. **Multi-agent provisioning**: one canonical instructions file (CLAUDE.md) with the full
   persona/interview/profile-handling instructions. `AGENTS.md` and
   `.cursor/rules/flowkit.mdc` are short stubs that redirect to CLAUDE.md — avoids
   duplicating instructions across three files that could drift if edited later. Mirrors
   the main monorepo's own `AGENT_TARGETS` pattern (`scripts/agent/render.js:26-31`) but
   hand-written as plain template strings, since `create-flowkit-app` must stay a
   zero-runtime-dependency standalone package and cannot import the monorepo's shared
   `render.js`/`spec.js`.
5. **Git status**: `.flowaid/profile.md` is git-tracked, not gitignored. Treated as a team
   artifact (like the monorepo's own hand-owned `.agent/project.md`), not personal dotfiles
   — every teammate's agent session should inherit known profiles on clone. The fields
   involved (name, experience level, project goal, working style, design taste) aren't
   sensitive; if that ever changes, revisit.
6. **No-name continuity**: even if the author declines to give a name, Flowaid still writes
   a profile — under a single unnamed `## Author Profile` section (no name in the header,
   just the learned preferences). If a name is given later — same session or a future one —
   Flowaid upgrades that section in place rather than creating a second one. A second named
   section is only created if answers genuinely indicate a different person (e.g. a
   teammate with a different name shows up). This keeps one project on one evolving profile
   by default, which is what makes "continuous journey" work without forcing every author
   to identify themselves.

## Implementation — `packages/create-flowkit-app/index.js`

**`writeClaude(dir)` — modify.** Keep the existing "First session — onboarding" structure,
add:
- A cold-start clause with a short example turn (author asks for a login screen → Flowaid
  acknowledges in one line, states it's proceeding with sane defaults, starts building, and
  slots profiling questions into natural checkpoints instead of front-loading them).
- Concrete tone examples: one line each for warm-but-efficient default, post-interview
  non-technical framing, post-interview experienced-dev framing — not just adjectives.
- Instruction to check `.flowaid/profile.md` first, every session, before interviewing —
  skip or shorten the interview if a profile already exists for the current author (or the
  unnamed default section, if no name has been captured yet).
- The no-name/upgrade-in-place rule from decision 6, plus the mid-project update rule: if
  the same author's answers later contradict what's on file (seniority, working style,
  etc.), update that section in place — don't append a duplicate, don't leave stale
  contradicting info.
- One line covering the realistic multi-author case: a second teammate opens the project
  and gives a different name — Flowaid treats them as new and adds a second named section,
  never touching or deleting the first.

**`writeFlowaidProfileStub(dir)` — new.** Writes `.flowaid/profile.md` with header/comment
only, no interview content (interview logic is instructions and lives solely in CLAUDE.md):
```
# Author Profile

<!-- Written and maintained by Flowaid across sessions. One "## Author Profile" section
     with no name until one is given; upgrade that section in place once a name arrives.
     Only add a second, separately-named section if a genuinely different person's answers
     show up. Don't hand-edit unless correcting a mistake — let Flowaid keep this current. -->
```

**`writeAgentsStub(dir)` — new.** Writes `AGENTS.md`:
```
# AGENTS.md

This project's agent instructions live in CLAUDE.md — read that file first and follow it,
including its "First session — onboarding" section and its `.flowaid/profile.md` handling.
This file exists so cross-tool agents that look for AGENTS.md by convention find their way
there; it is intentionally not duplicated here to avoid drift.
```

**`writeCursorRules(dir)` — new.** Creates `.cursor/rules/` (`fs.mkdirSync(..., {
recursive: true })`) and writes `flowkit.mdc` with standard Cursor rule frontmatter plus
the same redirect body:
```
---
description: FlowKit project agent instructions
alwaysApply: true
---

This project's agent instructions live in CLAUDE.md — read that file first and follow it,
including its "First session — onboarding" section and its `.flowaid/profile.md` handling.
```

**`writeGitignore(dir)` — no change.** Explicitly do not add `.flowaid/` — decision 5.

**`main()` — modify.** Add the three new writes alongside the existing calls:
```
writeClaude(targetDir)
writeFlowaidProfileStub(targetDir)
writeAgentsStub(targetDir)
writeCursorRules(targetDir)
writeGitignore(targetDir)
```

## Noted but out of scope for this pass

- Stub-to-canonical drift: `AGENTS.md`/`.cursor/rules/flowkit.mdc` reference CLAUDE.md by
  filename/section name with no shared render step (unlike the monorepo's own
  `agent:sync`). Low risk since the stubs only point at a filename, not duplicated content,
  but worth a one-line comment in each stub noting the coupling in case CLAUDE.md's section
  heading is ever renamed.
- If profile fields ever expand to include anything sensitive (email, etc.), revisit the
  git-tracked decision.

## Verification

1. Run the scaffolder locally against this monorepo (`--local-dev` flag, already used for
   the earlier kit-removal smoke test) into a scratch directory.
2. Confirm all four new/modified files exist with correct content: `CLAUDE.md` (onboarding
   section with cold-start + tone + profile-handling instructions), `.flowaid/profile.md`
   (header-only stub), `AGENTS.md` (redirect stub), `.cursor/rules/flowkit.mdc` (redirect
   stub with valid frontmatter).
3. Confirm `.gitignore` is unchanged (still just `node_modules/`, `dist/`, `.env.local` —
   no `.flowaid/` entry).
4. Manually role-play two scenarios against the generated CLAUDE.md text to sanity-check
   the instructions read unambiguously: (a) a cold-start message ("build me a signup flow")
   — confirm the instructions clearly say start building, not interview first; (b) a second
   session opening a project that already has a `.flowaid/profile.md` with one unnamed
   section — confirm the instructions clearly say check the file and skip/shorten the
   interview rather than re-running it blind.
5. Clean up the scratch scaffold directory after inspection.
