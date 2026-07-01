import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { ROOT, g, d } from '../lib/config.js'
import { LOCK_DIRS, LOCK_FILES } from './manifest.js'

const POST_CHECKOUT_HOOK = `#!/bin/sh
# FlowKit deployment lock — applies/removes read-only protection on branch switch.
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)
if [ "$BRANCH" = "deployment" ]; then
${LOCK_DIRS.map(dir => `  chmod -R a-w "${dir}" 2>/dev/null || true`).join('\n')}
${LOCK_FILES.map(f => `  chmod a-w "${f}" 2>/dev/null || true`).join('\n')}
else
${LOCK_DIRS.map(dir => `  chmod -R u+w "${dir}" 2>/dev/null || true`).join('\n')}
${LOCK_FILES.map(f => `  chmod u+w "${f}" 2>/dev/null || true`).join('\n')}
fi
`

export function applyLock(root = ROOT) {
  for (const dir of LOCK_DIRS) {
    const abs = path.join(root, dir)
    if (fs.existsSync(abs)) {
      execSync(`chmod -R a-w "${abs}"`)
    }
  }
  for (const file of LOCK_FILES) {
    const abs = path.join(root, file)
    if (fs.existsSync(abs)) {
      execSync(`chmod a-w "${abs}"`)
    }
  }
}

export function writePostCheckoutHook(root = ROOT) {
  const hookPath = path.join(root, '.git', 'hooks', 'post-checkout')
  fs.writeFileSync(hookPath, POST_CHECKOUT_HOOK, { mode: 0o755 })
  console.log(g('✓') + ' ' + d('post-checkout lock hook installed'))
}
