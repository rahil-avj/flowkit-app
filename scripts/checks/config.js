// flowkit check:config — workspace config file consistency rules, plus the shared esbuild-based
// TypeScript module reader other check domains (flowplans.js) reuse.
//
// Reuses the exact esbuild-bundle-then-import() pattern already implemented in
// scripts/helpers/vite-plugin.js's readFlowkitConfig() — not reinvented here — so reading
// authored .ts files at runtime doesn't require adding tsx/jiti or any new dependency.
import fs from 'fs'
import path from 'path'
import os from 'os'
import { pathToFileURL } from 'url'
import esbuild from 'esbuild'
import { WORKSPACE_CONFIG_FILENAME, FLOW_BOOK_DIRNAME } from '../helpers/config-filenames.js'
import { isNonExistent, resolveVisibility } from '../../src/shared/utils/screenPathIdentity.js'

// Shared shim so esbuild can bundle files that `import { defineConfig, defineFlow } from
// 'flowkit'` (or '@flowkit-core/config' in repo mode) without needing the real package
// resolvable — identity functions are all any of these files actually need at check-time.
const SHIM_SPECIFIERS = ['flowkit', '@flowkit-core/config']

const SCREEN_EXTS = ['.tsx', '.jsx']

/**
 * Finds every screen-folder name (the last folder segment directly containing a real
 * screen file) anywhere under `flowDir`, at any depth. `__`-prefixed folders are pruned
 * from traversal entirely (as if they don't exist). Returns a Map<name, visibility> where
 * visibility ('normal'|'hidden') applies parent-dominance over the full segment chain
 * (from directly under flowDir down to the screen folder itself) — e.g. a screen folder
 * named 'details' nested under a `_secret/` cosmetic ancestor is itself reported as
 * 'hidden', matching resolveVisibility's semantics used everywhere else in the checks.
 */
function findScreenDirNames(flowDir) {
  const result = new Map()
  const walk = (dir, segments) => {
    let entries
    try {
      entries = fs.readdirSync(dir)
    } catch {
      return
    }
    const hasScreenFile = entries.some(
      e => !isNonExistent(e) && SCREEN_EXTS.some(ext => e.endsWith(ext)) && fs.statSync(path.join(dir, e)).isFile()
    )
    if (hasScreenFile) {
      const visibility = resolveVisibility(segments)
      if (visibility !== 'non-existent') {
        result.set(path.basename(dir), visibility === 'hidden' ? 'hidden' : 'normal')
      }
    }
    for (const entry of entries) {
      if (isNonExistent(entry)) continue // pruned entirely, as if it doesn't exist
      const full = path.join(dir, entry)
      if (fs.statSync(full).isDirectory()) walk(full, [...segments, entry])
    }
  }
  for (const entry of fs.readdirSync(flowDir)) {
    if (isNonExistent(entry)) continue
    const full = path.join(flowDir, entry)
    if (fs.statSync(full).isDirectory()) walk(full, [entry])
  }
  return result
}

async function readTsModule(filePath) {
  if (!fs.existsSync(filePath)) return null

  const shimFile = path.join(os.tmpdir(), 'flowkit-check-shim.mjs')
  if (!fs.existsSync(shimFile)) {
    fs.writeFileSync(
      shimFile,
      `export const defineConfig = c => c\n` +
        `export const defineFlow = f => f\n` +
        `export const tag = (label, opts) => ({ label, ...opts })\n`
    )
  }

  const hash = filePath.replace(/[^a-z0-9]/gi, '_').slice(-40)
  const outfile = path.join(os.tmpdir(), `flowkit-check-${hash}.mjs`)
  try {
    await esbuild.build({
      entryPoints: [filePath],
      bundle: true,
      format: 'esm',
      outfile,
      alias: Object.fromEntries(SHIM_SPECIFIERS.map(s => [s, shimFile])),
      external: ['react', 'react-dom'],
      logLevel: 'silent',
    })
  } catch {
    return null // genuine syntax error — tsc/eslint's job to report, not this rule's
  }
  const fileUrl = `${pathToFileURL(outfile).href}?t=${Date.now()}`
  const mod = await import(fileUrl)
  return mod.default ?? mod
}

/** Reads workspace/<WORKSPACE_CONFIG_FILENAME>, returning the evaluated FlowkitConfig object, or null. */
export async function readWorkspaceConfig(wsDir) {
  return readTsModule(path.join(wsDir, WORKSPACE_CONFIG_FILENAME))
}

/** Reads an arbitrary flowplan .ts file, returning the evaluated FlowplanDef object, or null. */
export async function readFlowplanModule(filePath) {
  return readTsModule(filePath)
}

/** Runs config-domain rules for one workspace. Appends findings to `report`. */
export async function checkConfig(wsDir, report) {
  const config = await readWorkspaceConfig(wsDir)
  if (!config) return // no config file, or it doesn't parse — nothing to cross-reference

  const flows = config.flows ?? []
  const screenOrder = config.screenOrder ?? {}
  const flowsDir = path.join(wsDir, FLOW_BOOK_DIRNAME)

  for (const flowId of Object.keys(screenOrder)) {
    if (!flows.includes(flowId)) {
      report.add({
        ruleId: 'config/flow-mismatch',
        severity: 'error',
        file: WORKSPACE_CONFIG_FILENAME,
        message: `screenOrder has an entry for flow '${flowId}', but it's not listed in flows[].`,
        fix: `Add '${flowId}' to flows[], or remove its screenOrder entry.`,
      })
      continue
    }

    const screenIds = screenOrder[flowId] ?? []
    if (screenIds.length === 0) {
      report.add({
        ruleId: 'config/empty-flow',
        severity: 'warning',
        file: WORKSPACE_CONFIG_FILENAME,
        message: `Flow '${flowId}' has no screens in screenOrder.`,
        fix: `flowkit create:screen --flow:${flowId} --name:<id>`,
      })
      continue
    }

    // Screen folders can now sit at any depth ≥1 under the flow dir (cosmetic
    // folders in between are allowed) — screenOrder still stores bare, flow-scoped
    // screen ids (the LAST folder segment), so find each one anywhere under flowDir.
    const flowDir = path.join(flowsDir, flowId)
    const screenDirNames = fs.existsSync(flowDir) ? findScreenDirNames(flowDir) : new Map()

    for (const screenId of screenIds) {
      if (!screenDirNames.has(screenId)) {
        report.add({
          ruleId: 'config/orphaned-id',
          severity: 'error',
          file: WORKSPACE_CONFIG_FILENAME,
          message: `screenOrder.${flowId} lists '${screenId}', which has no matching directory.`,
          fix: `Expected: ${FLOW_BOOK_DIRNAME}/${flowId}/.../${screenId}/`,
          clifix: `flowkit create:screen --flow:${flowId} --name:${screenId}`,
        })
      }
    }

    // Directories present on disk but never registered in screenOrder. `_`/`__`-prefixed
    // folders (or any `_`/`__`-prefixed ancestor of the screen folder) are intentionally
    // author-hidden/non-existent, not orphaned — skip both.
    for (const [dirName, visibility] of screenDirNames) {
      if (visibility === 'hidden') continue
      if (!screenIds.includes(dirName)) {
        report.add({
          ruleId: 'config/orphaned-dir',
          severity: 'warning',
          file: WORKSPACE_CONFIG_FILENAME,
          message: `A screen directory named '${dirName}' exists under ${FLOW_BOOK_DIRNAME}/${flowId}/ but is not listed in screenOrder.${flowId}.`,
          fix: `Add '${dirName}' to screenOrder.${flowId}, or remove the directory if unused.`,
        })
      }
    }
  }
}
