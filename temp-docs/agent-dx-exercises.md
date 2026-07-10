# FlowKit Agent-DX Exercises — Master Playbook

Three reusable exercise formats, each testing a different failure mode. Edit any
section freely — this is your control document, not a fixed spec. Pair with
`.claude/skills/agent-dx-study/SKILL.md` (the task-execution format is wired up as
an actual invocable skill; the other two are run manually per the steps below) and
`scripts/dev/agent-dx-study-setup.js` (mechanical scaffold/numbering, shared by all three).

Prior runs, for reference/comparison: `temp-docs/agent-dx-study-01.md` (task execution),
`agent-dx-study-02.md` + `agent-dx-study-02-questionnaire.md` (docs comprehension),
`agent-dx-study-03.md` (manual conversion exercise).

---

## Format A — Task Execution (tests: can an agent *do* the work)

**What it catches:** commands that don't work as documented, error messages that don't
lead to recovery, missing flags, generated code that fails lint/typecheck/build.
**What it can't catch:** whether the agent actually *understood* why something worked —
it can succeed by trial-and-error without real comprehension.

### Setup

```bash
node scripts/dev/agent-dx-study-setup.js [--name:<label>]
```
Prints: scaffold dir, report path (`temp-docs/agent-dx-study-<NN>.md`), monorepo commit.
Reuses `.claude/skills/agent-dx-study/SKILL.md`'s exact prompt template — invoke that
skill directly rather than hand-copying the task list, so edits to the task list live
in one place. If you want to edit the task list, edit the skill file, not this doc.

### Current task list (8 tasks, edit in the skill file — reproduced here for reference)

1. Create a new flow.
2. Add two screens to that flow. → lint + tsc checkpoint.
3. Create a flowplan playing through both screens in order. → lint + tsc + build +
   dev-boot checkpoint.
4. **Deliberate error probe:** try an operation against something that doesn't exist
   (e.g. a screen in a nonexistent flow) — observe, then recover.
5. Create a shared component, figure out how to import/use it from CLI output alone.
   → lint + tsc checkpoint.
6. List current flows/screens, confirm registration matches what was built.
7. **Discovery probe:** without being told the command, find out if [some real,
   undisclosed capability] exists.
8. Run a platform health-check command, interpret the output. → final build checkpoint.

### Retrospective structure (fixed — always ask for exactly this)

`What confused you` / `What information was inaccurate or misleading` / `What was
missing entirely` / `Friction / frustration points` / `Generated-code hygiene` /
`What worked well` / `Task-by-task notes`.

### When to run this format

After any round of CLI/docs fixes, before a release, or whenever a new command family
ships and you want to know if it survives first contact.

---

## Format B — Docs Comprehension (tests: can an agent *understand and explain* the platform from docs alone)

**What it catches:** confident-but-wrong answers, fabrication when docs don't have an
answer, flattening real cross-doc nuance into one falsely-confident claim, doc
inaccuracies/contradictions that a task-execution run would never stumble into.
**What it can't catch:** whether the agent can actually *use* the platform — this is a
closed-book exam, not a hands-on test. Run Format A too if you want both signals.

### Method (do this every time, not just once)

1. **Survey the docs yourself first** (or delegate to an Explore sub-agent) — read every
   doc that ships inside a scaffolded project. Extract: verifiable facts, places two
   docs could be read as inconsistent, terminology that's easy to conflate, and any
   claim that sounds important but isn't actually fully explained anywhere.
2. **Verify every candidate answer against real source** before writing a single quiz
   question. This is the step that makes grading possible — an ungraded quiz is just
   vibes. If two docs disagree, trace it to source and determine ground truth (or
   confirm it's a genuine unresolved discrepancy worth testing for).
3. **Write ~15 questions** (more is thorough but expensive to verify; fewer loses
   category coverage) spanning these categories — always include all seven:
   - **Discoverability** — can it find the file that answers this at all?
   - **Fact/precision** — a specific, easy-to-get-subtly-wrong detail (a default value,
     an exact required flag, a footgun the docs warn about).
   - **Trap (terminology)** — two similar-sounding concepts the docs distinguish
     carefully; does the agent preserve the distinction or flatten it?
   - **Synthesis** — requires combining two different docs to answer correctly; neither
     doc alone gives the full picture.
   - **Genuine cross-doc discrepancy** (if one exists) — two docs actually disagree;
     does the agent notice and say so, or silently pick one and present it as settled?
   - **Honest-unknown probe** — at least one question with NO real answer in the docs
     (verify this yourself — the docs must genuinely not cover it). The correct response
     is "I don't know, here's where to look instead," not a fabricated answer. This is
     the single most important question in the set.
   - **Capstone/open-ended** — one "explain the big picture" question that requires a
     coherent mental model built from everything above, not just recalled facts.
4. **Calibrate the trap ratio** — include at least one question where two docs that
   *look* like they might disagree actually agree (a "don't over-flag" control), so you
   can tell whether the agent is genuinely reading carefully or just pattern-matching
   "docs sometimes conflict" and inventing conflicts that aren't there.

### Fresh scaffold — always

Never reuse a scaffold that's already had tasks run against it (e.g. one already
converted to multi-workspace mode) — prior state leaks answers to discovery-style
questions. Always `node scripts/dev/agent-dx-study-setup.js` fresh for this format.

### Sub-agent prompt skeleton

```
You are a coding agent that has just been opened inside a real project directory for
the first time: `<SCAFFOLD_DIR>`. You have NEVER seen this codebase before and have NO
prior knowledge of "FlowKit" beyond what you can discover by reading files inside this
directory.

SCOPE RULES:
1. Only read files inside `<SCAFFOLD_DIR>`. Do not read parent directories or
   node_modules/flowkit's source/scripts.
2. Answer using ONLY documentation/markdown files you find inside this project. Do NOT
   read .ts/.tsx/.js source, package.json internals, or config file contents. If a
   question seems to require source code, say so explicitly rather than reading it.
3. Find the relevant documentation yourself — nobody will tell you which file answers
   which question.
4. It is OK and expected to say "I don't know" or "the documentation doesn't fully
   answer this." Do NOT fabricate a plausible-sounding answer. Honest uncertainty is a
   correct, valued response, not a failure.

Explore the project's docs first, then answer these <N> questions. For each: state your
answer, cite the exact file/passage, rate your own confidence (High/Medium/Low/Unknown),
and explicitly flag if you found conflicting information across two docs rather than
silently picking one.

[QUESTIONS GO HERE]

After answering all, add "Overall reflection" — 3-5 sentences on how easy/hard it was to
find authoritative answers, and whether you ever felt unsure a doc was current/accurate.

Do not write any files. Give your full set of answers as your final response.
```

### Grading key (apply after the sub-agent responds)

`Correct` / `Correct + caught the trap` (higher bar — explicitly surfaced a planted
nuance) / `Partially correct` / `Incorrect` / `Fabricated` (most serious) / `Correctly
declined` (the desired outcome for the honest-unknown probe, not a failure).

### Report structure

Metadata header (date, commit, doc set version) → grading table (one row per question:
topic, grade, notes) → scope-adherence notes (did it stay docs-only? note any deviation
honestly, even minor ones) → documentation quality findings surfaced as a byproduct
(these are usually the most valuable output — real bugs/doc errors the quiz design
uncovered, independently verified before including) → open questions/follow-ups.

---

## Format C — Manual Workflow Exercise (tests: does a real, multi-stage authoring session hold up end-to-end)

**What it catches:** bugs specific to a *sequence* of operations (scaffold → author →
convert → keep authoring) that neither a single-shot task list nor a docs quiz would
surface — e.g. a fix that only covers initial scaffold content but not ongoing authoring
commands, or a bug that only reproduces in one mode and silently resolves in another.
**Difference from Format A:** this one is driven directly by you/the orchestrating
session, not a sandboxed sub-agent — you're testing the real mechanics hands-on, not
testing an agent's ability to figure it out blind.

### Checklist (edit freely — this is the shape, not a fixed script)

1. `node scripts/dev/agent-dx-study-setup.js --name:<label>` — fresh scaffold.
2. Add real content via the live CLI: a new flow, 1-2 screens, a flowplan with steps.
   Run `tsc --noEmit` + `npm run build` as a **baseline**, before converting anything.
3. Convert mode (e.g. `flowkit convert:multi`) — verify the conversion itself (correct
   structure, correct `vite.config.ts` rewrite, mode-detection immediately correct via
   `flowkit help`).
4. Keep working in the *converted* state — create a second workspace, add content to
   it, verify workspace isolation (`list:screens --workspace:<name>` scoped correctly,
   zero cross-contamination).
5. Re-run `tsc --noEmit` / `npm run build` / `npm run dev` (HTTP boot check) against the
   **full, final, multi-stage state** — this is the check that catches bugs Format A's
   single-pass task list would miss.
6. Run the full monorepo test suite + lint before declaring done — a fix verified only
   against the scratch scaffold isn't verified against regressions elsewhere.

### When something breaks mid-exercise

Don't just note it — try to isolate root cause with a minimal repro (a standalone new
file with identical code, or the same file renamed) before writing it up. If it
reproduces in the live project but NOT in isolation, that's itself the finding (state-
dependent bug, not a code-level defect) — say so explicitly rather than forcing a
root-cause conclusion you haven't actually verified. It's fine to flag something as
"reproducible but unexplained" and move on rather than over-investing in one bug at the
expense of finishing the exercise.

### Report structure

What was done (numbered steps, like the checklist above but as executed) → findings
(same severity/fixed-or-not convention as Formats A/B) → verification summary table
(one row per check: baseline tsc, post-conversion tsc, build, dev-boot, isolation,
full suite) → open questions/follow-ups.

---

## Shared conventions across all three formats

- **Numbering**: `scripts/dev/agent-dx-study-setup.js` auto-assigns the next free
  `temp-test[-NN]` scaffold and matching `temp-docs/agent-dx-study-<NN>.md` report slot,
  regardless of which format you're running — all three share one sequence. Note which
  format each numbered report used in its own metadata header (see existing reports for
  the convention) since the sequence is shared but the formats aren't interchangeable.
- **Severity convention**: Critical / High / Medium / Low, consistent with this
  project's broader code-review conventions.
- **New / recurring / regression**: when writing a report, check prior numbered reports
  and state whether each finding is new, a repeat of something already logged, or a
  regression of something already marked fixed.
- **Fix verification discipline**: never mark something "fixed" without re-running the
  exact failing command/check against a live scaffold afterward — reading the diff is
  not verification.
- **Scaffolds are disposable, reports are not**: `temp-test*/` directories can be deleted
  anytime (`rm -rf temp-test*`) without losing anything — the durable record is always
  the numbered report + transcript, not the scaffold itself. Clean up scaffolds after a
  round of exercises; never delete a numbered report.
