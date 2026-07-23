# Working with FlowKit as a Package (Author Guide)

> Describes the end state of the FlowKit package/flat-mode distribution work (see `Documentation/product/vision/VISION.md`'s Distribution model section and `Documentation/product/vision/FEATURES.md`'s Package-Publish rows for status) — what it's like to use FlowKit once the packaging phases ship. Written ahead of the implementation so the target experience is unambiguous while building toward it. Update this file if a locked decision changes.

## Quick start

```bash
npm create flowkit-app@latest my-project
cd my-project
npm install
npm run dev
```

No `src/`, no `workspaces/`. Your project root is just your work.

## Project structure

```
my-project/
├── flowBook/
│   └── onboarding/
│       └── welcome/
│           └── WelcomeScreen.tsx
├── flowStories/
│   └── onboarding.ts
├── lib/
│   ├── data/db.ts
│   └── components/
├── docs/                  ← copied from flowkit's docs/ at scaffold time
├── flowkit.config.ts
├── vite.config.ts
└── CLAUDE.md              ← thin pointer to docs/, not duplicated reference
```

`node_modules/flowkit` is the engine. **Never edit it** — changes are lost on `npm update flowkit`.

## Config

`flowkit.config.ts` — your flows and page order:

```ts
import { defineConfig } from 'flowkit'

export default defineConfig({
  flows: ['onboarding'],
  pageOrder: { onboarding: ['welcome'] },
})
```

`vite.config.ts` — wires in the engine:

```ts
import { defineConfig } from 'vite'
import { flowkit } from 'flowkit/vite'

export default defineConfig({ plugins: [flowkit()] })
```

The plugin reads your config, generates the screen/config virtual modules, and enables HMR for `./flowBook/**`. You don't touch glob patterns or aliases — that's all internal to the plugin.

## Adding a screen

1. `flowBook/<flow>/<screen-id>/<ScreenName>.tsx` — the filename doesn't need a `Screen` suffix, and you can nest extra cosmetic folders between `<flow>` and `<screen-id>` if you want; only the first and last path segments matter for identity
2. Add the bare screen id to `pageOrder.<flow>` in `flowkit.config.ts` (pageOrder stays bare/flow-scoped — it's the flowplan step `pageId` that uses the composite `<flow>-<screen-id>` form, see below)
3. Save — dev server picks it up via HMR, no restart

Screens only ever import from React and the platform-injected props:

```tsx
import type { PageProps } from 'flowkit'

export default function WelcomeScreen({ onNext, db }: PageProps) {
  return <button onClick={onNext}>Hello {db?.user?.name}</button>
}
```

## Adding a flowplan step

Edit `flowStories/<flow>.ts`, append to `steps[]`:

```ts
{ pageId: 'onboarding-welcome', on: 'next', actionNote: 'user taps continue' }
```

(`pageId` is the composite `<flow>-<screen-id>` form here, not the bare id used in `pageOrder`.)

## CLI

Same commands as repo mode, scoped to your project root automatically (`status`, `sessions:ls`, `dump`, `export`, `handoff`, `feedback:ls`, etc.) — see `docs/CLI.md`.

`flowkit nw` / `flowkit rw` don't apply here — those are repo-mode-only (multi-workspace) commands. Use `npm create flowkit-app@latest` to start a new project instead.

> **Naming note:** the unscoped npm name `create-flowkit` is already registered to an unrelated package, so the scaffolder publishes as `create-flowkit-app` and the command is `npm create flowkit-app@latest` (not `npm create flowkit@latest`).

## Upgrading

```bash
npm update flowkit
```

`docs/` in your project is a point-in-time copy from scaffold — it won't auto-update. Read `node_modules/flowkit/docs/` for the current version's reference if something seems stale.

## If you're developing FlowKit itself (not an author)

This guide describes the _consumer_ experience. If you're working inside this repo (developing FlowKit itself), you're still in repo/dev mode with `workspaces/<name>/` and the multi-workspace switcher — see the root [CLAUDE.md](../CLAUDE.md) instead.
