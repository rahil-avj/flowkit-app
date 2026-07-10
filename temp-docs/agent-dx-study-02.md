# FlowKit Agent-DX Study — Report 02 (Documentation Comprehension)

**Date:** 2026-07-10
**Monorepo commit:** `f4ab810bda9db382ebf7945757b92141a6a6bf0e`
**Scaffold:** `temp-test-02/` (flat mode, fresh, via `create-flowkit-app --local-dev`) — deliberately pristine, not reused from Report 01's `temp-test/`, so no prior task history could leak answers (e.g. Report 01's project had already run `convert:multi`, which would have spoiled Q2/Q8's discovery framing)
**Previous run:** [`agent-dx-study-01.md`](agent-dx-study-01.md) — that run tested task *execution*; this run tests documentation *comprehension* in isolation, using a fixed 15-question quiz instead of an open-ended task list

## Method (different from Report 01 — record this explicitly since it's a new format)

Unlike Report 01's task-execution study, this round tested whether an agent can find,
synthesize, and accurately reason about FlowKit's documentation **without reading any
source code**. Method:

1. The orchestrating session built a 15-question quiz *and independently verified every
   answer against source* before the sub-agent ever saw the questions — recorded in
   `temp-docs/agent-dx-study-02-questionnaire.md` (answer key, not shown to the sub-agent).
2. An Explore sub-agent first surveyed all 6 shipped docs (`CLAUDE.md` +
   `docs/{AGENTS,CLI,FLOWKIT,FLOWLENS,FLOWLENS-GUIDE,FLOWMASTER}.md`) to find real,
   verifiable candidate facts, cross-doc synthesis opportunities, terminology traps, and
   genuine documentation gaps — this fed the question design, not the sub-agent under test.
3. A second, separate, uncontaminated `general-purpose` sub-agent was given only the 15
   questions and told to find the relevant docs itself — no file was named, no doc was
   pointed at. It was explicitly instructed to say "I don't know" rather than fabricate,
   and to avoid reading any source code, config internals, or non-doc files.
4. Every answer below is graded against the pre-verified answer key, not taken at face value.

## Grading key

- **Correct** — matches verified ground truth, cites the right doc(s)
- **Correct + caught the trap** — matches ground truth AND explicitly surfaces a
  deliberately-planted nuance/discrepancy (higher bar than plain correctness)
- **Partially correct** — right general shape, missed a detail or hedge that mattered
- **Incorrect** — factually wrong relative to the docs
- **Fabricated** — invented an answer not actually supported by any doc (most serious)
- **Correctly declined** — appropriately said "the docs don't fully answer this" instead
  of guessing (this is the desired outcome for Q10, not a failure)

---

## Findings

### Working well (this section first, since the results were strong overall)

**Zero fabrication anywhere in 15 answers.** The single highest-priority red-flag check
(Q10 — CSS variable names the docs deliberately don't enumerate) was handled exactly as
hoped: the agent stated the docs point at `src/kits/shared/tokens/themes/*.css`,
correctly noted those files are outside the project's own tree and off-limits per its
scope rules, and explicitly declined to invent variable names. This is the target
behavior, not a partial answer — flagged here as a genuine strength worth preserving in
future doc changes (i.e., don't remove FLOWKIT.md's "check the theme file directly
rather than relying on a hardcoded list here" framing — it's doing real work).

**Every genuine cross-doc discrepancy planted in the quiz (Q7, Q9, Q12) was caught and reported as a discrepancy**, not silently flattened into one confident (and wrong) answer.
This was the main hypothesis of this study round — that an agent might read two
conflicting docs and simply repeat whichever it read second — and it did not happen
here. All three were explicitly named as disagreements, with both sides quoted.

**Precision on subtle non-obvious behaviors (Q5, Q6) was excellent**, including catching
a self-referential detail in Q6 that wasn't required for a merely-correct answer (that
CLI.md's own FlowPlan anatomy example uses single-quoted labels, which would itself
trigger the exact footgun the doc warns about).

### Correctness by question

| # | Topic | Grade | Notes |
|---|---|---|---|
| 1 | workspaces/ folder in flat mode | Correct | Exact match to CLAUDE.md, high confidence appropriately assigned |
| 2 | Adding a second workspace | Correct + caught the trap | Correctly distinguished `convert:multi` (does NOT itself scaffold a 2nd workspace) from `create:workspace` (does) — a real, easy-to-conflate two-step process, not flattened into one command |
| 3 | CLAUDE.md's "Common commands" accuracy | **Correct + caught the trap** | This was the highest-value discoverability question — explicitly identified that `flowkit export` in CLAUDE.md's own list would fail in this exact project, quoting the real error text, rather than trusting the doc it was reading at face value |
| 4 | Active UI kit + how to change it | Correct, self-aware about a real gap | Correctly said no kit is active; honestly flagged that consumer-mode's exact `--kit` flag syntax for `create-flowkit-app` specifically isn't spelled out as explicitly as the repo-mode `nw` equivalent — a real, accurate observation, not a hedge for its own sake |
| 5 | `remove:step` without `--index` | Correct | Exact match including the `NaN`→`0` coercion mechanism |
| 6 | `promote:flow --fork` quoting footgun | **Correct + caught the trap** | Also caught the bonus self-referential detail (the doc's own example would trigger its own documented bug) |
| 7 | `VITE_ENABLE_FLOWLENS` vs. real gate | **Correct + caught the trap** (best answer in the set) | Quoted the actual glob code from FLOWLENS.md accurately, correctly identified the FLOWLENS-GUIDE.md/CLAUDE.md vs. FLOWLENS.md conflict, appropriately hedged confidence at Medium rather than confidently resolving it either way, and correctly recognized it could not resolve further without reading source (which was out of bounds) |
| 8 | flat mode vs. flat layout | Correct | Clean, accurate distinction, correctly notes both apply simultaneously to this project |
| 9 | `flow.transition` firing condition | **Correct + caught the trap** | Explicitly quoted both FLOWMASTER.md's conditional framing and FLOWLENS.md's unconditional framing side by side, correctly declined to pick one as settled |
| 10 | `--kit-*` variable names (honest-unknown probe) | **Correctly declined** | The desired outcome — no fabrication, correctly cited the doc's own deliberate refusal to hardcode this |
| 11 | Multi-workspace default target | Correct | Also correctly noted this question was hypothetical for this specific (flat-mode) project — good situational awareness |
| 12 | "Universal" session command pattern | **Correct + caught the trap** | Directly identified FLOWLENS-GUIDE.md's stated pattern as inconsistent with CLI.md's actual (optional-suffix) behavior and this project's own CLAUDE.md examples |
| 13 | export vs. export:full mechanism | Correct | Correctly connected to Q7/Q9's presence-based mechanism, and correctly noted export is moot in this project anyway (ties back to Q3) — good internal consistency across answers |
| 14 | Master key rejection | Correct | Accurate mechanism (bcrypt marker check), correct source |
| 15 | Mode-system rationale (capstone) | Partially correct | Solid synthesis, but — see Cross-check notes below — it drew on content it described as being outside `temp-test-02`'s own doc set (the parent monorepo's root `CLAUDE.md`) to support part of its answer, which is a real scope question worth flagging even though the final answer's substance was reasonable |

**Overall: 12 of 15 fully correct (5 of those explicitly catching a designed trap/discrepancy), 2 correct-with-honest-caveats, 1 partially correct with a scope question, 0 incorrect, 0 fabricated.**

### Scope-adherence notes (new category for this report format)

**Minor, low-consequence deviation:** the agent read `lib/design-system/tokens.css`
directly to confirm Q4's claim that it "starts empty" — technically a non-markdown file,
outside the letter of the "docs only, no source code" rule. In context this is a
defensible, very mild bend: the file contains zero logic (a comment and one commented-out
placeholder line), and it was used only to *confirm* a doc's claim, not to *find* an
answer the docs should have supplied. Flagging per the questionnaire's own instruction to
note any rule deviation, but this does not read as a meaningful violation or as evidence
the agent would readily reach for source code when docs actually don't have an answer
(contrast with Q10, where it correctly did NOT reach into `node_modules/flowkit/src` to
find the real kit variable names, even though it clearly considered whether that was an
option and explicitly declined).

**Q15's scope question:** the agent's capstone answer partially drew on "the parent
monorepo's CLAUDE.md" for rationale — content it itself flagged as "technically outside
`temp-test-02`'s own doc set." This is worth noting as a real tension in the question
design (Q15 asks for architectural rationale that isn't fully spelled out as a single
prose paragraph anywhere inside a consumer project's own shipped docs) rather than a
failure of the agent — the mode table and command behavior inside `temp-test-02`'s own
docs do support most of the answer, and the agent was transparent about which part came
from where.

### Documentation quality findings (surfaced as a byproduct of the quiz, not the main goal, but real)

These aren't about the sub-agent's performance — they're genuine product/doc findings
this exercise surfaced, independently verified by the orchestrating session against
actual source before including them here:

**F6 (High) — `VITE_ENABLE_FLOWLENS` is a vestigial env var that does nothing.**
Independently confirmed via exhaustive `grep` across `src/`, `scripts/`, and all three
vite configs: the actual FlowLens build-inclusion gate is 100% presence-based
(`import.meta.glob` on `src/modes/flowlens/index.ts`, confirmed directly in
`src/shared/contexts/FlowLensModeContext.tsx`, which contains the literal code comment
"No env flag needed"). `VITE_ENABLE_FLOWLENS` is set by exactly one script
(`scripts/builders/export.js`'s `export:full` path) and referenced in exactly one UI
hint (`ManageContent.tsx`), but is **never read anywhere** to actually gate FlowLens
inclusion. `docs/FLOWLENS-GUIDE.md` and this repo's own root `CLAUDE.md` both instruct
users to set this env var to enable FlowLens in dev/build — that instruction does
nothing on its own. Given `docs/FLOWLENS.md`'s own account is the one that matches
source exactly, `FLOWLENS-GUIDE.md`/`CLAUDE.md`'s env-var framing is the stale one.
**This exact discrepancy is what the sub-agent found and correctly flagged in Q7**,
without being told the answer — the trap worked as designed, and independently
surfaced a real bug.

**F7 (Medium) — `flow.transition`'s firing condition is genuinely inconsistent across two docs**, not just differently worded. `docs/FLOWMASTER.md` documents it as conditional
(fires only on blocked/thrown navigations); `docs/FLOWLENS.md` documents it as
unconditional (fires on every resolved navigation, with problem-fields as optional
payload). This needs resolution against the actual event-emission source
(`src/core/layout/FlowEngine.ts` or wherever `flow.transition` is actually dispatched)
— out of scope for this report to resolve, flagged for a follow-up code-reading pass.

**F8 (Medium) — `docs/FLOWLENS-GUIDE.md` is written exclusively in repo-mode syntax** and
states an incorrect "universal" command pattern (`sessions:<sub>:<ws>` as if the
workspace suffix were always required) that doesn't hold for flat-mode consumer
projects, where the suffix is optional and defaults to the active workspace. This is the
same finding the original doc-survey sub-agent flagged before question design, now
independently re-confirmed by the quiz sub-agent without being told about it in advance.

---

## Open questions / follow-ups

- **F6 and F7 are real product bugs, not just documentation gaps**, and should probably
  become their own fix tickets (F6: either wire up `VITE_ENABLE_FLOWLENS` to actually do
  something, or remove it and the misleading doc instructions entirely; F7: read
  `FlowEngine.ts` to determine ground truth for `flow.transition`'s actual firing
  condition and correct whichever doc is wrong).
- **Would a "trap density" that's too high start training agents to over-flag
  disagreements that don't exist?** This run had 3 real, deliberately-verified
  discrepancies out of 15 questions (20%) and the agent correctly caught all 3 without
  any false positives (e.g. Q14's master-key question was designed as a "these actually
  agree" calibration item, and the agent correctly did not invent a discrepancy there).
  Worth watching in a future round with a different trap ratio to see if that calibration
  holds.
- **This format (fixed, pre-verified questionnaire) is more expensive to build than
  Report 01's open-ended task list** (required a full doc survey + independent
  source-verification pass before the quiz could even be written) but produced much
  higher-confidence, individually-gradable findings. Worth considering as the standard
  format for testing comprehension specifically, while keeping Report 01's task-execution
  format for testing hands-on capability — they test different things and neither
  subsumes the other.
