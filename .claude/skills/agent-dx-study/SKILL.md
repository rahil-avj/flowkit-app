---
name: agent-dx-study
description: Run a repeatable UX study on FlowKit's CLI/docs DX by spawning a fresh, uncontaminated sub-agent to work through a real authoring session inside a freshly scaffolded flat-mode project, then interviewing it and producing a numbered findings report. Use when asked to test/study/audit how well an agent can use FlowKit, or to re-check DX after a round of fixes.
---

# FlowKit Agent-DX Study

Empirically tests how well an AI coding agent — standing in for a real author's own
coding agent — can work inside a freshly scaffolded FlowKit project, using only what
ships inside that project (its generated `CLAUDE.md`, `docs/`, and the CLI's own
help/error output). Produces a structured, numbered report every run so results are
comparable over time, not just a one-off chat summary.

## Why this exists

Static code reading (grepping `help.js`, reading router dispatch tables) finds
_inaccuracies_ — flags that don't exist, commands that are undocumented. It cannot find
_confusion_ — places where the docs are technically correct but an agent still has to
guess, retry, or reverse-engineer the real behavior. This skill runs an actual empirical
session to surface the second kind of problem, which static analysis structurally can't see.

## What this skill does NOT do

- Does not modify any FlowKit source code or docs before a run — the scaffold must
  reflect real current behavior at the moment of the run, not a pre-cleaned version.
- Does not run multiple personas per invocation — one `general-purpose` sub-agent, one
  fixed task list, per run. (A persona-variant version is a plausible future skill, not this one.)
- Does not pre-brief the sub-agent with any previously-found bugs — its confusion must be genuine.
- Does not overwrite or delete a prior run's scaffold or report — every run gets the next
  free numbered slot, so history accumulates and stays comparable.
- Does not fix anything it finds — this skill's job ends at producing the report.

## Procedure

### Step 1 — Run the setup script

```bash
node scripts/dev/agent-dx-study-setup.js [--name:<label>]
```

This handles everything mechanical: picks the next free scaffold dir (`temp-test`,
`temp-test-02`, ...) and matching report number (`temp-docs/agent-dx-study-01.md`,
`-02.md`, ...) so re-runs never collide; scaffolds fresh via `create-flowkit-app
--local-dev` (or reuses an existing valid scaffold that has no report yet); verifies
the scaffold actually works (`flowkit help` runs and reports `Mode: consumer`) and
fails loudly if not, rather than let a broken scaffold produce a confusing study
result; and writes `.study-meta.json` inside the scaffold dir recording the monorepo's
current commit hash.

Read its stdout for three values you need for the next steps: **scaffold dir**,
**report path**, **monorepo commit**. If it exits non-zero, stop — do not proceed to
spawning the sub-agent against a scaffold that failed its precondition check; fix
the underlying issue first (see its printed reason).

### Step 2 — Spawn the sub-agent

Launch one Agent, `subagent_type: "general-purpose"`, `run_in_background: false` (you
need its result before continuing to analysis). Use the prompt template below verbatim,
substituting `<SCAFFOLD_DIR>` with the absolute path from Step 1.

<details>
<summary>Sub-agent prompt template</summary>

```
You are a coding agent that has just been opened inside a real project directory for
the first time: `<SCAFFOLD_DIR>`. You have NEVER seen this codebase before and have NO
prior knowledge of "FlowKit" beyond what you can discover by reading files inside this
directory.

IMPORTANT SCOPE RULE: Only read, write, and run commands inside `<SCAFFOLD_DIR>`. Do
not read, list, or navigate to any parent directory, any `CLAUDE.md` outside this
folder, or the monorepo that published your `flowkit` dependency. Treat this directory
as the entire world, exactly as a real author's coding agent would.

Start by reading `<SCAFFOLD_DIR>/CLAUDE.md` in full — that's your onboarding document.
If it instructs you to introduce yourself with a persona and run an onboarding
interview, skip the interview (no human here) but adopt whatever tone/persona it
establishes, then proceed straight to the tasks below.

The `flowkit` CLI is available via `./node_modules/.bin/flowkit <command>` (run from
inside this directory) — it is NOT globally installed.

Maintain a running transcript file as you work: `<SCAFFOLD_DIR>/.study-transcript.md`.
Every time you run a command, append: the exact command, its raw output (verbatim, not
paraphrased), and a one-line note on your own in-the-moment reaction (expected /
confused / surprised / had to retry) — written AT THE TIME, not reconstructed from
memory at the end. This transcript is the primary data of this study; don't skip
entries even for commands that "just worked."

Complete these tasks IN ORDER, using only the CLI, its own help/error output, and the
project's own docs (docs/CLI.md, CLAUDE.md) to figure out how — try `flowkit help` or
read docs/CLI.md before guessing wildly at exact syntax:

1. Create a new flow called `checkout`.
2. Add two screens to that flow: `cart` and `confirmation`.
   After this task: run `npx eslint <path-to-the-two-new-screen-files>` and
   `npx tsc --noEmit`, log the exact output to the transcript.
3. Create a flowplan for the `checkout` flow that plays through both screens in order,
   with a reasonable action/note for each step.
   After this task: run `npx eslint <path-to-the-new-flowplan-file>` and
   `npx tsc --noEmit` again, log output. Then run `npm run build` and log full output
   (note: a chunk-size warning over 500KB is known-acceptable, not a new bug — flag it
   only if something else looks wrong). Then start `npm run dev` in the background,
   confirm it boots (HTTP 200 on whatever port it reports), stop it, log the result.
4. Deliberately try to create a screen in a flow that doesn't exist (flow name
   `nonexistent`) — observe what happens, log the exact error, then actually
   recover/complete the task correctly afterward based on what the CLI told you.
5. Create a new shared component called `PriceTag` (your choice of reasonable path
   under lib/) and figure out how you would actually import/use it, based on what the
   CLI tells you. After this task: run eslint + tsc on the new file, log output.
6. Run whatever command lists your current flows/screens to confirm everything you
   built is registered correctly.
7. Without me telling you the exact command, figure out whether this project can be
   converted to support multiple independent workspaces — this is a real capability of
   this platform if it exists; find out, don't assume either way.
8. Run `flowkit status` and interpret what it tells you.
   Then run `npm run build` one final time and log the output.

Do NOT clean up after yourself — leave everything you created in place for inspection.

After completing (or attempting) all 8 tasks, STOP and give a candid retrospective,
structured EXACTLY like this:

## What confused you
(Anything where docs/CLI output said one thing but you had to guess, reverse-engineer,
or figure out real behavior through trial and error)

## What information was inaccurate or misleading
(Anything the CLI or docs explicitly told you that turned out wrong, incomplete, or
didn't match reality when tried)

## What was missing entirely
(Things you needed to know but had NO source of truth for anywhere — not help, not
docs, not error messages)

## Friction / frustration points
(Places where the correct path was findable but took more steps/retries than it should)

## Generated-code hygiene
(What the eslint/tsc/build/dev-boot checks found at each checkpoint — clean, or specifics)

## What worked well
(Be honest — don't manufacture complaints; say plainly if something was genuinely clear)

## Task-by-task notes
(One or two sentences per task, 1-8, on how it actually went)

Be specific — cite exact command syntax, exact error text, exact doc sections, not
vague impressions. Make sure `.study-transcript.md` is fully written and saved before
you stop.
```

</details>

### Step 3 — Cross-check the transcript against real artifacts

After the sub-agent returns its retrospective, read `<scaffold-dir>/.study-transcript.md`
directly — treat it as the primary data source, the retrospective as a secondary
summary. Then inspect the actual files left behind (new flow/screen dirs, the flowplan
file, the component file, any config changes) to verify claims in the transcript
against ground truth. Any place the sub-agent's self-report and the actual on-disk
state disagree is itself a high-value finding (about the CLI's success/failure
signaling), not just noise to reconcile.

### Step 4 — Write the numbered report

Write to the report path Step 1 printed (`temp-docs/agent-dx-study-<NN>.md`). Structure:

- **Metadata header** — date, monorepo commit (from `.study-meta.json`), scaffold mode,
  and a pointer to the previous run's report if `agent-dx-study-<NN-1>.md` exists, so
  this report can note what changed since then.
- **Findings**, grouped by six categories: confusion / inaccuracy / absence / friction /
  hygiene / working-well. Each finding cites the exact transcript excerpt or command,
  names the responsible file/doc section, rates severity (Critical/High/Medium/Low),
  and — since this is a repeatable tool — states whether it's **new**, **recurring**
  (also seen in an earlier numbered report — name it), or a **regression** (something an
  earlier report marked fixed that has reappeared). Check prior reports in `temp-docs/`
  for this classification; don't skip it just because it takes an extra read.
- **Task-by-task outcome table** — one row per task 1-8: completed cleanly / completed
  with friction / failed / discovered-but-not-attempted, one-line note each.
- **Generated-code hygiene results** — explicit pass/fail table for every eslint/tsc/
  build/dev-boot check the sub-agent ran, independent of the general findings list.
- **Cross-check notes** — from Step 3.
- **Open questions / follow-ups** — anything worth a persona variant or deeper task
  list next time, explicitly deferred rather than guessed at now.

### Step 5 — Summarize in chat

A few sentences pointing at the report path and the transcript path. Do not restate
the report's contents — chat is the index, the file is the record.
