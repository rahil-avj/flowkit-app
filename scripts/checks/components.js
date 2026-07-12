// flowkit check:components — component registry rules.
import fs from 'fs'
import path from 'path'
import { readComponents } from '../authoring-support/agent-state.js'
import { findBarrel } from '../authoring/components.js'

function listComponentFiles(wsDir) {
  const rootDir = path.join(wsDir, 'lib', 'components')
  if (!fs.existsSync(rootDir)) return []
  const results = []
  const walk = dir => {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry)
      if (fs.statSync(full).isDirectory()) {
        walk(full)
      } else if (entry.endsWith('.tsx') && entry !== 'index.tsx') {
        results.push(path.relative(wsDir, full))
      }
    }
  }
  walk(rootDir)
  return results
}

/** Reads a barrel's `export { default as Name } from './rel'` lines as a name→file map. */
function readBarrelExports(barrelPath) {
  const exports = new Map()
  if (!barrelPath || !fs.existsSync(barrelPath)) return exports
  const src = fs.readFileSync(barrelPath, 'utf8')
  const re = /export\s*\{\s*default as (\w+)\s*\}\s*from\s*'\.\/([^']+)'/g
  let match
  while ((match = re.exec(src))) {
    exports.set(match[1], match[2])
  }
  return exports
}

/** Runs component-domain rules for one workspace. Appends findings to `report`. */
export function checkComponents(wsDir, report) {
  const registered = readComponents(wsDir)
  const registeredPaths = new Set(
    registered.map(c => path.join(c.path, `${c.name}.tsx`).replace(/\\/g, '/'))
  )
  const onDiskFiles = new Set(listComponentFiles(wsDir).map(f => f.replace(/\\/g, '/')))

  // Registered but the file is gone.
  for (const c of registered) {
    const relPath = path.join(c.path, `${c.name}.tsx`).replace(/\\/g, '/')
    if (!onDiskFiles.has(relPath)) {
      report.add({
        ruleId: 'components/stale-registry',
        severity: 'warning',
        file: '.flowkit/components.json',
        message: `'${c.name}' is registered at ${c.path}, but ${relPath} doesn't exist.`,
        fix: `Remove the stale entry, or restore the file.`,
        clifix: `flowkit remove:component --name:${c.name} --path:${c.path}`,
      })
    }
  }

  // On disk but never registered, and barrel export consistency.
  const checkedBarrels = new Set()
  for (const relPath of onDiskFiles) {
    const dir = path.dirname(relPath)
    const name = path.basename(relPath, '.tsx')

    if (!registeredPaths.has(relPath)) {
      report.add({
        ruleId: 'components/unregistered',
        severity: 'warning',
        file: relPath,
        message: `Component file exists but is not in .flowkit/components.json.`,
        clifix: `flowkit components:scan`,
      })
    }

    const barrelPath = findBarrel(wsDir, dir)
    if (barrelPath) {
      const barrelRel = path.relative(wsDir, barrelPath).replace(/\\/g, '/')
      const barrelExports = readBarrelExports(barrelPath)
      if (!checkedBarrels.has(barrelRel)) {
        checkedBarrels.add(barrelRel)
        // Phantom exports: barrel claims a file that doesn't exist.
        for (const [exportedName, exportedRelFile] of barrelExports) {
          const resolvedPath = path
            .join(path.dirname(barrelPath), `${exportedRelFile}.tsx`)
            .replace(/\\/g, '/')
          const resolvedWsRelative = path.relative(wsDir, resolvedPath).replace(/\\/g, '/')
          if (!fs.existsSync(resolvedPath)) {
            report.add({
              ruleId: 'components/barrel-phantom',
              severity: 'error',
              file: barrelRel,
              message: `Exports '${exportedName}' from './${exportedRelFile}', but ${resolvedWsRelative} doesn't exist.`,
              fix: `Remove the stale export line, or restore the file.`,
            })
          }
        }
      }
      if (!barrelExports.has(name)) {
        report.add({
          ruleId: 'components/barrel-gap',
          severity: 'warning',
          file: relPath,
          message: `Not exported from ${barrelRel}.`,
          clifix: `flowkit add:export --barrel:${barrelRel} --name:${name}`,
        })
      }
    }
  }
}
