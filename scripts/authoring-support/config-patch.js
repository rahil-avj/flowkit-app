/**
 * config-patch.js
 * Surgical read/write helpers for flowkit.config.ts.
 * All operations use read → modify → full regeneration to avoid regex fragility.
 */

import fs from 'fs'
import path from 'path'

function getConfigPath(wsDir) {
  return path.join(wsDir, 'flowkit.config.ts')
}

// Fallback import line if a config file somehow has none to preserve (should
// not happen for any real scaffolded file, repo-mode or flat-mode/standalone).
const DEFAULT_IMPORT_LINE = `import { defineConfig } from 'flowkit'`

/** Parse flowkit.config.ts into a plain JS object without TypeScript compilation. */
function readConfig(wsDir) {
  const configPath = getConfigPath(wsDir)
  if (!fs.existsSync(configPath)) throw new Error(`flowkit.config.ts not found at ${configPath}`)

  let src = fs.readFileSync(configPath, 'utf8')
  // Capture the import line verbatim rather than discarding it — repo-mode
  // configs import defineConfig from '@platform/core/config', flat/standalone
  // configs import it from the published 'flowkit' package. Hardcoding either
  // one in writeConfig() below would silently break the other mode's build
  // the next time any authoring command mutates the file (confirmed live:
  // create:flow rewrote a flat-mode project's working import into the
  // repo-mode path, and nothing caught it until `npm run build` failed).
  const importMatch = src.match(/^import\s+.*$/m)
  const importLine = importMatch ? importMatch[0] : DEFAULT_IMPORT_LINE
  // Strip the import line (always the same single line)
  src = src.replace(/^import\s+.*\n/m, '')
  // Replace `export default defineConfig(` with a returnable expression
  src = src.replace(/export\s+default\s+defineConfig\s*\(/, 'return (')

  const raw = new Function(src)()
  return {
    workspace: raw.workspace || { name: path.basename(wsDir) },
    flows: raw.flows || [],
    screenOrder: raw.screenOrder || {},
    _importLine: importLine,
  }
}

/** Quote a flow ID if it's not a valid JS identifier (e.g. contains hyphens). */
function quoteKey(key) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`
}

/** Format a screenOrder entry — inline for ≤4 screens, multiline for ≥5. */
function formatScreenArray(screens) {
  if (!screens || screens.length === 0) return '[]'
  if (screens.length <= 4) {
    return `[${screens.map(s => `'${s}'`).join(', ')}]`
  }
  const inner = screens.map(s => `      '${s}',`).join('\n')
  return `[\n${inner}\n    ]`
}

/** Regenerate the entire flowkit.config.ts from a plain config object. */
function writeConfig(wsDir, config) {
  const configPath = getConfigPath(wsDir)
  const flowsStr = config.flows.map(f => `    '${f}',`).join('\n')

  let soEntries = ''
  if (Object.keys(config.screenOrder).length > 0) {
    soEntries = Object.entries(config.screenOrder)
      .map(([flow, screens]) => `    ${quoteKey(flow)}: ${formatScreenArray(screens)},`)
      .join('\n')
  }

  const lines = [
    config._importLine || DEFAULT_IMPORT_LINE,
    ``,
    `export default defineConfig({`,
    `  workspace: { name: '${config.workspace.name}' },`,
    `  flows: [`,
    flowsStr,
    `  ],`,
  ]

  if (soEntries) {
    lines.push(`  screenOrder: {`)
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
  config.screenOrder[flowId] = []
  writeConfig(wsDir, config)
}

export function removeFlow(wsDir, flowId) {
  const config = readConfig(wsDir)
  config.flows = config.flows.filter(f => f !== flowId)
  delete config.screenOrder[flowId]
  writeConfig(wsDir, config)
}

export function addScreen(wsDir, flowId, screenId, position) {
  const config = readConfig(wsDir)
  if (!config.screenOrder[flowId]) config.screenOrder[flowId] = []
  if (config.screenOrder[flowId].includes(screenId)) {
    throw new Error(`Screen '${screenId}' already exists in flow '${flowId}'`)
  }
  if (position !== undefined && position !== null && position >= 0) {
    config.screenOrder[flowId].splice(position, 0, screenId)
  } else {
    config.screenOrder[flowId].push(screenId)
  }
  writeConfig(wsDir, config)
}

export function removeScreen(wsDir, flowId, screenId) {
  const config = readConfig(wsDir)
  if (!config.screenOrder[flowId]) return
  config.screenOrder[flowId] = config.screenOrder[flowId].filter(s => s !== screenId)
  writeConfig(wsDir, config)
}

export function renameScreen(wsDir, flowId, oldId, newId) {
  const config = readConfig(wsDir)
  const screens = config.screenOrder[flowId]
  if (!screens) throw new Error(`Flow '${flowId}' not found in config`)
  const idx = screens.indexOf(oldId)
  if (idx === -1) throw new Error(`Screen '${oldId}' not found in flow '${flowId}'`)
  config.screenOrder[flowId][idx] = newId
  writeConfig(wsDir, config)
}

export function moveScreen(wsDir, screenId, fromFlowId, toFlowId) {
  const config = readConfig(wsDir)
  const fromScreens = config.screenOrder[fromFlowId] || []
  const fromIdx = fromScreens.indexOf(screenId)
  if (fromIdx === -1) throw new Error(`Screen '${screenId}' not found in flow '${fromFlowId}'`)
  config.screenOrder[fromFlowId].splice(fromIdx, 1)
  if (!config.screenOrder[toFlowId]) config.screenOrder[toFlowId] = []
  config.screenOrder[toFlowId].push(screenId)
  writeConfig(wsDir, config)
}

/** List all screenIds across all flows (or just one flow). */
export function listScreens(wsDir, flowId) {
  const config = readConfig(wsDir)
  if (flowId) {
    return { [flowId]: config.screenOrder[flowId] || [] }
  }
  return config.screenOrder
}

/** Check if a screenId exists anywhere in the workspace config. */
export function screenExists(wsDir, screenId) {
  const config = readConfig(wsDir)
  return Object.values(config.screenOrder).some(screens => screens.includes(screenId))
}

/** Check if a flowId exists in the workspace config. */
export function flowExists(wsDir, flowId) {
  const config = readConfig(wsDir)
  return config.flows.includes(flowId)
}
