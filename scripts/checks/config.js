// flowkit check:config — flowkit.config.ts consistency rules, plus the shared esbuild-based
// TypeScript module reader other check domains (flowplans.js) reuse.
//
// Reuses the exact esbuild-bundle-then-import() pattern already implemented in
// scripts/helpers/vite-plugin.js's readFlowkitConfig() — not reinvented here — so reading
// authored .ts files at runtime doesn't require adding tsx/jiti or any new dependency.
import fs from 'fs'
import path from 'path'
import os from 'os'
import esbuild from 'esbuild'

// Shared shim so esbuild can bundle files that `import { defineConfig, defineFlow } from
// 'flowkit'` (or '@platform/core/config' in repo mode) without needing the real package
// resolvable — identity functions are all any of these files actually need at check-time.
const SHIM_SPECIFIERS = ['flowkit', '@platform/core/config']

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
  const fileUrl = `file://${outfile}?t=${Date.now()}`
  const mod = await import(fileUrl)
  return mod.default ?? mod
}

/** Reads workspace/flowkit.config.ts, returning the evaluated FlowkitConfig object, or null. */
export async function readWorkspaceConfig(wsDir) {
  return readTsModule(path.join(wsDir, 'flowkit.config.ts'))
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
  const flowsDir = path.join(wsDir, 'flows')

  for (const flowId of Object.keys(screenOrder)) {
    if (!flows.includes(flowId)) {
      report.add({
        ruleId: 'config/flow-mismatch',
        severity: 'error',
        file: 'flowkit.config.ts',
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
        file: 'flowkit.config.ts',
        message: `Flow '${flowId}' has no screens in screenOrder.`,
        fix: `flowkit create:screen --flow:${flowId} --name:<id>`,
      })
      continue
    }

    for (const screenId of screenIds) {
      const screenDir = path.join(flowsDir, flowId, screenId)
      if (!fs.existsSync(screenDir)) {
        report.add({
          ruleId: 'config/orphaned-id',
          severity: 'error',
          file: 'flowkit.config.ts',
          message: `screenOrder.${flowId} lists '${screenId}', which has no matching directory.`,
          fix: `Expected: flows/${flowId}/${screenId}/`,
          clifix: `flowkit create:screen --flow:${flowId} --name:${screenId}`,
        })
      }
    }

    // Directories present on disk but never registered in screenOrder.
    const flowDir = path.join(flowsDir, flowId)
    if (fs.existsSync(flowDir)) {
      for (const dirName of fs.readdirSync(flowDir)) {
        if (!fs.statSync(path.join(flowDir, dirName)).isDirectory()) continue
        if (!screenIds.includes(dirName)) {
          report.add({
            ruleId: 'config/orphaned-dir',
            severity: 'warning',
            file: 'flowkit.config.ts',
            message: `flows/${flowId}/${dirName}/ exists but is not listed in screenOrder.${flowId}.`,
            fix: `Add '${dirName}' to screenOrder.${flowId}, or remove the directory if unused.`,
          })
        }
      }
    }
  }
}
