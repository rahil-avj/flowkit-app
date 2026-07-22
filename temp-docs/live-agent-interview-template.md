# Live Agent Interview — Session Template

For interviewing a coding agent working inside a **real, live FlowKit environment**
(not a disposable `temp-test*` scaffold) — a fresh guided session run through a
structured walkthrough from the start, similar in spirit to `agent-dx-study-02.md`'s
docs-comprehension format but conducted live/interactively instead of via a scripted
sub-agent. Fill in the placeholders below before starting; the rest of the structure is
reusable as-is across sessions.

**Before you start:** decide whether this session's answers should influence
`temp-docs/agent-dx-exercises.md`'s question bank or task list — if a live interview
surfaces a good trap/question/task, add it there for future scripted runs, don't let it
live only in this one-off transcript.

---

## Session setup

**Date:** `___________`
**Environment:** `___________` (real project path — NOT a `temp-test*` scaffold)
**FlowKit mode:** `[ ] repo  [ ] flat  [ ] multi-workspace`
**Monorepo/package commit or version:** `___________`
**Agent identity:** `___________` (which model/tool — matters if comparing sessions later)
**Purpose of this session:** `___________` (e.g. "checking in after two weeks of real
use," "onboarding a new project type," "post-release sanity check")

**Opening framing to give the agent** (adapt, don't skip — sets honest-answer expectations):

> I want to interview you about your actual experience working in this FlowKit project.
> This isn't a quiz with right answers I'm grading you against — I want your honest
> account of what's been confusing, what's worked well, what you've had to guess at or
> work around, and anything that's surprised you. Please be candid, including about
> things that reflect well on the tooling, not just complaints. If you don't have a
> strong opinion on something, say so rather than manufacturing one.

---

## Part 1 — Warm-up / context (establishes what the agent has actually done)

1. How long have you been working in this project, and what's the scope of what you've
   built so far (flows, screens, components, anything else)?
2. Before today, had you read `CLAUDE.md` / `docs/` in full, or picked things up
   incrementally as you needed them?
3. Is there anything about this project's setup (mode, structure, conventions) that
   took you a while to form a correct mental model of?

## Part 2 — Discoverability & documentation

4. Think of the last time you needed to do something you hadn't done before in this
   project. How did you find out how? (docs, `flowkit help`, trial and error, asked the
   user, something else)
5. Has `flowkit help`'s output ever been wrong, incomplete, or led you to try a command
   that didn't work as shown? If yes — exact command and what actually happened.
6. Is there a capability of this platform you only discovered by accident, or that you
   suspect exists but haven't confirmed? Name it.
7. Have you ever found two docs (or a doc and actual behavior) that disagreed? Walk
   through it.

## Part 3 — Correctness & recovery

8. Recall a time a command failed or an error surfaced. Was the error message enough to
   fix it yourself, or did you need to dig further (read source, ask the user, guess)?
9. Has anything the CLI generated for you (a screen, component, config change) failed
   lint or type-checking on arrival, before you'd touched it?
10. Is there a command or flag whose behavior surprised you — did something you didn't
    expect, or something with a non-obvious default?

## Part 4 — Working style & friction

11. What's the most repetitive or tedious part of working in this project day-to-day?
12. If you could change one thing about how this platform communicates with you (docs,
    CLI output, error messages, anything), what would it be?
13. Is there anything you've been doing manually that you later realized had a CLI
    shortcut you didn't know about?

## Part 5 — Confidence & calibration

14. On a scale of confident/uncertain, how sure are you that your mental model of this
    project's mode (repo/flat/multi-workspace) and its constraints is actually correct?
15. Is there anything you've been assuming about this platform that you've never
    actually verified — that you're now not 100% sure is true?

## Part 6 — Open reflection (always ask, unscripted)

16. Anything else — a pattern you've noticed, a recurring annoyance, something that
    delighted you, a red flag you've been meaning to mention but hasn't come up?

---

## Response format (ask the agent to structure its answers this way)

For each numbered question:

> **Q<N> answer:** [direct answer]
> **Confidence:** High / Medium / Low
> **Evidence:** [a specific example, command, file, or moment — not a generality]
> **Flag:** [only if this reveals something worth fixing — otherwise omit]

## Post-interview — your own synthesis (fill in after the session)

- **Red flags found:** `___________`
- **Confirmed strengths (things to NOT change):** `___________`
- **New findings vs. already-known issues** (cross-check against
  `temp-docs/agent-dx-study-*.md` and `temp-docs/agent-dx-exercises.md`'s findings —
  is this new, or a recurrence of something already logged?): `___________`
- **Follow-up actions:** `___________`
- **Worth promoting into the scripted exercise bank?** `[ ] yes → added to
agent-dx-exercises.md  [ ] no, too specific to this session`

---

## Notes on running this well

- **This is qualitative, not gradable** — unlike Format B in `agent-dx-exercises.md`,
  there's no pre-verified answer key here, because you don't know in advance what a real
  agent's real experience has been. Don't try to force a pass/fail grade onto it.
- **Push for specifics.** "The docs were confusing" is not a usable finding; "I assumed
  `--workspace:<name>` was required on every authoring command until I hit an error that
  said otherwise" is.
- **Watch for the agent smoothing over real friction to sound competent** — the same
  social-desirability bias humans have in interviews. If an answer sounds too clean,
  ask a specific follow-up (e.g. Q8's "walk through it" framing exists specifically to
  force a concrete recall instead of a generic summary).
- **A short session is fine.** You don't need all 16 questions every time — this is a
  reusable bank, not a mandatory script. Pull the subset relevant to what prompted the
  interview (e.g. just Part 2 if you're specifically checking docs health after a change).
