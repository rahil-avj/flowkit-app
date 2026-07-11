// Platform command: regenerates .agent/* docs and the chosen agent's memory file (agent:sync).
import fs from 'fs'
import path from 'path'
import {
  ROOT,
  workspacePath,
  isRepoMode,
  PLATFORM_WORKSPACES_FILE,
  requireActiveWorkspace,
} from '../helpers/paths.js'
import { g, r, b, d } from '../helpers/colors.js'
import { readJson, writeJson } from '../helpers/json.js'
import {
  AGENT_SPEC_VERSION,
  specContext,
  directives,
  indexRows,
  platformSurfaces,
  cliRows,
} from './agent-spec.js'

// ─── Supported agent targets: single source → each tool's native memory file ─────

export const AGENT_TARGETS = {
  claude: { label: 'Claude Code (CLAUDE.md)', file: 'CLAUDE.md' },
  agents: { label: 'AGENTS.md (cross-tool standard)', file: 'AGENTS.md' },
  cursor: { label: 'Cursor (.cursor/rules)', file: '.cursor/rules/flowkit.mdc' },
  none: { label: 'None (.agent docs only)', file: null },
}

// ─── Directive formatting ─────────────────────────────────────────────────────────

function fmtRule(rule) {
  if (rule.kind === 'never') return `- **NEVER** ${rule.text}`
  if (rule.kind === 'always') return `- **ALWAYS** ${rule.text}`
  return `- **TO** ${rule.task} **→** ${rule.action}`
}

/** The ~handful of hardest rules, inlined into the memory file so they're loaded up-front. */
function topDirectives(ctx) {
  const flat = directives(ctx).flatMap(grp => grp.rules)
  const want = [
    flat.find(x => x.text?.includes('_playFlow.ts')),
    flat.find(x => x.text?.includes('outside')),
    flat.find(
      x =>
        x.text?.includes('useDashboard()` — navigation') ||
        x.text?.includes('navigateTo` from `useDashboard')
    ),
    flat.find(x => x.text?.includes('path aliases')),
    flat.find(x => x.text?.includes('hardcode hex')),
    flat.find(x => x.text?.includes('injected from')),
    flat.find(x => x.text?.includes('secret phrase')),
  ].filter(Boolean)
  return want
}

// ─── .agent/*.md renderers ────────────────────────────────────────────────────────

export function renderRules(ctx) {
  const groups = directives(ctx)
    .map(grp => {
      const preamble = grp.preamble ? `\n\n${grp.preamble}` : ''
      return `## ${grp.group}${preamble}\n\n${grp.rules.map(fmtRule).join('\n')}`
    })
    .join('\n\n')
  return (
    `# Rules — ${ctx.name}\n\n` +
    `Directives the agent operates under. Grammar: **NEVER** (hard stop), **ALWAYS** (default), ` +
    `**TO** \`<task>\` **→** \`<action>\` (the one right way).\n\n` +
    `${groups}\n\n` +
    `_Generated from the platform spec (v${AGENT_SPEC_VERSION}). Run \`flowkit agent:sync\` to refresh._\n`
  )
}

export function renderIndex(ctx) {
  const rows = indexRows(ctx)
    .map(x => `| ${x.task} | ${x.action} | ${x.detail} |`)
    .join('\n')
  return (
    `# INDEX — ${ctx.name}\n\n` +
    `The map. Find your task, go straight to the action — no blind search.\n` +
    `Read order for a cold start: **rules.md → this INDEX → platform.md** (depth only when a row points there).\n\n` +
    `| Task | Action | Detail |\n|---|---|---|\n${rows}\n\n` +
    `Detail lives in \`.agent/platform.md\` and \`/Documentation/*.md\`. Product specifics live in \`.agent/project.md\`.\n\n` +
    `_Generated (spec v${AGENT_SPEC_VERSION}) — \`flowkit agent:sync\` to refresh._\n`
  )
}

export function renderPlatform(ctx) {
  const surfaces = platformSurfaces(ctx)
    .map(
      s =>
        `### ${s.area}\n- **Use:** ${s.api}\n- **From:** ${s.from}\n- **Note:** ${s.note}\n- **Full detail:** \`Documentation/${s.doc}\``
    )
    .join('\n\n')
  const cli = cliRows(ctx)
    .map(x => `| \`${x.cmd}\` | ${x.what} |`)
    .join('\n')
  return (
    `# Platform reference — ${ctx.name}\n\n` +
    `Terse map of the platform surfaces you can reach. Each ends in a pointer to the full doc.\n\n` +
    `${surfaces}\n\n` +
    `## CLI\n\n| Command | What |\n|---|---|\n${cli}\n\n` +
    `\n> **Flow ordering** is set in \`workspace.ts\` → \`projects.<proj>.flows[]\`. Use the **Manage tab** (right panel → Manage) to generate a terminal script for reordering.\n>\n> **Default screen** (cold load / device home button / reset-to-first) is set in \`workspace.ts\` → \`startScreen\`; a flowplan's \`homeScreen\` overrides it while that plan is playing.\n>\n> **To remove a flow or screen**, delete the folder manually: \`rm -rf workspaces/${ctx.name}/flows/<flow>/\`\n\n` +
    `_Generated (spec v${AGENT_SPEC_VERSION}). Facts mirror the platform source — \`flowkit agent:sync\` to refresh._\n`
  )
}

// ─── Memory file (per-agent) ──────────────────────────────────────────────────────

export function renderMemory(ctx) {
  const top = topDirectives(ctx).map(fmtRule).join('\n')
  return (
    `# FlowKit workspace — ${ctx.name}\n\n` +
    `You are building a product inside a **FlowKit** workspace (screens = React components, ` +
    `flows = ordered screen sequences). You edit \`workspaces/${ctx.name}/\` only; \`src/\` is platform code.\n\n` +
    `**Screens live under \`flows/<flow>/<screen>/\`.** Journeys are declared in \`flowplans/<flow>.ts\`. There is no \`_playFlow.ts\` and no \`flows/router.tsx\`.\n\n` +
    `**Start here:** read \`.agent/rules.md\` (directives) and \`.agent/INDEX.md\` (task → where to go), ` +
    `then \`.agent/project.md\` (what this product is). Use the INDEX to find anything — do not search blindly.\n\n` +
    `## Non-negotiables (full set in \`.agent/rules.md\`)\n\n${top}\n\n` +
    `_Generated by FlowKit (spec v${AGENT_SPEC_VERSION}) — \`flowkit agent:sync\` to refresh._\n`
  )
}

// ─── project.md (hand-owned — created once, NEVER regenerated) ────────────────────

export function renderProjectStub(name) {
  return (
    `# Project Brief — ${name}\n\n` +
    `<!-- HAND-OWNED. \`flowkit agent:sync\` never overwrites this file. Fill it in as the product takes shape. -->\n\n` +
    `## What this product is\n<!-- One paragraph: the product and who uses it -->\n\n` +
    `## Target platform\n- OS:\n- Primary device:\n- Form factor:\n\n` +
    `## Flows\n\n| Flow ID | Label | Entry screen | Purpose |\n|---|---|---|---|\n| demo-flow | Demo | DemoScreen | Starter demo |\n\n` +
    `## Data model\n<!-- Shape of data/db.ts and what each key means -->\n\n` +
    `## Decisions & constraints\n<!-- e.g. "Auth is always mocked — never show a real login form" -->\n`
  )
}

// ─── The transformation: spec → the full file set for a chosen agent ──────────────

/** Returns { ".agent/INDEX.md": "...", ... , [memoryFile]: "..." } (excludes project.md). */
export function renderAgentFiles(ctx, agent) {
  const out = {
    '.agent/INDEX.md': renderIndex(ctx),
    '.agent/rules.md': renderRules(ctx),
    '.agent/platform.md': renderPlatform(ctx),
  }
  const target = AGENT_TARGETS[agent] ?? AGENT_TARGETS.agents
  if (target.file) out[target.file] = renderMemory(ctx)
  return out
}

// ─── Per-workspace meta (formatter state for sync/check) ──────────────────────────

export function metaPath(ws) {
  return path.join(workspacePath(ws), '.agent', '.agent-meta.json')
}

export function writeAgentMeta(ws, ctx, agent) {
  const dir = path.join(workspacePath(ws), '.agent')
  fs.mkdirSync(dir, { recursive: true })
  writeJson(metaPath(ws), {
    agent,
    kit: ctx.kit,
    language: ctx.language,
    specVersion: AGENT_SPEC_VERSION,
  })
}

export function readAgentMeta(ws) {
  return readJson(metaPath(ws))
}

/** Resolve render context (kit/language) — prefer .agent-meta.json, else read from workspaces.json. */
export function ctxFor(ws) {
  const meta = readAgentMeta(ws)
  let kit = meta?.kit ?? 'none'
  let language = meta?.language ?? 'ts'
  if (!meta) {
    try {
      const src = fs.readFileSync(PLATFORM_WORKSPACES_FILE, 'utf8')
      const entry = src.match(new RegExp(`\\{[^}]*name:\\s*["']${ws}["'][^}]*\\}`))
      if (entry) {
        const km = entry[0].match(/kit:\s*["']([^"']+)["']/)
        const lm = entry[0].match(/language:\s*["']([^"']+)["']/)
        if (km) kit = km[1]
        if (lm) language = lm[1]
      }
    } catch {
      /* defaults */
    }
  }
  const isStandalone =
    kit !== 'none' && fs.existsSync(path.join(ROOT, 'src', 'kits', 'standalone', kit))

  return specContext({ name: ws, kit, isStandalone, language })
}

// ─── Commands ─────────────────────────────────────────────────────────────────────

/** flowkit agent:sync[:<ws>] [--agent:<target>] — re-emit generated files (never project.md). */
export function cmdAgentSync(val, args = []) {
  const ws = (val || '').trim() || requireActiveWorkspace('flowkit agent:sync')
  const wsDir = workspacePath(ws)
  if (!fs.existsSync(wsDir)) {
    console.error(r(`✗ Workspace not found: ${wsDir}`))
    process.exit(1)
  }
  // Display label only — wsDir (used for all actual reads/writes below) is already
  // correct in both modes. Flat mode has no workspaces/<name>/ subpath to print.
  const wsLabel = isRepoMode() ? `workspaces/${ws}` : '.'

  const flagAgent = (args.find(a => a.startsWith('--agent:')) || '').split(':')[1]
  const meta = readAgentMeta(ws)
  const agent = flagAgent || meta?.agent || 'agents'
  if (!AGENT_TARGETS[agent]) {
    console.error(
      r(`✗ Unknown agent: ${agent}`) + d(`  (${Object.keys(AGENT_TARGETS).join(', ')})`)
    )
    process.exit(1)
  }

  const ctx = ctxFor(ws)

  // If switching away from a previous agent, remove its stale memory file.
  if (meta?.agent && meta.agent !== agent) {
    const prev = AGENT_TARGETS[meta.agent]?.file
    if (prev && fs.existsSync(path.join(wsDir, prev))) {
      fs.rmSync(path.join(wsDir, prev))
      console.log(d(`  removed previous ${meta.agent} memory file: ${prev}`))
    }
  }

  // Remove legacy files superseded by the new layout (BOOTSTRAP.md → INDEX.md).
  const legacy = path.join(wsDir, '.agent', 'BOOTSTRAP.md')
  if (fs.existsSync(legacy)) {
    fs.rmSync(legacy)
    console.log(d('  removed legacy .agent/BOOTSTRAP.md (→ INDEX.md)'))
  }

  const files = renderAgentFiles(ctx, agent)
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(wsDir, rel)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, content)
    console.log(g('✓') + ' ' + b(`${wsLabel}/${rel}`))
  }
  // Ensure project.md exists but NEVER overwrite it.
  const projPath = path.join(wsDir, '.agent', 'project.md')
  if (!fs.existsSync(projPath)) {
    fs.writeFileSync(projPath, renderProjectStub(ws))
    console.log(g('✓') + ' ' + b(`${wsLabel}/.agent/project.md`) + d(' (created)'))
  } else console.log(d('  · .agent/project.md preserved (hand-owned)'))

  writeAgentMeta(ws, ctx, agent)
  console.log(g('✓') + ` Agent files synced for ${b(ws)} ` + d(`→ ${AGENT_TARGETS[agent].label}`))
}
