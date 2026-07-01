import fs from 'fs'
import path from 'path'
import { workspacePath, b, d, g, getActiveWorkspaceName } from '../lib/config.js'
import { cmdLensReport } from './sessions/index.js'

export async function cmdDump(wsArg, args) {
  const ws = (wsArg || '').trim() || getActiveWorkspaceName()
  const destFlag = (() => {
    const i = args.indexOf('--dest')
    return i !== -1 ? args[i + 1] : null
  })()
  const doSessions =
    args.includes('--sessions') || (!args.includes('--feedback') && !args.includes('--report'))
  const doFeedback =
    args.includes('--feedback') || (!args.includes('--sessions') && !args.includes('--report'))
  const doReport =
    args.includes('--report') || (!args.includes('--sessions') && !args.includes('--feedback'))

  const datePart = new Date().toISOString().slice(0, 10)
  const outDir = destFlag ?? path.join(process.cwd(), `flowkit-dump-${ws}-${datePart}`)
  fs.mkdirSync(outDir, { recursive: true })

  console.log('')
  console.log(b(` dump — ${ws}`) + d(`  → ${outDir}`))
  console.log(d(' ────────────────────────────────────────────'))

  let exported = 0

  if (doSessions) {
    const sessBase = path.join(workspacePath(ws), 'lib', 'flowLens', 'sessions')
    if (fs.existsSync(sessBase)) {
      const files = fs.readdirSync(sessBase, { recursive: true }).filter(f => f.endsWith('.json'))
      const sessDir = path.join(outDir, 'sessions')
      fs.mkdirSync(sessDir, { recursive: true })
      for (const f of files) {
        const src = path.join(sessBase, f)
        const dest = path.join(sessDir, f)
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        fs.copyFileSync(src, dest)
      }
      console.log(g('✓') + ' Sessions: ' + b(files.length) + d(` → sessions/`))
      exported++
    } else {
      console.log(d('  Sessions: no library (skipped)'))
    }
  }

  if (doFeedback) {
    const fp = path.join(workspacePath(ws), '.flowkit-feedback.json')
    if (fs.existsSync(fp)) {
      fs.copyFileSync(fp, path.join(outDir, `feedback-${ws}.json`))
      console.log(g('✓') + ' Feedback ' + d(`→ feedback-${ws}.json`))
      exported++
    } else {
      console.log(d('  Feedback: no committed snapshot (skipped)'))
    }
  }

  if (doReport) {
    cmdLensReport(ws, [`--dest`, path.join(outDir, `flowlens-report-${ws}-${datePart}.json`)])
    exported++
  }

  console.log('')
  if (exported === 0) {
    console.log(d('⚠ Dump complete — nothing to export (no sessions, feedback, or report found)'))
  } else {
    console.log(g('✓') + ' Dump complete ' + d(`→ ${outDir}`))
  }
}
