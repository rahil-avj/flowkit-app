// Platform command: read-only flowplan/project discovery and validation (plan:ls, plan:check, project:ls).
import fs from 'fs'
import path from 'path'
import { workspacePath } from '../helpers/paths.js'
import { g, r, b, d } from '../helpers/colors.js'
import { resolveWorkspaceLoose as resolveWorkspace } from '../helpers/workspace-resolve.js'

function findProjectsDir(ws) {
  return path.join(workspacePath(ws), 'projects')
}

function listProjects(ws) {
  const dir = findProjectsDir(ws)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory())
}

// ─── Format-aware flowplan resolver (R1) ──────────────────────────────────────
// Checks the flat layout (workspaces/<ws>/flowplans/) first, then falls back
// to the legacy nested layout (workspaces/<ws>/projects/<proj>/flowplans/).
// This is the single source of truth for ALL plan-discovery commands.

function resolveFlowplans(ws, project) {
  const results = []

  // Flat layout — used by nClarity and all post-refactor workspaces
  if (!project) {
    const flatDir = path.join(workspacePath(ws), 'flowplans')
    if (fs.existsSync(flatDir)) {
      for (const f of fs.readdirSync(flatDir)) {
        if (!f.endsWith('.ts') && !f.endsWith('.js')) continue
        results.push({ project: null, file: f, fullPath: path.join(flatDir, f), flat: true })
      }
      if (results.length > 0) return results
    }
  }

  // Legacy nested layout — projects/<proj>/flowplans/
  const projectsDir = findProjectsDir(ws)
  if (!fs.existsSync(projectsDir)) return results
  const projects = project ? [project] : listProjects(ws)
  for (const proj of projects) {
    const plansDir = path.join(projectsDir, proj, 'flowplans')
    if (!fs.existsSync(plansDir)) continue
    for (const f of fs.readdirSync(plansDir)) {
      if (!f.endsWith('.ts') && !f.endsWith('.js')) continue
      results.push({ project: proj, file: f, fullPath: path.join(plansDir, f), flat: false })
    }
  }
  return results
}

function listFlowplans(ws, project) {
  return resolveFlowplans(ws, project)
}

// ─── plan:ls ──────────────────────────────────────────────────────────────────

export function cmdPlanLs(val, args) {
  const ws = resolveWorkspace('')
  const projectFlag = (args.find(a => a.startsWith('--project:')) || '').slice('--project:'.length)
  const plans = listFlowplans(ws, projectFlag || null)

  console.log('')
  console.log(b(` FlowPlans — ${ws}`) + (projectFlag ? d(`  (project: ${projectFlag})`) : ''))
  console.log(d(' ────────────────────────────────────────────'))

  if (plans.length === 0) {
    console.log(d('  No flowplans found. Drop a .ts file into flowplans/ to add one.'))
    console.log('')
    return
  }

  for (const { project, file, fullPath, flat } of plans) {
    const rel = path.relative(workspacePath(ws), fullPath)
    const loc = flat ? d(`  · flowplans/${file}`) : d(`  · ${project}  · ${rel}`)
    console.log('  ' + b(file.replace(/\.(ts|js)$/, '')) + loc)
  }
  console.log(d(' ────────────────────────────────────────────'))
  console.log(d(`  ${plans.length} plan${plans.length !== 1 ? 's' : ''}`))
  console.log('')
}

// ─── plan:check ───────────────────────────────────────────────────────────────

export function cmdPlanCheck(val, args) {
  const ws = resolveWorkspace('')
  const projectFlag = (args.find(a => a.startsWith('--project:')) || '').slice('--project:'.length)
  const plans = listFlowplans(ws, projectFlag || null)

  console.log('')
  console.log(b(` plan:check — ${ws}`))
  console.log(d(' ────────────────────────────────────────────'))

  if (plans.length === 0) {
    const flatDir = path.join(workspacePath(ws), 'flowplans')
    if (fs.existsSync(flatDir)) {
      // Workspace has a flowplans/ dir but it's empty — that's suspicious, exit non-zero
      console.log(r('  ✗ flowplans/ directory exists but contains no .ts/.js plans'))
      console.log('')
      process.exit(1)
    }
    console.log(d('  No flowplans to check.'))
    console.log('')
    return
  }

  let errors = 0
  for (const { file, fullPath } of plans) {
    const src = (() => {
      try {
        return fs.readFileSync(fullPath, 'utf8')
      } catch {
        return null
      }
    })()
    if (!src) {
      console.log('  ' + r('✗ ') + file + d('  — unreadable'))
      errors++
      continue
    }
    const issues = []
    if (!src.includes('id:')) issues.push('missing id:')
    if (!src.includes('name:')) issues.push('missing name:')
    if (!src.includes('steps:')) issues.push('missing steps:')
    if (issues.length === 0) {
      console.log('  ' + g('✓ ') + file)
    } else {
      console.log('  ' + r('✗ ') + file + d('  — ' + issues.join(', ')))
      errors++
    }
  }

  console.log(d(' ────────────────────────────────────────────'))
  console.log(errors ? r(`  ${errors} error${errors !== 1 ? 's' : ''}`) : g('  all clean'))
  console.log('')
  if (errors > 0) process.exit(1)
}

// ─── project:ls ───────────────────────────────────────────────────────────────

export function cmdProjectLs(val) {
  const ws = resolveWorkspace(val)
  const projectsDir = findProjectsDir(ws)
  const projects = listProjects(ws)

  console.log('')
  console.log(b(` Projects — ${ws}`))
  console.log(d(' ────────────────────────────────────────────'))

  if (projects.length === 0) {
    const plans = resolveFlowplans(ws, null)
    if (plans.length > 0 && plans[0].flat) {
      console.log(
        d(
          `  Flat workspace — no projects layer. ${plans.length} flowplan${plans.length !== 1 ? 's' : ''} in flowplans/`
        )
      )
    } else {
      console.log(d('  No projects found.'))
    }
    console.log('')
    return
  }

  for (const proj of projects) {
    const plansDir = path.join(projectsDir, proj, 'flowplans')
    const planCount = fs.existsSync(plansDir)
      ? fs.readdirSync(plansDir).filter(f => f.endsWith('.ts') || f.endsWith('.js')).length
      : 0
    console.log('  ' + b(proj) + d(`  · ${planCount} plan${planCount !== 1 ? 's' : ''}`))
  }
  console.log(d(' ────────────────────────────────────────────'))
  console.log(d(`  ${projects.length} project${projects.length !== 1 ? 's' : ''}`))
  console.log('')
}
