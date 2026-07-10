#!/usr/bin/env node
// Bootstrap: the npm bin entry point — hands off to the platform router immediately.
//
// One deliberate exception: `flowkit check`/`check:<domain>` is intercepted HERE, before
// router.js ever sees it, and only when !isRepoMode() — i.e. only in a real project
// scaffolded by create-flowkit-app/create-flowkit-workspace, where `flowkit` is an installed
// node_modules dependency, never in this monorepo's own checkout. router.js itself has zero
// knowledge of `check` — no import, no dispatch branch — so this repo's own command surface
// is completely unaffected; running `flowkit check` here falls through to router.js's normal
// "Unknown command" path, same as any command that was never registered.
//
// This mirrors router.js's own colon-parsing convention (`check:screens` → cmd 'check',
// val 'screens') in miniature, rather than importing router.js's internal parseCmd() — small,
// deliberate duplication so router.js never needs to export anything check-specific.
import { isRepoMode } from './helpers/paths.js'
import { route } from './platform/router.js'

const argv = process.argv.slice(2)
const firstArg = argv[0] ?? ''
const bare = firstArg.startsWith('--')
  ? firstArg.slice(2)
  : firstArg.startsWith('-')
    ? firstArg.slice(1)
    : firstArg
const colon = bare.indexOf(':')
const cmd = colon === -1 ? bare : bare.slice(0, colon)
const sub = colon === -1 ? '' : bare.slice(colon + 1)

if (cmd === 'check' && !isRepoMode()) {
  const { dispatchCheck } = await import('./platform/check.js')
  await dispatchCheck(sub, argv.slice(1))
} else {
  route(argv)
}
