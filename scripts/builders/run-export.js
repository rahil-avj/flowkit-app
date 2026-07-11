// Mode-agnostic standalone-export build execution — no prompting. The caller
// (export.js) resolves mode/workspace/profile first and hands fully-resolved
// parameters here. Ships the full codebase always — no FlowLens on/off
// distinction right now (removed pending a proper feature-gating design).
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { PROJECT_CONFIG_FILENAME } from '../helpers/config-filenames.js'

/** Reads flowkit.json from `configRoot` (project root in consumer mode, repo ROOT in repo mode). */
export function readProjectConfig(configRoot) {
  const configPath = path.join(configRoot, PROJECT_CONFIG_FILENAME)
  if (!fs.existsSync(configPath)) return { exportDefaults: {}, exportProfiles: {} }
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    return {
      exportDefaults: parsed.exportDefaults ?? {},
      exportProfiles: parsed.exportProfiles ?? {},
    }
  } catch (e) {
    throw new Error(`Failed to parse ${PROJECT_CONFIG_FILENAME}: ${e.message}`)
  }
}

/** Substitutes {workspace}/{profile}/{date}/{time}/{timestamp} tokens in a filename template. */
function resolveFilename(template, ctx) {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 5).replace(':', '-')
  return template
    .replaceAll('{workspace}', ctx.workspaceName)
    .replaceAll('{profile}', ctx.profileName)
    .replaceAll('{date}', date)
    .replaceAll('{time}', time)
    .replaceAll('{timestamp}', `${date}-${time}`)
}

const DEFAULT_FILENAME_TEMPLATE = '{workspace}-{profile}-{timestamp}'

function resolveOutput({ outputRoot, defaultExportPath, workspaceName, profileName, profile }) {
  const exportPath = profile.exportPath ?? defaultExportPath
  const outDir = path.resolve(outputRoot, exportPath)
  const filenameTemplate = profile.exportName ?? DEFAULT_FILENAME_TEMPLATE
  const filename = resolveFilename(filenameTemplate, { workspaceName, profileName }) + '.html'
  return { outDir, filename }
}

/**
 * Runs a standalone single-HTML-file build for a consumer (flat/multi-workspace)
 * project, via a temp vite config using flowkit/vite's standalone: true mode.
 * `workspacePath` is the resolved workspace folder (project root in flat
 * mode); `projectRoot` is always the actual project root (where
 * node_modules/package.json live — may equal workspacePath in flat mode).
 */
export async function runConsumerExport({
  projectRoot,
  workspacePath,
  workspaceName,
  profileName,
  profile,
}) {
  const { outDir, filename } = resolveOutput({
    outputRoot: projectRoot,
    defaultExportPath: './dist',
    workspaceName,
    profileName,
    profile,
  })

  const configContent = `import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { flowkit } from 'flowkit/vite'

export default {
  plugins: [
    react(),
    flowkit({ workspaceRoot: ${JSON.stringify(workspacePath)}, standalone: true }),
    viteSingleFile(),
  ],
  build: {
    outDir: ${JSON.stringify(outDir)},
    emptyOutDir: false,
    cssCodeSplit: false,
  },
}
`

  // Written inside the project (not the OS temp dir) so Node's module
  // resolution for @vitejs/plugin-react / vite-plugin-singlefile / flowkit/vite
  // walks up to the consumer's own node_modules — a temp-dir path has no
  // node_modules ancestor to resolve against.
  const tmpConfigPath = path.join(projectRoot, `.flowkit-export-${Date.now()}.mjs`)
  fs.writeFileSync(tmpConfigPath, configContent)

  try {
    execSync(`npx vite build --config ${JSON.stringify(tmpConfigPath)}`, {
      cwd: projectRoot,
      stdio: 'inherit',
    })
  } finally {
    fs.unlinkSync(tmpConfigPath)
  }

  return finalizeOutput(outDir, filename)
}

/**
 * Runs a standalone single-HTML-file build for a repo-mode workspace, via the
 * monorepo's own vite.config.standalone.ts (which already supplies
 * @flowkit/@workspace/@flowkit-kit aliases + the flowkit/vite plugin for
 * virtual:flowkit/* modules).
 */
export async function runRepoExport({ root, workspaceName, profileName, profile }) {
  const { outDir, filename } = resolveOutput({
    outputRoot: root,
    defaultExportPath: './dist-standalone',
    workspaceName,
    profileName,
    profile,
  })

  execSync(`npx vite build --config vite.config.standalone.ts`, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      FLOWKIT_WORKSPACE: workspaceName,
      FLOWKIT_EXPORT_OUTDIR: path.relative(root, outDir) || '.',
    },
  })

  return finalizeOutput(outDir, filename)
}

function finalizeOutput(outDir, filename) {
  const builtHtml = path.join(outDir, 'index.html')
  if (!fs.existsSync(builtHtml)) {
    throw new Error(`Standalone build produced no index.html in ${outDir}`)
  }

  const finalPath = path.join(outDir, filename)
  if (builtHtml !== finalPath) {
    fs.renameSync(builtHtml, finalPath)
  }

  return { outDir, finalPath }
}
