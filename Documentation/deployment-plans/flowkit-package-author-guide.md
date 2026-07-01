# Working with FlowKit as a Package (Author Guide)

> Describes the end state of [think-thrugh-what-we-snug-thacker.md](./think-thrugh-what-we-snug-thacker.md) — what it's like to use FlowKit once Phases 1-4 ship. Written ahead of the implementation so the target experience is unambiguous while building toward it. Update this file if a locked decision in the plan changes.

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
├── flows/
│   └── onboarding/
│       └── welcome/
│           └── WelcomeScreen.tsx
├── flowplans/
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

`flowkit.config.ts` — your flows and screen order:

```ts
import { defineConfig } from 'flowkit'

export default defineConfig({
  flows: ['onboarding'],
  screenOrder: { onboarding: ['welcome'] },
})
```

`vite.config.ts` — wires in the engine:

```ts
import { defineConfig } from 'vite'
import { flowkit } from 'flowkit/vite'

export default defineConfig({ plugins: [flowkit()] })
```

The plugin reads your config, generates the screen/config virtual modules, and enables HMR for `./flows/**`. You don't touch glob patterns or aliases — that's all internal to the plugin.

## Adding a screen

1. `flows/<flow>/<screen-id>/<ScreenName>.tsx`
2. Add the screen id to `screenOrder.<flow>` in `flowkit.config.ts`
3. Save — dev server picks it up via HMR, no restart

Screens only ever import from React and the platform-injected props:

```tsx
import type { FlowScreenProps } from 'flowkit'

export default function WelcomeScreen({ onNext, db }: FlowScreenProps) {
  return <button onClick={onNext}>Hello {db?.user?.name}</button>
}
```

## Adding a flowplan step

Edit `flowplans/<flow>.ts`, append to `steps[]`:

```ts
{ screenId: 'welcome', on: 'next', actionNote: 'user taps continue' }
```

## CLI

Same commands as repo mode, scoped to your project root automatically (`status`, `sessions:ls`, `dump`, `export`, `handoff`, `feedback:ls`, etc.) — see `docs/CLI.md`.

`flowkit nw` / `flowkit rw` don't apply here — those are repo-mode-only (multi-workspace) commands. Use `npm create flowkit-app@latest` to start a new project instead.

> **Naming note:** the unscoped npm name `create-flowkit` is already registered to an unrelated package, so the scaffolder publishes as `create-flowkit-app` and the command is `npm create flowkit-app@latest` (not `npm create flowkit@latest`). See the "create-flowkit" entry in [think-thrugh-what-we-snug-thacker.md](./think-thrugh-what-we-snug-thacker.md) for the full reasoning.

## Upgrading

```bash
npm update flowkit
```

`docs/` in your project is a point-in-time copy from scaffold — it won't auto-update. Read `node_modules/flowkit/docs/` for the current version's reference if something seems stale.

## If you're developing FlowKit itself (not an author)

This guide describes the _consumer_ experience. If you're working inside this repo (developing FlowKit itself), you're still in repo/dev mode with `workspaces/<name>/` and the multi-workspace switcher — see the root [CLAUDE.md](../../CLAUDE.md) instead.
