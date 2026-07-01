import fs from 'fs'
import path from 'path'
import { ROOT, g, r, b, d } from '../lib/config.js'

export async function cmdKitCheck() {
  const { KIT_MANIFEST } = await import('../../src/kits/shared/index.ts').catch(() => {
    const src = fs.readFileSync(path.join(ROOT, 'src/kits/shared/index.ts'), 'utf8')
    const m = src.match(/components:\s*\[([\s\S]*?)\]/)
    const components = m ? [...m[1].matchAll(/["']([^"']+)["']/g)].map(x => x[1]) : []
    return { KIT_MANIFEST: { components } }
  })

  const THEMES_DIR = path.join(ROOT, 'src/kits/shared/tokens/themes')
  const themes = fs.existsSync(THEMES_DIR)
    ? fs
        .readdirSync(THEMES_DIR)
        .filter(f => f.endsWith('.css'))
        .map(f => f.replace(/\.css$/, ''))
        .sort()
    : []

  if (!themes.length) {
    console.log(r('\n  ✗ No theme files found in src/kits/shared/tokens/themes/\n'))
    return
  }

  let passed = 0
  console.log(
    `\n  Kit drift check — ${themes.length} themes × ${KIT_MANIFEST.components.length} components\n`
  )

  for (const theme of themes) {
    const themePath = path.join(THEMES_DIR, `${theme}.css`)
    const src = fs.readFileSync(themePath, 'utf8')
    for (const comp of KIT_MANIFEST.components) {
      const hasOverride = src.includes(`.kit-${comp}`)
      if (hasOverride) {
        console.log(`  ${g('✓')} ${b(theme)} × ${comp}`)
        passed++
      } else {
        console.log(`  ${d('·')} ${b(theme)} × ${comp}  ${d('(no override — base styles apply)')}`)
      }
    }
    console.log('')
  }

  const total = themes.length * KIT_MANIFEST.components.length
  console.log(`  ${passed} with overrides · ${total - passed} using base styles\n`)
}
