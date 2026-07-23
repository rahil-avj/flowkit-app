// Platform command: generates synthetic sample sessions for testing (sessions:sample).
import fs from 'fs'
import path from 'path'
import { g, r, d, c } from '../../helpers/colors.js'
import { resolveWorkspace } from '../../helpers/workspace-resolve.js'
import { libraryDir, workspacePageIds } from './_shared.js'

export function cmdSessionsSample(val) {
  const ws = resolveWorkspace(val)
  const screens = [...workspacePageIds(ws)]
  if (screens.length === 0) {
    console.error(r(`✗ "${ws}" has no screens to sample from — create a flow first.`))
    process.exit(1)
  }

  const id = `sample-${Date.now().toString(36)}`
  const t0 = Date.parse('2024-01-15T10:00:00Z')
  let seq = 0
  const ev = (type, payload = {}) => ({
    id: `${id}-e${seq}`,
    sessionId: id,
    sequenceId: ++seq,
    type,
    timestamp: seq * 600,
    payload,
  })
  const events = [ev('screen.visited', { pageId: screens[0] })]
  for (let i = 1; i < screens.length; i++) {
    events.push(ev('interaction.tap', { pageId: screens[i - 1], elementId: 'primary-cta' }))
    events.push(ev('navigation.programmatic', { to: screens[i], from: screens[i - 1] }))
    events.push(ev('screen.visited', { pageId: screens[i] }))
  }
  events.push(ev('flow.completed', { flowId: 'sample' }))

  const cursorSamples = []
  let cseq = 0
  for (const sid of screens)
    for (let i = 0; i < 30; i++) {
      cursorSamples.push({
        sessionId: id,
        sequenceId: ++cseq,
        timestamp: cseq * 40,
        x: 80 + ((i * 37) % 220),
        y: 150 + ((i * 53) % 500),
        screenW: 393,
        screenH: 852,
        pageId: sid,
      })
    }

  const session = {
    meta: {
      id,
      name: 'Sample session',
      workspaceId: ws,
      startTime: t0,
      endTime: t0 + seq * 600,
      tags: ['sample'],
      eventCount: events.length,
      cursorSampleCount: cursorSamples.length,
      remarks: [],
      qualityScore: 80,
      isTestMode: true,
      capturedScreenW: 393,
      capturedScreenH: 852,
    },
    events,
    snapshots: [],
    cursorSamples,
  }

  const dir = libraryDir(ws)
  fs.mkdirSync(dir, { recursive: true })
  const dest = path.join(dir, `${id}.json`)
  fs.writeFileSync(dest, JSON.stringify(session, null, 2))
  console.log(
    g('✓') +
      ' Sample session written ' +
      d(`→ workspaces/${ws}/lib/flowLens/sessions/…/${path.basename(dest)}`)
  )
  console.log(
    d(`  ${screens.length} screens · ${events.length} events · marked [test]. Remove with: `) +
      c(`flowkit sessions:rm ${id}`)
  )
}
