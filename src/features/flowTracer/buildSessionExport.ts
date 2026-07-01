import { SessionDb } from './sessionDb'
import type { SessionExport, SessionMeta } from './types'

/**
 * Reconstruct a full SessionExport (meta + events + snapshots + cursor samples)
 * from the IndexedDB stores for one session. Shared by the export overlay and the
 * FlowLens session library so the two never diverge.
 */
export async function buildSessionExport(meta: SessionMeta): Promise<SessionExport> {
  const [events, snapshots, cursorSamples] = await Promise.all([
    SessionDb.getEvents(meta.id),
    SessionDb.getSnapshots(meta.id),
    SessionDb.getCursorSamples(meta.id),
  ])
  return { meta, events, snapshots, cursorSamples }
}
