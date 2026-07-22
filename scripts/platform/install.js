// Platform: one-time setup — prints the `flowkit` shell alias for the user to add themselves. Manual/agent-invoked, not wired to any npm lifecycle hook. Never writes to the user's shell rc files.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the directory of the current script file
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageJsonPath = path.join(__dirname, '../package.json')

// Read and parse package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

// Get the binary name dynamically (e.g., "flowkit")
const binName = Object.keys(packageJson.bin || {})[0] || 'flowkit'

const shell = process.env.SHELL || ''
const rcFile = shell.includes('zsh')
  ? '~/.zshrc'
  : shell.includes('bash')
    ? '~/.bashrc'
    : 'your shell rc file'
const aliasLine = `alias ${binName}="npx ${binName}"`

console.log(`To run '${binName}' directly in your terminal, add this line to ${rcFile}:\n`)
console.log(`  ${aliasLine}\n`)
console.log(`Then reload your shell (e.g. source ${rcFile}), or open a new terminal window.`)
