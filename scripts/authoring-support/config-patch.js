/**
 * config-patch.js
 * Surgical read/write helpers for the workspace config file (see WORKSPACE_CONFIG_FILENAME).
 * All operations use read → modify → full regeneration to avoid regex fragility.
 */

import fs from 'fs'
import path from 'path'
import { resolveDefineImport } from '../helpers/paths.js'
import { asJsStringLiteral } from '../helpers/validate.js'
import { WORKSPACE_CONFIG_FILENAME } from '../helpers/config-filenames.js'

function getConfigPath(wsDir) {
  return path.join(wsDir, WORKSPACE_CONFIG_FILENAME)
}

// Fallback import line if a config file somehow has none to preserve (should
// not happen for any real scaffolded file, repo-mode or flat-mode/standalone).
// Resolved per-mode rather than hardcoded — see resolveDefineImport().
function defaultImportLine() {
  return resolveDefineImport('defineConfig')
}

/** Parse the workspace config file into a plain JS object without TypeScript compilation. */
function readConfig(wsDir) {
  const configPath = getConfigPath(wsDir)
  if (!fs.existsSync(configPath))
    throw new Error(`${WORKSPACE_CONFIG_FILENAME} not found at ${configPath}`)

  let src = fs.readFileSync(configPath, 'utf8')
  // Capture the import line verbatim rather than discarding it — repo-mode
  // configs import defineConfig from '@flowkit-core/config', flat/standalone
  // configs import it from the published 'flowkit' package. Hardcoding either
  // one in writeConfig() below would silently break the other mode's build
  // the next time any authoring command mutates the file (confirmed live:
  // create:flow rewrote a flat-mode project's working import into the
  // repo-mode path, and nothing caught it until `npm run build` failed).
  const importMatch = src.match(/^import\s+.*$/m)
  const importLine = importMatch ? importMatch[0] : defaultImportLine()
  // Strip the import line (always the same single line)
  src = src.replace(/^import\s+.*\n/m, '')
  // Replace `export default defineConfig(` with a returnable expression
  src = src.replace(/export\s+default\s+defineConfig\s*\(/, 'return (')

  const raw = new Function(src)()
  return {
    workspace: raw.workspace || { name: path.basename(wsDir) },
    flows: raw.flows || [],
    pageOrder: raw.pageOrder || {},
    _importLine: importLine,
  }
}

/** Quote a flow ID if it's not a valid JS identifier (e.g. contains hyphens). */
function quoteKey(key) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`
}

/** Format a pageOrder entry — inline for ≤4 screens, multiline for ≥5. */
function formatScreenArray(screens) {
  if (!screens || screens.length === 0) return '[]'
  if (screens.length <= 4) {
    return `[${screens.map(s => `'${s}'`).join(', ')}]`
  }
  const inner = screens.map(s => `      '${s}',`).join('\n')
  return `[\n${inner}\n    ]`
}

/** Regenerate the entire workspace config file from a plain config object. */
function writeConfig(wsDir, config) {
  const configPath = getConfigPath(wsDir)
  const flowsStr = config.flows.map(f => `    '${f}',`).join('\n')

  let soEntries = ''
  if (Object.keys(config.pageOrder).length > 0) {
    soEntries = Object.entries(config.pageOrder)
      .map(([flow, screens]) => `    ${quoteKey(flow)}: ${formatScreenArray(screens)},`)
      .join('\n')
  }

  const lines = [
    config._importLine || defaultImportLine(),
    ``,
    `export default defineConfig({`,
    `  workspace: { name: ${asJsStringLiteral(config.workspace.name)} },`,
    `  flows: [`,
    flowsStr,
    `  ],`,
  ]

  if (soEntries) {
    lines.push(`  pageOrder: {`)
    lines.push(soEntries)
    lines.push(`  },`)
  }

  lines.push(`})`)
  lines.push(``)

  fs.writeFileSync(configPath, lines.join('\n'))
}

// ─── Public API ───────────────────────────────────────────────────────────────

export { readConfig as readWorkspaceConfig }

export function addFlow(wsDir, flowId) {
  const config = readConfig(wsDir)
  if (config.flows.includes(flowId)) throw new Error(`Flow '${flowId}' already exists`)
  config.flows.push(flowId)
  config.pageOrder[flowId] = []
  writeConfig(wsDir, config)
}

export function removeFlow(wsDir, flowId) {
  const config = readConfig(wsDir)
  config.flows = config.flows.filter(f => f !== flowId)
  delete config.pageOrder[flowId]
  writeConfig(wsDir, config)
}

export function addScreen(wsDir, flowId, pageId, position) {
  const config = readConfig(wsDir)
  if (!config.pageOrder[flowId]) config.pageOrder[flowId] = []
  if (config.pageOrder[flowId].includes(pageId)) {
    throw new Error(`Screen '${pageId}' already exists in flow '${flowId}'`)
  }
  if (position !== undefined && position !== null && position >= 0) {
    config.pageOrder[flowId].splice(position, 0, pageId)
  } else {
    config.pageOrder[flowId].push(pageId)
  }
  writeConfig(wsDir, config)
}

export function removeScreen(wsDir, flowId, pageId) {
  const config = readConfig(wsDir)
  if (!config.pageOrder[flowId]) return
  config.pageOrder[flowId] = config.pageOrder[flowId].filter(s => s !== pageId)
  writeConfig(wsDir, config)
}

export function renameScreen(wsDir, flowId, oldId, newId) {
  const config = readConfig(wsDir)
  const screens = config.pageOrder[flowId]
  if (!screens) throw new Error(`Flow '${flowId}' not found in config`)
  const idx = screens.indexOf(oldId)
  if (idx === -1) throw new Error(`Screen '${oldId}' not found in flow '${flowId}'`)
  config.pageOrder[flowId][idx] = newId
  writeConfig(wsDir, config)
}

export function moveScreen(wsDir, pageId, fromFlowId, toFlowId) {
  if (fromFlowId === toFlowId) {
    throw new Error(`Screen '${pageId}' is already in flow '${fromFlowId}'`)
  }
  const config = readConfig(wsDir)
  const fromScreens = config.pageOrder[fromFlowId] || []
  const fromIdx = fromScreens.indexOf(pageId)
  if (fromIdx === -1) throw new Error(`Screen '${pageId}' not found in flow '${fromFlowId}'`)
  if (config.pageOrder[toFlowId]?.includes(pageId)) {
    throw new Error(`Screen '${pageId}' already exists in flow '${toFlowId}'`)
  }
  config.pageOrder[fromFlowId].splice(fromIdx, 1)
  if (!config.pageOrder[toFlowId]) config.pageOrder[toFlowId] = []
  config.pageOrder[toFlowId].push(pageId)
  writeConfig(wsDir, config)
}

/** List all screenIds across all flows (or just one flow). */
export function listScreens(wsDir, flowId) {
  const config = readConfig(wsDir)
  if (flowId) {
    return { [flowId]: config.pageOrder[flowId] || [] }
  }
  return config.pageOrder
}

/** Check if a pageId exists anywhere in the workspace config. */
export function screenExists(wsDir, pageId) {
  const config = readConfig(wsDir)
  return Object.values(config.pageOrder).some(screens => screens.includes(pageId))
}

/** Check if a flowId exists in the workspace config. */
export function flowExists(wsDir, flowId) {
  const config = readConfig(wsDir)
  return config.flows.includes(flowId)
}
