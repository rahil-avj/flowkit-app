// Builder: standalone HTML export pipeline (export / export:full).
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { ROOT, workspacePath, requireRepoMode, listWorkspaceDirs } from '../helpers/paths.js'
import { g, r, b, d, c } from '../helpers/colors.js'
import { selectFromList } from '../helpers/prompt.js'
import { cmdSessionsCheck } from '../platform/sessions/index.js'

function runCheck(label, cmd, env) {
  process.stdout.write(`  ${d('checking')} ${label}… `)
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'pipe', env: { ...process.env, ...env } })
    process.stdout.write(g('✓') + '\n')
    return true
  } catch (e) {
    process.stdout.write(r('✗') + '\n')
    const out = (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '')
    const lines = out.split('\n').filter(Boolean).slice(0, 40)
    lines.forEach(l => console.log('  ' + d(l)))
    if (out.split('\n').length > 40) console.log(d('  … (truncated)'))
    return false
  }
}

const USE_GENERIC_NAME = true

function getStandaloneOutDir() {
  // Read outDir directly from vite.config.standalone.ts via a simple regex — avoids executing the config
  const configPath = path.join(ROOT, 'vite.config.standalone.ts')
  const src = fs.readFileSync(configPath, 'utf8')
  const match = src.match(/outDir\s*:\s*["'`]([^"'`]+)["'`]/)
  return match ? match[1] : 'dist-standalone'
}

const FLOWLENS_DIR = path.join(ROOT, 'src', 'modes', 'flowlens')
const FLOWLENS_DIR_STASH = path.join(ROOT, 'src', 'modes', '.flowlens-stash')

function buildStandalone(wsName, withLens = false) {
  console.log(d(`  building standalone for "${wsName}"${withLens ? ' (with FlowLens)' : ''}…`))
  // FlowLens inclusion is presence-based (see FlowLensModeContext.tsx's
  // import.meta.glob on src/modes/flowlens/index.ts) — there is no env-var
  // gate. To actually strip it from a plain `export`, rename the folder out
  // of the way for the duration of this build, then always restore it
  // afterward (even on failure), so the monorepo's own dev experience never
  // loses the folder permanently.
  const stashed = !withLens && fs.existsSync(FLOWLENS_DIR)
  if (stashed) fs.renameSync(FLOWLENS_DIR, FLOWLENS_DIR_STASH)
  try {
    execSync(`npx vite build --config vite.config.standalone.ts`, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, FLOWKIT_WORKSPACE: wsName },
    })
  } finally {
    if (stashed) fs.renameSync(FLOWLENS_DIR_STASH, FLOWLENS_DIR)
  }
  const outDir = getStandaloneOutDir()
  const outHtml = path.join(ROOT, outDir, 'index.html')
  if (!fs.existsSync(outHtml))
    throw new Error(`Standalone build produced no index.html in ${outDir}`)
  return { outHtml, outDir }
}

/** export:full — include FlowLens replay/analytics in the standalone build. */
export async function cmdExportFull(val, args = []) {
  return _cmdExport(val, args, true)
}

export async function cmdExport(val, args = []) {
  return _cmdExport(val, args, false)
}

async function _cmdExport(val, args = [], withLens = false) {
  requireRepoMode(
    'flowkit export',
    "Use your project's own build command for now:\n    npm run build"
  )

  // Legacy flag kept for backwards compat with any scripts that still pass it
  if (args.includes('--with-lens')) withLens = true
  const existing = listWorkspaceDirs()

  if (!existing.length) {
    console.error(r('✗ No workspaces found.'))
    process.exit(1)
  }

  // Single flat prompt — workspace names + "All workspaces"
  let targets
  if (val) {
    if (val === 'all') {
      targets = existing
    } else {
      targets = [val]
    }
  } else {
    const options = [...existing, '— All workspaces']
    console.log(c('? ') + 'Select export target (↑↓ Enter):')
    const selection = await selectFromList(options, null)
    console.log('\n')
    targets = selection.startsWith('—') ? existing : [selection]
  }

  // Validate all targets exist
  for (const ws of targets) {
    const wsDir = workspacePath(ws)
    if (!fs.existsSync(wsDir)) {
      console.error(r(`✗ Workspace not found: ${wsDir}`))
      process.exit(1)
    }
  }

  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 5).replace(':', '-')

  for (const wsName of targets) {
    console.log('')
    console.log(b(` Exporting: ${wsName}`))
    console.log(d(' ────────────────────────────────────'))

    // Pre-export checks. Lint target must be mode-aware — workspacePath()
    // resolves correctly in repo/flat/multi-workspace mode; a hardcoded
    // `workspaces/${wsName}` (the old code) only exists in repo mode and
    // silently breaks `flowkit export` under flat/multi-workspace mode.
    const wsDir = workspacePath(wsName)
    const tscOk = runCheck('TypeScript', 'npx tsc --noEmit')
    const lintOk = runCheck('ESLint', `npx eslint "${wsDir}" --max-warnings 0`)
    // FlowLens library — warn-only (a broken session shouldn't block an export).
    cmdSessionsCheck(wsName, { warnOnly: true })
    console.log('')

    if (!tscOk || !lintOk) {
      console.error(r(`✗ Export blocked for "${wsName}" — fix errors above.`))
      if (targets.length === 1) process.exit(1)
      continue
    }

    try {
      const { outHtml: builtHtml, outDir: relOutDir } = buildStandalone(wsName, withLens)
      const outDir = path.join(ROOT, relOutDir)
      const outName = USE_GENERIC_NAME ? 'index.html' : `${wsName}-${date}-${time}.html`
      const outPath = path.join(outDir, outName)
      let finalPath = outPath
      const isInPlace = builtHtml === outPath // true when USE_GENERIC_NAME and outDir matches vite's outDir
      // conflict check: file exists and was not just written by this build
      if (fs.existsSync(outPath) && !isInPlace) {
        const ext = path.extname(outName)
        const base = path.basename(outName, ext)
        const stampedName = `${base}_${date}-${time}${ext}`
        console.log(`\n  ${r('!')} File already exists: ${b(outName)}`)
        console.log(c('? ') + 'What would you like to do? (↑↓ Enter):')
        const choice = await selectFromList(
          [
            `Replace   — overwrite ${outName}`,
            `Keep both — save as ${stampedName}`,
            `Cancel    — discard this export`,
          ],
          null
        )
        console.log('\n')
        if (choice.startsWith('Cancel')) {
          if (fs.existsSync(builtHtml)) fs.unlinkSync(builtHtml)
          console.log(d('  Export cancelled.'))
          continue
        }
        if (choice.startsWith('Keep')) finalPath = path.join(outDir, stampedName)
      }
      // move built file to final destination unless it's already there (USE_GENERIC_NAME in-place case)
      if (!isInPlace) {
        fs.copyFileSync(builtHtml, finalPath)
        fs.unlinkSync(builtHtml)
      }
      const bytes = fs.statSync(finalPath).size
      const kb = (bytes / 1024).toFixed(1)
      const mb = bytes / (1024 * 1024)
      console.log('')
      console.log(g('✓') + ' Exported: ' + b(`${relOutDir}/${path.basename(finalPath)}`))
      console.log(d(`  ${kb} KB — fully self-contained, open in any browser`))
      if (mb > 10)
        console.log(
          r(
            `  ⚠ File is ${mb.toFixed(1)} MB — large assets may be inlined. Consider removing static imports of images/fonts.`
          )
        )
    } catch (e) {
      console.error(r(`✗ Build failed for "${wsName}": ${e.message}`))
      if (targets.length === 1) process.exit(1)
    }
  }
}
