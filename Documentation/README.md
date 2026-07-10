# FlowKit Knowledge Base

The platform docs. Each file is the source of truth for one subsystem — find the one that
matches your task.

| Doc                            | Read it when you need…                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [FLOWKIT.md](FLOWKIT.md)       | The platform itself — structure, `@platform`/`@workspace` aliases, kit system, canvas + simulator, mock db, theming, feedback, entry guards, export vs build, and the agent bootstrap system. **Start here.** |
| [FLOWMASTER.md](FLOWMASTER.md) | The flow engine — `_playFlow.ts` config reference, the `on:`/`interactions` map, screen props, entry guards, animations, auto-play, flow-local state, and the analytics events flows emit.                    |
| [FLOWLENS.md](FLOWLENS.md)     | Session recording (FlowTracer) + replay & analytics (FlowLens) — event types, presence-based build gating, the committed session library, and the reports/heatmap surfaces.                         |
| [AGENTS.md](AGENTS.md)         | How a coding agent operates a workspace — cold-start read order, task recipes, the `NEVER`/`ALWAYS`/`TO` directive grammar, and the `agent:sync` single-source system.                                        |
| [CLI.md](CLI.md)               | The full `flowkit` command reference — workspaces, flows, screens, registry, sessions, agent files, export, handoff.                                                                                          |
| [AUDIT.md](AUDIT.md)           | The pre-release / onboarding checklist — every subsystem, file by file. Run before a release or refactor.                                                                                                     |

## How the pieces relate

```
FLOWKIT      platform foundation (everything below runs on it)
 ├─ FLOWMASTER   flows & screens — what you build
 ├─ FLOWLENS     record/replay/analyze how the build is used
 ├─ AGENTS       how an AI agent builds inside a workspace
 ├─ CLI          the tool that drives all of the above
 └─ AUDIT        verify it all holds together
```

Workspace-specific docs live in each workspace: `workspaces/<ws>/docs/overview.md` (human-facing)
and `workspaces/<ws>/.agent/*` (agent-facing, generated). This folder is platform-wide.
