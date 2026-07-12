// Platform command: session analytics/reporting (sessions:stats, sessions:brief, lens:report, sessions:report).
import fs from 'fs'
import path from 'path'
import { g, r, b, d, c } from '../../helpers/colors.js'
import { localDatePart, fmtDate } from '../../helpers/dates.js'
import { resolveWorkspace } from '../../helpers/workspace-resolve.js'
import {
  listLibraryFiles,
  readSession,
  readStudies,
  reportsDir,
  studyNameToId,
  flowLensRoot,
} from './_shared.js'

const qColor = q => (q >= 70 ? g : q >= 40 ? c : r)

// ─── sessions:stats ───────────────────────────────────────────────────────────

export function cmdSessionsStats(val) {
  const ws = resolveWorkspace(val)
  const sessions = listLibraryFiles(ws)
    .map(readSession)
    .filter(r => r.ok)
    .map(r => r.session)

  console.log('')
  console.log(b(` sessions:stats — ${ws}`))
  console.log(d(' ────────────────────────────────────────────'))
  if (sessions.length === 0) {
    console.log(d('  No committed sessions.'))
    console.log('')
    return
  }

  const n = sessions.length
  const totalEvents = sessions.reduce((s, x) => s + (x.meta.eventCount ?? x.events.length), 0)
  const avgQ = Math.round(sessions.reduce((s, x) => s + (x.meta.qualityScore ?? 0), 0) / n)
  const completed = sessions.filter(x => x.events.some(e => e.type === 'flow.completed')).length
  const frustrated = {}
  for (const x of sessions)
    for (const e of x.events) {
      if (e.type === 'interaction.frustrated-click' && typeof e.payload?.screenId === 'string') {
        frustrated[e.payload.screenId] = (frustrated[e.payload.screenId] ?? 0) + 1
      }
    }
  const topFrustrated = Object.entries(frustrated)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  console.log(`  Sessions:        ${b(n)}`)
  console.log(`  Total events:    ${b(totalEvents)}`)
  console.log(`  Avg quality:     ${qColor(avgQ)(avgQ + '%')}`)
  console.log(
    `  Completion rate: ${b(Math.round((completed / n) * 100) + '%')}` +
      d(`  (${completed}/${n} hit flow.completed)`)
  )
  if (topFrustrated.length) {
    console.log(d('  Top frustrated screens:'))
    for (const [sid, count] of topFrustrated)
      console.log('    ' + r(String(count).padStart(3)) + '  ' + sid)
  }
  console.log('')
}

// ─── sessions:report (unified) ────────────────────────────────────────────────

/**
 * Flags: --study <name|id>  --format json|md|both  --agent  --dest <path>
 * Default format: json
 * Output dir: workspaces/<ws>/lib/flowLens/reports/ (unless --dest overrides)
 */
export function cmdSessionsReport(wsVal, args = []) {
  const ws = resolveWorkspace(wsVal)

  // ── Parse flags ──────────────────────────────────────────────────────────
  const studyFlag = (() => {
    const i = args.indexOf('--study')
    return i !== -1 ? args[i + 1] : null
  })()
  const destFlag = (() => {
    const i = args.indexOf('--dest')
    return i !== -1 ? args[i + 1] : null
  })()
  const formatFlag = (() => {
    const i = args.indexOf('--format')
    return i !== -1 ? args[i + 1] : 'json'
  })()
  const agentFlag = args.includes('--agent')

  const doJson = formatFlag === 'json' || formatFlag === 'both'
  const doMd = formatFlag === 'md' || formatFlag === 'both'

  // ── Resolve study filter ──────────────────────────────────────────────────
  let resolvedStudyId = null
  if (studyFlag) {
    const studiesData = readStudies(ws)
    if (!studiesData) {
      console.error(r(`✗ No studies.json found for workspace "${ws}"`))
      process.exit(1)
    }
    const match = studiesData.studies.find(
      s => s.id === studyFlag || s.name.toLowerCase() === studyFlag.toLowerCase()
    )
    if (!match) {
      console.error(r(`✗ No study matching "${studyFlag}" in ${ws}.`))
      process.exit(1)
    }
    resolvedStudyId = match.id
  }

  // ── Load sessions ─────────────────────────────────────────────────────────
  const sessions = listLibraryFiles(ws, resolvedStudyId)
    .map(readSession)
    .filter(r => r.ok)
    .map(r => r.session)
    .filter(s => !s.meta.isTestMode)

  const n = sessions.length
  const datePart = localDatePart()
  const studySuffix = resolvedStudyId ? `-${resolvedStudyId}` : ''
  const outDir = destFlag ? destFlag : reportsDir(ws)
  fs.mkdirSync(outDir, { recursive: true })

  // ── JSON report ───────────────────────────────────────────────────────────
  if (doJson) {
    const avgQ = n
      ? Math.round(sessions.reduce((s, x) => s + (x.meta.qualityScore ?? 0), 0) / n)
      : 0
    const completed = sessions.filter(x => x.events.some(e => e.type === 'flow.completed')).length
    const frustrated = {}
    for (const x of sessions)
      for (const e of x.events) {
        if (e.type === 'interaction.frustrated-click' && typeof e.payload?.screenId === 'string') {
          frustrated[e.payload.screenId] = (frustrated[e.payload.screenId] ?? 0) + 1
        }
      }

    const report = {
      workspace: ws,
      study: resolvedStudyId ?? 'all',
      generatedAt: new Date().toISOString(),
      sessionCount: n,
      avgQuality: avgQ,
      completionRate: n ? Math.round((completed / n) * 100) / 100 : 0,
      topFrustratedScreens: Object.entries(frustrated)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      sessionList: sessions.map(x => ({
        id: x.meta.id,
        name: x.meta.name,
        startTime: x.meta.startTime,
        eventCount: x.meta.eventCount ?? x.events.length,
        qualityScore: x.meta.qualityScore ?? 0,
        isTestMode: x.meta.isTestMode ?? false,
      })),
    }

    const outName = `flowlens-report-${ws}${studySuffix}-${datePart}.json`
    const dest = path.join(outDir, outName)
    fs.writeFileSync(dest, JSON.stringify(report, null, 2))
    console.log(g('✓') + ' FlowLens report  ' + d(`→ ${dest}`))
    console.log(
      d(
        `  ${n} sessions · avg quality ${avgQ}% · completion ${Math.round((completed / (n || 1)) * 100)}%`
      )
    )
  }

  // ── Markdown report ───────────────────────────────────────────────────────
  if (doMd) {
    const md = buildBriefMarkdown(ws, sessions, resolvedStudyId)

    if (agentFlag) {
      const projectMdPath = path.join(flowLensRoot(ws), '..', '..', '.agent', 'project.md')
      const resolved = path.resolve(projectMdPath)
      if (fs.existsSync(resolved)) {
        let existing = fs.readFileSync(resolved, 'utf8')
        existing = existing.replace(/\n## Last session analysis[\s\S]*$/, '')
        fs.writeFileSync(resolved, existing.trimEnd() + '\n\n' + md, 'utf8')
        console.log(g('✓') + ' Brief appended to ' + b(`.agent/project.md`) + d(` (${ws})`))
      } else {
        console.log(r('! ') + d(`.agent/project.md not found — writing standalone file instead`))
        const outName = `flowlens-brief-${ws}${studySuffix}-${datePart}.md`
        fs.writeFileSync(path.join(outDir, outName), md)
        console.log(g('✓') + ' Brief written    ' + d(`→ ${path.join(outDir, outName)}`))
      }
    } else {
      const outName = `flowlens-brief-${ws}${studySuffix}-${datePart}.md`
      const dest = path.join(outDir, outName)
      fs.writeFileSync(dest, md)
      console.log(g('✓') + ' Brief written    ' + d(`→ ${dest}`))
      console.log(d(`  Pass --agent to append into .agent/project.md instead`))
    }
  }
}

function buildBriefMarkdown(ws, sessions, studyId = null) {
  const n = sessions.length
  if (n === 0) {
    return `## Last session analysis — ${ws}\n\n_No real sessions found${studyId ? ` for study "${studyId}"` : ''}._\n`
  }

  const avgQ = Math.round(sessions.reduce((s, x) => s + (x.meta.qualityScore ?? 0), 0) / n)
  const completed = sessions.filter(x => x.events.some(e => e.type === 'flow.completed')).length
  const completionRate = Math.round((completed / n) * 100)

  const dwellMs = {},
    dwellCount = {}
  const frustrated = {},
    dropOff = {},
    blocked = {}

  for (const x of sessions) {
    for (const e of x.events) {
      if (e.type === 'screen.dwell-end' && typeof e.payload?.screenId === 'string') {
        const sid = e.payload.screenId
        dwellMs[sid] = (dwellMs[sid] ?? 0) + (e.payload.dwellMs ?? 0)
        dwellCount[sid] = (dwellCount[sid] ?? 0) + 1
      }
      if (e.type === 'interaction.frustrated-click' && typeof e.payload?.screenId === 'string')
        frustrated[e.payload.screenId] = (frustrated[e.payload.screenId] ?? 0) + 1
      if (e.type === 'flow.exited-early' && typeof e.payload?.fromScreen === 'string')
        dropOff[e.payload.fromScreen] = (dropOff[e.payload.fromScreen] ?? 0) + 1
      if (e.type === 'screen.blocked' && typeof e.payload?.screenId === 'string')
        blocked[e.payload.screenId] = (blocked[e.payload.screenId] ?? 0) + 1
    }
  }

  const avgDwell = Object.entries(dwellMs)
    .map(([sid, total]) => ({ sid, avg: Math.round(total / dwellCount[sid]) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)
  const topFrustrated = Object.entries(frustrated)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const topDropOff = Object.entries(dropOff)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const studyLabel = studyId ? ` · study: ${studyId}` : ''
  const lines = [
    `## Last session analysis — ${ws}`,
    ``,
    `_Generated ${localDatePart()} from ${n} session${n !== 1 ? 's' : ''}${studyLabel} · avg quality ${avgQ}% · completion rate ${completionRate}%_`,
    ``,
    `### Summary`,
    ``,
    `| Metric | Value |`,
    `| ------ | ----- |`,
    `| Sessions analysed | ${n} |`,
    `| Avg quality score | ${avgQ}% |`,
    `| Completion rate | ${completionRate}% (${completed}/${n}) |`,
  ]

  if (avgDwell.length) {
    lines.push(
      ``,
      `### Screens with highest average dwell time`,
      ``,
      `_Users spent the most time here — may indicate confusion or genuine interest._`,
      ``,
      `| Screen | Avg dwell |`,
      `| ------ | --------- |`
    )
    for (const { sid, avg } of avgDwell)
      lines.push(`| \`${sid}\` | ${avg >= 1000 ? (avg / 1000).toFixed(1) + 's' : avg + 'ms'} |`)
  }

  if (topFrustrated.length) {
    lines.push(
      ``,
      `### Screens with frustrated clicks`,
      ``,
      `_Taps that hit no interactive element — users expected something to work but it didn't._`,
      ``,
      `| Screen | Frustrated taps |`,
      `| ------ | --------------- |`
    )
    for (const [sid, count] of topFrustrated) lines.push(`| \`${sid}\` | ${count} |`)
  }

  if (topDropOff.length) {
    lines.push(
      ``,
      `### Drop-off screens`,
      ``,
      `_Where users left the flow early._`,
      ``,
      `| Screen | Early exits |`,
      `| ------ | ----------- |`
    )
    for (const [sid, count] of topDropOff) lines.push(`| \`${sid}\` | ${count} |`)
  }

  if (Object.keys(blocked).length) {
    lines.push(
      ``,
      `### Guard-blocked screens`,
      ``,
      `_Navigation attempts blocked by entry guards._`,
      ``,
      `| Screen | Blocked attempts |`,
      `| ------ | ---------------- |`
    )
    for (const [sid, count] of Object.entries(blocked)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5))
      lines.push(`| \`${sid}\` | ${count} |`)
  }

  lines.push(``, `### Suggested focus for next iteration`, ``)
  if (topFrustrated.length)
    lines.push(
      `- **Wire missing interactions** on \`${topFrustrated[0][0]}\` — highest frustrated-click count (${topFrustrated[0][1]} taps hit nothing)`
    )
  if (topDropOff.length)
    lines.push(
      `- **Investigate drop-off** at \`${topDropOff[0][0]}\` — ${topDropOff[0][1]} user${topDropOff[0][1] !== 1 ? 's' : ''} exited the flow here`
    )
  if (avgDwell.length && avgDwell[0].avg > 4000)
    lines.push(
      `- **Simplify \`${avgDwell[0].sid}\`** — users averaged ${(avgDwell[0].avg / 1000).toFixed(1)}s here, suggesting friction`
    )
  if (completionRate < 50)
    lines.push(
      `- **Completion rate is low (${completionRate}%)** — review the overall flow length and guard logic`
    )
  if (lines[lines.length - 1] === '')
    lines.push(
      `- No critical issues detected — consider expanding test coverage with more sessions`
    )

  lines.push(``)
  return lines.join('\n')
}

// ─── Aliases (backward compat) ─────────────────────────────────────────────────

export function cmdSessionsBrief(wsVal, args = []) {
  const mapped = args.map(a => (a === '--append' ? '--agent' : a))
  return cmdSessionsReport(wsVal, ['--format', 'md', ...mapped])
}

export function cmdLensReport(wsVal, args = []) {
  return cmdSessionsReport(wsVal, ['--format', 'json', ...args])
}
