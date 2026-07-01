import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { execSync } from 'child_process'
import { ROOT, g, r, b, d, c } from '../lib/config.js'
import { prompt } from '../lib/prompt.js'
import {
  STRIP_DIRS,
  STRIP_FILES,
  STRIP_DEV_DEPS,
  STRIP_NPM_SCRIPTS,
  STRIP_PACKAGE_KEYS,
  LOCK_DIRS,
  LOCK_FILES,
} from './manifest.js'
import { applyLock, writePostCheckoutHook } from './lock.js'

const DEPLOYMENT_BRANCH = 'deployment'

function gitExec(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', ...opts }).trim()
}

function currentBranch() {
  return gitExec('git symbolic-ref --short HEAD')
}

function commitsSinceLastSync() {
  try {
    const log = gitExec(`git log ${DEPLOYMENT_BRANCH}..HEAD --oneline`, { stdio: 'pipe' })
    return log ? log.split('\n').filter(Boolean) : []
  } catch {
    return []
  }
}

function deploymentExists() {
  try {
    gitExec(`git rev-parse --verify ${DEPLOYMENT_BRANCH}`)
    return true
  } catch {
    return false
  }
}

function printDryRun() {
  console.log('')
  console.log(b(' sync:deployment — dry run'))
  console.log(d(' ────────────────────────────────────────────'))

  console.log('\n' + b('  Directories to remove:'))
  for (const dir of STRIP_DIRS) {
    const exists = fs.existsSync(path.join(ROOT, dir))
    console.log(`    ${exists ? c('–') : d('·')} ${dir}${exists ? '' : d('  (not present)')}`)
  }

  console.log('\n' + b('  Files to remove:'))
  for (const file of STRIP_FILES) {
    const exists = fs.existsSync(path.join(ROOT, file))
    console.log(`    ${exists ? c('–') : d('·')} ${file}${exists ? '' : d('  (not present)')}`)
  }

  console.log('\n' + b('  devDependencies to remove:'))
  const pkgRaw = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
  const pkg = JSON.parse(pkgRaw)
  for (const dep of STRIP_DEV_DEPS) {
    const exists = dep in (pkg.devDependencies || {})
    console.log(`    ${exists ? c('–') : d('·')} ${dep}${exists ? '' : d('  (not present)')}`)
  }

  console.log('\n' + b('  npm scripts to remove:'))
  for (const script of STRIP_NPM_SCRIPTS) {
    const exists = script in (pkg.scripts || {})
    console.log(`    ${exists ? c('–') : d('·')} ${script}${exists ? '' : d('  (not present)')}`)
  }

  console.log('\n' + b('  Paths to lock read-only:'))
  for (const p of [...LOCK_DIRS, ...LOCK_FILES]) {
    console.log(`    ${d('🔒')} ${p}`)
  }

  const commits = commitsSinceLastSync()
  if (commits.length > 0) {
    console.log(`\n  ${b(`${commits.length} commit(s) ahead of last deployment sync:`)}`)
    for (const line of commits) {
      console.log(`    ${d('·')} ${line}`)
    }
  } else if (deploymentExists()) {
    console.log(`\n  ${d('· deployment branch is up to date')}`)
  } else {
    console.log(`\n  ${c('! ')}${d('deployment branch does not exist yet — will be created')}`)
  }

  console.log(d('\n ────────────────────────────────────────────'))
}

function stripPackageJson(root) {
  const pkgPath = path.join(root, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

  for (const dep of STRIP_DEV_DEPS) {
    delete pkg.devDependencies?.[dep]
  }
  for (const script of STRIP_NPM_SCRIPTS) {
    delete pkg.scripts?.[script]
  }
  for (const key of STRIP_PACKAGE_KEYS) {
    delete pkg[key]
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

function stripFiles(root) {
  for (const dir of STRIP_DIRS) {
    const abs = path.join(root, dir)
    if (fs.existsSync(abs)) fs.rmSync(abs, { recursive: true, force: true })
  }
  for (const file of STRIP_FILES) {
    const abs = path.join(root, file)
    if (fs.existsSync(abs)) fs.rmSync(abs)
  }
}

/** flowkit sync:deployment — generate clean deployment branch from current branch. */
export async function cmdSyncDeployment(val, args = []) {
  const branch = currentBranch()

  if (branch === DEPLOYMENT_BRANCH) {
    console.error(r('✗ Cannot sync from the deployment branch itself.'))
    console.log(d('  Switch to your production/working branch first.'))
    process.exit(1)
  }

  printDryRun()

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const apply = await prompt(rl, c('? ') + 'Ready to apply locally? (y/n): ')

  if (apply.trim().toLowerCase() !== 'y') {
    rl.close()
    console.log(d('  Aborted — no changes made.'))
    return
  }

  // ── Apply ──────────────────────────────────────────────────────────────────
  console.log('')
  const headSha = gitExec('git rev-parse --short HEAD')

  try {
    // Create or reset deployment branch from current HEAD
    console.log(d(`  Creating deployment branch from ${branch} @ ${headSha}…`))
    gitExec(`git checkout -B ${DEPLOYMENT_BRANCH}`)

    // Strip files and dirs
    console.log(d('  Stripping dev files…'))
    stripFiles(ROOT)

    // Rewrite package.json
    console.log(d('  Rewriting package.json…'))
    stripPackageJson(ROOT)

    // Lock platform files
    console.log(d('  Locking platform files…'))
    applyLock(ROOT)

    // Install post-checkout hook so lock re-applies on branch switch
    writePostCheckoutHook(ROOT)

    // Commit
    gitExec('git add -A')
    gitExec(`git commit -m "chore: sync deployment from ${branch} @ ${headSha}"`)
    console.log(g('✓') + ' Deployment branch ready locally')

    // Switch back
    gitExec(`git checkout ${branch}`)
    console.log(g('✓') + ` Back on ${b(branch)}`)
  } catch (e) {
    console.error(r(`✗ Failed during apply: ${e.message}`))
    // Attempt to get back to original branch
    try {
      gitExec(`git checkout ${branch}`)
    } catch {}
    rl.close()
    process.exit(1)
  }

  console.log('')
  const push = await prompt(rl, c('? ') + `Push deployment to origin? (y/n): `)
  rl.close()

  if (push.trim().toLowerCase() !== 'y') {
    console.log(d('  Skipped push — deployment branch is ready locally.'))
    console.log(d(`  Push manually: git push origin ${DEPLOYMENT_BRANCH} --force-with-lease`))
    return
  }

  try {
    gitExec(`git push origin ${DEPLOYMENT_BRANCH} --force-with-lease`)
    console.log(g('✓') + ` deployment pushed to origin @ ${headSha}`)
  } catch (e) {
    console.error(r(`✗ Push failed: ${e.message}`))
    process.exit(1)
  }

  console.log('')
  console.log(g('✓') + ' sync:deployment complete')
  console.log(`  ${b('Branch:')} deployment @ ${headSha}`)
  console.log(`  ${b('Source:')} ${branch}`)
  console.log('')
}
