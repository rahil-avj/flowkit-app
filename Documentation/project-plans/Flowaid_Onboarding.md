# Flowaid — onboarding persona & cross-session persistence

Registry entry: `FEATURES.md` #40. Replaces the removed `--kit:` picker in
`create-flowkit-app`. Implementation lives in `packages/create-flowkit-app/index.js`.

---

## Problem

`create-flowkit-app` used to force a static UI-kit choice (apple/material/neo-brutalism/none)
at scaffold time. That coupled every scaffolded project to `src/kits/shared/`'s Radix-backed
components, which made `@radix-ui/*` a hard runtime dependency the scaffolder never actually
installed — broken out of the box for any kit besides `none`. Fixing the install list was the
wrong fix: it locks the author into a pre-picked visual identity before an agent has even seen
the project.

## Approach

Drop the kit picker entirely. Instead, the generated `CLAUDE.md` instructs whichever AI coding
agent opens the project to act as **Flowaid** — a FlowKit-native persona — and profile the
author conversationally, then make the design/component decisions itself. The constraint that
shapes every decision below: **multi-session continuity must feel like one continuous
relationship, not a series of first meetings.**

## Behavior spec

**Cold start.** If the author's first message is already a concrete task ("build me a login
screen"), Flowaid does not block on the interview. It builds with stated sane defaults and
threads the five profiling questions into the natural course of the work (e.g. ask
look-and-feel right before touching styling) instead of front-loading them.

**Interview topics** (once, conversational, one or two at a time — not a form): name,
dev-experience level, what they're building, working style (check-in vs. move-fast), and
look-and-feel preference (there's no pre-installed kit — Flowaid decides the actual approach
itself based on the answer, e.g. plain Tailwind vs. shadcn/ui vs. something else).

**Tone.** Warm-but-efficient by default; calibrates post-interview toward more explanatory
(non-technical author) or more terse (experienced dev). The generated CLAUDE.md includes
concrete example lines for each mode — adjectives alone read inconsistently across agents/models.

**No-name continuity.** If the author declines to give a name, Flowaid still writes a profile —
a single unnamed `## Author Profile` section with just the learned preferences. If a name
arrives later (same session or a future one), that section is upgraded in place, not duplicated.
A second, separately-named section is only created if answers genuinely indicate a different
person (a teammate). This is what makes continuity work without requiring identification.

## Persistence

**`.flowaid/profile.md`** — separate from `CLAUDE.md`. CLAUDE.md is "how to behave"
(instructions); this file is "what we learned" (mutable, per-project). Keeps profile edits
surgical instead of surgery inside fixed instruction prose.

- Git-tracked, not gitignored — treated as a team artifact (same precedent as the monorepo's
  own hand-owned `.agent/project.md`), not personal dotfiles. None of the fields (name,
  experience level, goal, working style, design taste) are sensitive. Revisit if that changes.
- Every session: read this file before interviewing; skip/shorten the interview if a profile
  (named or unnamed) already exists.
- Mid-project contradiction (e.g. author's stated seniority or working style changes): update
  the existing section in place, don't append a duplicate.
- Never touch or delete another author's section when adding/updating your own.

## Multi-agent provisioning

One canonical instructions file; the rest redirect, to avoid duplicated instructions drifting
out of sync across files nobody remembers to keep in step. Mirrors the main monorepo's own
`AGENT_TARGETS` pattern (`scripts/agent/render.js:26-31`), hand-written as plain template
strings since `create-flowkit-app` is a standalone zero-dependency package and can't import the
monorepo's shared `render.js`/`spec.js`.

- `CLAUDE.md` — full persona, interview, tone, and profile-handling instructions.
- `AGENTS.md` — stub, redirects to `CLAUDE.md`.
- `.cursor/rules/flowkit.mdc` — stub with standard Cursor frontmatter (`description`,
  `alwaysApply: true`), redirects to `CLAUDE.md`.

## Implementation — `packages/create-flowkit-app/index.js`

- `writeClaude(dir)` — modify: add cold-start clause + example turn, concrete tone examples,
  profile-check/update instructions.
- `writeFlowaidProfileStub(dir)` — new: writes `.flowaid/profile.md` header/comment only.
- `writeAgentsStub(dir)` — new: writes `AGENTS.md` redirect.
- `writeCursorRules(dir)` — new: `mkdirSync('.cursor/rules', { recursive: true })` +
  `flowkit.mdc` redirect.
- `writeGitignore(dir)` — no change; `.flowaid/` intentionally absent.
- `main()` — wire the three new writes in alongside the existing calls.

## Known follow-ups

- Stub-to-canonical drift: `AGENTS.md`/`.cursor/rules/flowkit.mdc` reference `CLAUDE.md`'s
  section heading by name with no shared render step. Low risk (stubs point at a filename, not
  duplicated content) but flag with a one-line comment in each stub.
- If profile fields ever expand to include anything sensitive, revisit git-tracked status.

## Verification

1. Scaffold locally via `--local-dev` into a scratch dir.
2. Confirm all four files exist with correct content: `CLAUDE.md`, `.flowaid/profile.md`,
   `AGENTS.md`, `.cursor/rules/flowkit.mdc`.
3. Confirm `.gitignore` unchanged (no `.flowaid/` entry).
4. Role-play both scenarios against the generated `CLAUDE.md` text: a cold-start build request
   (should build, not interview first) and a second session with an existing unnamed profile
   (should check the file, skip/shorten the interview).
5. Delete the scratch scaffold after inspection.
