import readline from 'readline'
import { execSync } from 'child_process'
import { ROOT, g, r, b, d, c } from '../lib/config.js'
import { prompt } from '../lib/prompt.js'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function gitExec(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim()
}

/** flowkit checkpoint[:<label>] — tag HEAD before a risky change. */
export async function cmdCheckpoint(val, args = []) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  let label = (val || '').trim()
  if (!label) {
    label = await prompt(rl, c('? ') + 'Checkpoint label (e.g. before-canvas-refactor): ')
    label = label.trim()
  }
  rl.close()

  if (!label) {
    console.error(r('✗ Label is required'))
    process.exit(1)
  }

  const safeLabel = label.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-]/g, '')
  const tag = `checkpoint/${safeLabel}-${today()}`
  const sha = gitExec('git rev-parse --short HEAD')
  const branch = gitExec('git symbolic-ref --short HEAD')

  try {
    gitExec(`git tag "${tag}"`)
    gitExec(`git push origin "${tag}"`)
  } catch (e) {
    console.error(r(`✗ Failed to create tag: ${e.message}`))
    process.exit(1)
  }

  console.log('')
  console.log(g('✓') + ' Checkpoint created')
  console.log(`  ${b('Tag:')}     ${tag}`)
  console.log(`  ${b('Branch:')} ${branch} @ ${sha}`)
  console.log(`  ${b('Recover:')} git checkout ${tag}`)
  console.log('')
}

/** flowkit release — tag a milestone version with notes. */
export async function cmdRelease(val, args = []) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  let version = (val || '').trim()
  if (!version) {
    version = await prompt(rl, c('? ') + 'Version number (e.g. 1.2): ')
    version = version.trim()
  }

  if (!version) {
    rl.close()
    console.error(r('✗ Version is required'))
    process.exit(1)
  }

  const notes = await prompt(rl, c('? ') + 'Release note (one line): ')
  rl.close()

  const tag = `v${version}`
  const sha = gitExec('git rev-parse --short HEAD')
  const branch = gitExec('git symbolic-ref --short HEAD')

  try {
    gitExec(`git tag -a "${tag}" -m "${notes.trim() || tag}"`)
    gitExec(`git push origin "${tag}"`)
  } catch (e) {
    console.error(r(`✗ Failed to create release tag: ${e.message}`))
    process.exit(1)
  }

  console.log('')
  console.log(g('✓') + ' Release tagged')
  console.log(`  ${b('Tag:')}     ${tag}`)
  console.log(`  ${b('Notes:')}  ${notes.trim() || d('(none)')}`)
  console.log(`  ${b('Branch:')} ${branch} @ ${sha}`)
  console.log(`  ${b('Recover:')} git checkout ${tag}`)
  console.log('')
}
