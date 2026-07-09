// Platform: one-time setup — registers the `flowkit` shell alias. Manual/agent-invoked, not wired to any npm lifecycle hook.
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

// Get the directory of the current script file
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageJsonPath = path.join(__dirname, '../package.json')

// Read and parse package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

// Get the binary name dynamically (e.g., "flowkit")
const binName = Object.keys(packageJson.bin || {})[0] || 'flowkit'

const shell = process.env.SHELL || ''
const home = os.homedir()

if (shell.includes('zsh')) {
  const zshrcPath = path.join(home, '.zshrc')
  const aliasLine = `alias ${binName}="npx ${binName}"`

  try {
    let content = ''
    if (fs.existsSync(zshrcPath)) {
      content = fs.readFileSync(zshrcPath, 'utf8')
    }

    if (content.includes(aliasLine)) {
      console.log(`✓ Alias '${binName}' is already set up in ~/.zshrc.`)
      console.log(`🎉 Everything is configured! You can run '${binName} -ls' to list your flows.`)
    } else {
      const newLine = content.endsWith('\n')
        ? '\n# flowkit CLI alias\n'
        : '\n\n# flowkit CLI alias\n'
      fs.appendFileSync(zshrcPath, newLine + aliasLine + '\n')
      console.log(`✓ Successfully added alias '${binName}' to ~/.zshrc!`)
      console.log(`👉 To activate it in this terminal window, run: source ~/.zshrc`)
    }
  } catch (err) {
    console.error('✗ Failed to write to ~/.zshrc:', err.message)
  }
} else {
  console.log(
    `ℹ This script currently supports zsh setup. For other shells, please manually add: alias ${binName}="npx ${binName}"`
  )
}
