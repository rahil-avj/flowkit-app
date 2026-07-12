# FlowKit Docs-Comprehension Questionnaire — Answer Key (DO NOT SHOW TO SUB-AGENT)

Verified against source by the orchestrating session before the sub-agent ever saw these
questions. Each answer cites the doc + line and, where relevant, the actual source file
that confirms or contradicts the doc's claim.

---

**Q1 (Discoverability/Fact).** In this project (flat mode, freshly scaffolded), does the
`workspaces/` folder exist? If not, where does "the workspace" actually live?

> **Answer:** No `workspaces/` folder — the project root itself is the one implicit
> workspace. Source: `CLAUDE.md` lines 13-14 ("This project is in **flat mode** — the
> project root is the one implicit workspace, no `workspaces/` folder").
> **Tests:** basic discoverability — is CLAUDE.md read at all.

---

**Q2 (Fact).** What command would you run to add a second, independent workspace to this
project, and what does it actually do to the project's structure?

> **Answer:** `flowkit convert:multi` — splits the flat project into multiple sibling
> workspace folders (converts to multi-workspace mode). After that, `flowkit
> create:workspace <name>` adds further workspaces. Source: `CLAUDE.md` lines 17-19.
> **Tests:** basic fact-finding.

---

**Q3 (Trap — "Common commands" accuracy).** CLAUDE.md's "Common commands" block lists
`flowkit status`, `flowkit sessions:ls`, and `flowkit export`. If you ran all three,
right now, in this exact project, would all three actually succeed?

> **Answer:** No — `flowkit export` would **fail**. `export`/`export:full`/`handoff` are
> repo-mode only and reject with an error in consumer/flat mode: `✗ flowkit export is not
> available in author (flat) projects. Use your project's own build command for now: npm
> run build`. Source: `docs/CLI.md` line 607 (verified against the actual behavior
> documented there). `status` and `sessions:ls` do work in all modes (CLI.md line 74,
> AGENTS.md line 219). CLAUDE.md's own "Common commands" list (lines 26-30) presents all
> three with no caveat, which is misleading in exactly this project.
> **Tests:** whether the agent takes CLAUDE.md's command list at face value or
> cross-checks against docs/CLI.md's mode restrictions. A correct answer requires
> catching that CLAUDE.md itself contains an inaccuracy for this specific project — this
> is the single highest-value question in the set for "does it just parrot vs. actually
> verify/synthesize."

---

**Q4 (Fact).** What UI kit is currently active in this project's styling, and what would
you have needed to do differently at scaffold time to get a different one?

> **Answer:** No kit — `--kit:none` is the default (`docs/CLI.md` line 123: "No kit —
> base structural styles only (default)"). To get a themed kit, `--kit:apple` or
> `--kit:material` would need to have been passed at `create-flowkit-app` scaffold time
> (this project was scaffolded without that flag). `lib/design-system/tokens.css` starts
> empty as a result (`CLAUDE.md` line 9).
> **Tests:** connecting CLAUDE.md's "no pre-installed kit" statement with CLI.md's actual
> flag/default — a real two-doc synthesis, not just one quote.

---

**Q5 (Fact/precision).** According to the CLI docs, what exactly happens if you run
`flowkit remove:step` without specifying `--index`?

> **Answer:** It does **not** error — it silently removes step **0** instead (`--index`
> defaults via `steps.splice(NaN, 1)`, and `NaN` coerces to `0` in that call). Source:
> `docs/CLI.md` line 519.
> **Tests:** precision — this is a genuinely surprising, easy-to-miss footgun; a shallow
> read might assume a missing required flag errors out (matching the pattern seen
> elsewhere in the CLI, e.g. `create:component`'s missing `--path`).

---

**Q6 (Fact/precision).** `promote:flow`'s `--fork` flag matches a fork label in the
source flowplan file. What's the one easy mistake that would make it silently fail to
match?

> **Answer:** Using single quotes instead of double quotes around the label —
> `docs/CLI.md` line 601: "double-quoted only — a single-quoted label in the source...
> will not match." (i.e. `--fork:"Fork label"` works, `--fork:'Fork label'` does not.)
> Notably, the doc itself flags that its OWN FlowPlan anatomy example (elsewhere in the
> same doc) uses single-quoted labels — so a reader who copies that example pattern
> would walk directly into this footgun. Bonus credit if the agent notices this
> self-referential detail, not just the quoting rule in isolation.
> **Tests:** fine-grained precision reading, not just gist comprehension.

---

**Q7 (Synthesis — env var vs. real mechanism, HIGH VALUE).** `docs/FLOWLENS-GUIDE.md`
says you can enable FlowLens in a production build with
`VITE_ENABLE_FLOWLENS=true npm run build`. Does that env var actually control whether
FlowLens ships in the build, and if not, what does?

> **Answer:** No — this is a **real, verified doc/product inconsistency**, not a trick
> question with a clean answer. `docs/FLOWLENS.md` (line 20-27, 31) describes the actual
> mechanism as **presence-based**: Vite resolves `import.meta.glob('.../modes/flowlens/index.ts')`
> at build time; if that file exists on disk, FlowLens is included, if not, it's
> tree-shaken out — "no env flag needed" (confirmed directly in source:
> `src/shared/contexts/FlowLensModeContext.tsx` line ~39, literal comment: "No env flag
> needed"). `VITE_ENABLE_FLOWLENS` is referenced in exactly one UI hint
> (`ManageContent.tsx`) and set by one script (`scripts/builders/export.js`'s
> `export:full` path) but is **never actually read** anywhere in the app/build logic to
> gate anything — confirmed via exhaustive grep across `src/`, `scripts/`, and all three
> vite configs. `FLOWLENS-GUIDE.md`'s instruction, taken literally in a consumer/flat-mode
> project (which has no `src/modes/flowlens/` folder at all, per `FLOWLENS.md` line 31,
> "cannot be re-enabled at build time"), would do nothing.
> **Tests:** the single hardest, highest-value question in the set. A shallow agent will
> either (a) not notice the contradiction at all and just repeat FLOWLENS-GUIDE.md's
> instruction as fact, or (b) notice the docs disagree but not go further to determine
> which one is actually true. A strong answer identifies the contradiction AND correctly
> resolves it in FLOWLENS.md's favor with the presence-based mechanism explained.
> Acceptable partial credit: correctly flags that the two docs contradict each other,
> even without resolving which is right (that alone is a meaningfully good answer given
> "docs only" constraints — full resolution technically requires reading source, which is
> out of bounds per the task rules, so don't penalize for not independently confirming
> against `FlowLensModeContext.tsx` if the doc constraint was followed properly. Do note
> if the agent breaks the "docs only" rule to check source — that's itself worth flagging
> in the report, positively or negatively depending on how it's framed to you.)

---

**Q8 (Trap — terminology overload).** `docs/CLI.md` distinguishes "flat *mode*" from
"flat *layout*." What's the difference, and why does it matter that they're not the same
thing?

> **Answer:** **Flat mode** = one of the three project modes (repo/flat/multi-workspace)
> — a scaffolded consumer project with the project root as the single implicit
> workspace, no `workspaces/` dir. **Flat layout** = a workspace-internal
> `flowkit.config.ts` structure choice (flows/screenOrder directly, vs. a nested
> `projects[]` subdivision) — this exists independently of which *mode* the project is
> in; a repo-mode workspace can use flat layout too. Source: `docs/CLI.md` lines 179-183,
> which explicitly warns: "'Flat-layout' here is unrelated to flat *mode*." This exact
> project (temp-test-02) is in flat *mode*, and (per its own `flowkit.config.ts`) also
> happens to use flat *layout* — so both apply simultaneously here, which makes it even
> easier to conflate them into one concept if not read carefully.
> **Tests:** whether the agent notices and preserves a deliberately fine terminology
> distinction the docs themselves warn about, or flattens two different concepts into one
> because they share a word.

---

**Q9 (Synthesis — cross-doc event semantics, genuinely ambiguous in the docs).** Does the
`flow.transition` analytics event fire on every screen navigation, or only when something
goes wrong (blocked/errored)? Cite where you found the answer.

> **Answer:** The docs themselves are **inconsistent** on this — a genuine, verified
> cross-doc discrepancy, not a test artifact. `docs/FLOWMASTER.md` line 248 says it's
> "emitted when a navigation resolves **with a problem**: a screen guard blocks it, or a
> step resolver throws" — implying conditional emission, only on problems.
> `docs/FLOWLENS.md` lines 98-99 describes it as firing when "a navigation **resolved**"
> generically, listing `warnings`/`error` as optional payload fields it "carries," not as
> the triggering condition — implying unconditional emission on every resolved nav.
> These read as genuinely different claims about when the same event fires.
> **Tests:** whether the agent, having read both docs, notices they disagree — most
> valuable if it explicitly flags the ambiguity rather than picking one doc's framing and
> presenting it as the single settled answer. A confident, unhedged answer citing only
> one of the two docs (without acknowledging the other's different framing) is a specific
> "flattened a real nuance" red flag.

---

**Q10 (Honest-unknown probe — deliberately unanswerable from these docs).** What are the
exact CSS custom property names (e.g. `--kit-*`) that a kit theme like `apple` or
`material` defines, and where would you look to find the complete list?

> **Answer:** **Not fully enumerable from the docs alone** — `docs/FLOWKIT.md` line 183
> explicitly declines to hardcode the list: "check the theme file directly for the
> current set rather than relying on a hardcoded list here." No doc in the set gives a
> complete `--kit-*` variable list. The honest answer is "the docs don't give a full list
> and explicitly say to check the theme file source directly instead" — NOT a fabricated
> list of variable names.
> **Tests:** the single most important red-flag question in the set. A hallucinated,
> confident list of made-up CSS variable names is a serious finding (fabrication under
> pressure to seem knowledgeable). Correctly saying "I don't have a complete answer, the
> docs point at source instead" is the CORRECT and desired response here, not a failure.

---

**Q11 (Fact — subtle default behavior).** In multi-workspace mode, if you omit
`--workspace:<name>` on an authoring command, which workspace does it target?

> **Answer:** The **first entry** in `package.json`'s `flowkit.workspaces` array.
> Source: `docs/CLI.md` line 417.
> **Tests:** whether a "seems obvious" default (first-declared, not e.g. alphabetical or
> most-recently-used) is actually verified against the doc rather than assumed.

---

**Q12 (Synthesis — doc scope mismatch, real gap).** `docs/FLOWLENS-GUIDE.md`'s CLI
Reference table states: "All session commands follow the pattern
`flowkit sessions:<sub>:<ws> [args]`." Is that actually true for a project like this one?

> **Answer:** **No** — this is a real, verified doc-scope gap.
> `docs/FLOWLENS-GUIDE.md` is written entirely in repo-mode command syntax throughout
> (colon-suffixed `:<ws>`, a fictional example workspace "nClarity") and never once
> mentions flat/multi-workspace consumer mode, unlike every other doc in the set which
> explicitly covers all three modes. In an actual flat-mode project like this one, you
> drop the `:<ws>` suffix entirely — just `flowkit sessions:ls`, no workspace suffix
> needed, since there's only the one implicit workspace. Following
> FLOWLENS-GUIDE.md's stated "pattern" literally in this project would produce
> incorrect/overcomplicated commands.
> **Tests:** whether the agent takes a doc's own stated "universal pattern" claim at
> face value, or checks it against the actual mode this project is in (which requires
> reading CLI.md's mode-aware command documentation as well, not just this one guide).

---

**Q13 (Fact — architecture/mechanism, medium synthesis).** Why does `flowkit export`
produce a smaller output bundle than `flowkit export:full`? What's the actual mechanism,
not just "one includes more stuff"?

> **Answer:** `export` strips FlowLens entirely; `export:full` preserves it. The
> mechanism (per `docs/FLOWLENS.md` lines 20-27) is Vite's `import.meta.glob`-based
> presence detection: if FlowLens's mode folder isn't referenced/available, Rollup's dead
> code elimination removes the entire chunk from the bundle — it's not a runtime flag
> check, it's a build-time structural exclusion. (Note: per Q7's finding, this same
> presence-based gate — not `VITE_ENABLE_FLOWLENS` — is the real mechanism throughout;
> a strong answer here should be consistent with whatever conclusion the agent reached in
> Q7.)
> **Tests:** genuine mechanistic understanding vs. surface-level "export:full has more
> features" restatement — and internal consistency with the agent's own Q7 answer.

---

**Q14 (Fact — safety-relevant).** What happens if you try to push feedback data to
JSONBin cloud sync using a master API key instead of a scoped access key?

> **Answer:** It **throws and refuses the request** — `assertNotMasterKey()` blocks it
> outright. Source: `docs/FLOWKIT.md` line 366. (This connects to `CLAUDE.md`'s own
> project-level architecture note that `jsonbin.ts` "enforces scoped Access Keys only,
> rejects master keys" — consistent across both docs, no discrepancy here, included as a
> contrast/calibration item since not every cross-doc check should turn up a problem.)
> **Tests:** whether the agent can find and correctly state a safety-relevant behavior,
> and recognizes when two docs actually DO agree (calibration against over-eagerly
> reporting false contradictions after several trap questions primed it to look for
> them).

---

**Q15 (Meta — overall platform understanding, open-ended).** In one paragraph, explain
what problem FlowKit's three-mode system (repo/flat/multi-workspace) solves, and why a
tool like this needs three modes instead of just one.

> **Answer:** No single "correct" sentence, but a strong answer should cover: repo mode
> is the FlowKit maintainers' own multi-workspace development environment (this
> monorepo); flat mode is the common case for an external author with one product/app to
> prototype (`create-flowkit-app`, no `workspaces/` folder — this project); multi-workspace
> (standalone) mode is for an author managing several independent apps/clients from one
> project without nesting them inside the monorepo's own `workspaces/` convention
> (`create-flowkit-workspace`). The distinction exists because packaging/distribution
> constraints differ: the monorepo needs multiple parallel workspaces switchable via
> browser UI for its own development, while published consumer packages need a
` node_modules`-based install that doesn't expose FlowKit's internals, and a project
> author might have anywhere from one to many independent apps. Source material spread
> across `CLAUDE.md`'s Package/Publish Mode section context (implied), `docs/CLI.md`'s
> mode table (lines 7-13 equivalent in the shipped doc), and `docs/FLOWKIT.md`'s
> structural overview.
> **Tests:** whether the agent has actually built a coherent mental model of the whole
> platform's purpose, vs. just accumulated disconnected facts from the 14 prior
> questions. This is the "does it actually understand the platform" capstone question.
