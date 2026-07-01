import { buildSessionExport } from '@platform/features/flowTracer/buildSessionExport'
import { useSessionRecorderOptional } from '@platform/features/flowTracer/context'
import { SessionDb } from '@platform/features/flowTracer/sessionDb'
import type { SessionExport, SessionMeta } from '@platform/features/flowTracer/types'
import { useCallback, useEffect, useMemo, useState } from 'react'

export type SessionSource = 'library' | 'recorded'

export interface LibraryEntry {
  meta: SessionMeta
  source: SessionSource
  /** Study id for committed library sessions; null for live recorded sessions. */
  studyId: string | null
  /** Lazily materialize the full SessionExport for replay/analytics. */
  load: () => Promise<SessionExport>
}

// ── Committed library: session JSON files ─────────────────────────────────────

const _isSingle = import.meta.env.VITE_SINGLE_WORKSPACE === 'true'

// Flat mode: virtual module exposes session files discovered at build time.
import { sessions as _virtualSessions } from 'virtual:flowkit/workspace'

// Repo mode glob (empty in flat mode — no workspaces/ dir on disk).
const libraryModules = import.meta.glob<SessionExport>(
  '/workspaces/**/lib/flowLens/sessions/**/*.json',
  {
    eager: true,
    import: 'default',
  }
)

function isSessionExport(v: unknown): v is SessionExport {
  if (!v || typeof v !== 'object') return false
  const s = v as Partial<SessionExport>
  return !!s.meta?.id && Array.isArray(s.events)
}

/** Derive the workspace name from `/workspaces/<workspace>/lib/flowLens/…`. */
function workspaceFromPath(p: string): string | null {
  const m = p.match(/\/workspaces\/([^/]+)\/lib\/flowLens\//)
  return m ? m[1] : null
}

/** Derive the study id from `/workspaces/<ws>/lib/flowLens/sessions/<study>/file.json`. */
function studyFromPath(p: string): string | null {
  const m = p.match(/\/sessions\/([^/]+)\//)
  return m ? m[1] : null
}

function loadCommittedLibrary(workspace: string): LibraryEntry[] {
  if (_isSingle) {
    // In flat mode sessions are keyed by absolute path (from virtual:flowkit/workspace)
    return Object.values(_virtualSessions)
      .filter(isSessionExport)
      .map(session => ({
        meta: (session as SessionExport).meta,
        source: 'library' as const,
        studyId: null,
        load: async () => session as SessionExport,
      }))
  }
  const entries: LibraryEntry[] = []
  for (const [filePath, mod] of Object.entries(libraryModules)) {
    if (workspaceFromPath(filePath) !== workspace) continue
    if (!isSessionExport(mod)) continue
    const session = mod
    entries.push({
      meta: session.meta,
      source: 'library',
      studyId: studyFromPath(filePath),
      load: async () => session,
    })
  }
  return entries
}

/**
 * The FlowLens session library: committed JSON files (per workspace) merged with
 * the recorder's completed IndexedDB sessions, scoped to the active workspace.
 * Library entries win de-dupe on id. `reload()` re-reads IndexedDB.
 */
export function useSessionLibrary(activeWorkspace: string) {
  const recorder = useSessionRecorderOptional()
  const [recorded, setRecorded] = useState<SessionMeta[]>([])
  const [loading, setLoading] = useState(true)

  const committed = useMemo(() => loadCommittedLibrary(activeWorkspace), [activeWorkspace])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const all = await SessionDb.getAllMeta()
      setRecorded(
        all
          .filter(s => s.endTime && (s.workspaceId ?? activeWorkspace) === activeWorkspace)
          .sort((a, b) => b.startTime - a.startTime)
      )
    } finally {
      setLoading(false)
    }
  }, [activeWorkspace])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload()
  }, [reload])

  // Refresh when a recording finishes (recorder returns to idle).
  const recState = recorder?.state ?? 'idle'
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (recState === 'idle') reload()
  }, [recState, reload])

  const entries = useMemo<LibraryEntry[]>(() => {
    const byId = new Map<string, LibraryEntry>()
    // Recorded first, then committed overrides on id collision.
    for (const meta of recorded) {
      byId.set(meta.id, {
        meta,
        source: 'recorded',
        studyId: null,
        load: () => buildSessionExport(meta),
      })
    }
    for (const e of committed) byId.set(e.meta.id, e)
    return [...byId.values()].sort((a, b) => b.meta.startTime - a.meta.startTime)
  }, [recorded, committed])

  return { entries, loading, reload }
}
