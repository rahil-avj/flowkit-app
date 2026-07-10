// Platform command: prints the installed flowkit package version.
import path from 'path'
import { ROOT } from '../helpers/paths.js'
import { readJson } from '../helpers/json.js'

export function cmdVersion() {
  const pkg = readJson(path.join(ROOT, 'package.json'), {})
  console.log(pkg.version ?? 'unknown')
}
