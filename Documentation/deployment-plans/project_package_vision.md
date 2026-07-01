---
name: project-package-vision
description: 'FlowKit packaging strategy — ship as npm package so authors get a clean isolated project, plan approved and ready to build'
metadata:
  node_type: memory
  type: project
  originSessionId: ff457ad4-2a85-4613-80a4-920a980675d8
---

FlowKit is being restructured to ship as an npm package (git dep first, registry later). Authors install it and get CLI + engine in `node_modules`. Their project root is just `flows/`, `flowplans/`, `lib/`, `flowkit.config.ts` — no platform source visible.

**Why:** AI agents read `src/core/` unprompted and waste context on platform internals. Authors should only see their own work. `node_modules` gives universal agent/editor blindness by convention.

**Plan file:** `think-thrugh-what-we-snug-thacker.md` (this directory)

**Phases:**

1. Package foundation — `files`, `exports`, lib build, React as peerDep+devDep
2. `create-flowkit-app` scaffolder at `packages/create-flowkit-app/` — manual validation gate first (renamed from `create-flowkit`: that name is squatted by an unrelated package on npm; real command is `npm create flowkit-app@latest`)
3. Vite plugin (`flowkit/vite`) — virtual modules for screen + config loading, HMR invalidation
4. CLI flat mode — `isRepoMode()` detection, path routing

**Key decisions locked:**

- Config read in plugin: esbuild → temp .mjs → dynamic import() (NOT loadConfigFromFile)
- Config injection: `virtual:flowkit/config` virtual module (NOT import.meta.env string)
- `reconcileWorkspacesPlugin` must be gated — never runs in flat/author mode
- React in both `peerDependencies` AND `devDependencies`
- `create-flowkit-app` lives inside this repo at `packages/create-flowkit-app/`
- CLAUDE.md in scaffold is thin — points to `docs/`, no duplicated CLI content
- `manifest.js` must whitelist `packages/` before Phase 2 starts

**How to apply:** Reference the plan file before starting any Phase 1-4 work. Do not skip the Phase 2 manual validation gate.
