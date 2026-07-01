import type { CursorSample, SessionEvent, SessionMeta, SessionSnapshot } from './types'

const DB_NAME = 'flowkit-sessions'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result

      // Sessions
      if (!db.objectStoreNames.contains('sessions')) {
        const sessions = db.createObjectStore('sessions', { keyPath: 'id' })
        sessions.createIndex('workspaceId', 'workspaceId')
      }

      // Events
      if (!db.objectStoreNames.contains('events')) {
        const events = db.createObjectStore('events', { keyPath: 'id' })
        events.createIndex('sessionId', 'sessionId')
        events.createIndex('sessionId_sequenceId', ['sessionId', 'sequenceId'], { unique: true })
      }

      // Snapshots
      if (!db.objectStoreNames.contains('snapshots')) {
        const snapshots = db.createObjectStore('snapshots', { autoIncrement: true })
        snapshots.createIndex('sessionId_sequenceId', ['sessionId', 'sequenceId'], { unique: true })
      }

      // Cursor samples
      if (!db.objectStoreNames.contains('cursor_samples')) {
        const cursors = db.createObjectStore('cursor_samples', { autoIncrement: true })
        cursors.createIndex('sessionId', 'sessionId')
        cursors.createIndex('sessionId_sequenceId', ['sessionId', 'sequenceId'])
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function put<T>(db: IDBDatabase, storeName: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function getAll<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  key: IDBValidKey
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const index = store.index(indexName)
    const req = index.getAll(key)
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

function deleteByIndex(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  key: IDBValidKey
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const index = store.index(indexName)
    const req = index.openCursor(IDBKeyRange.only(key))
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }
    req.onerror = () => reject(req.error)
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const SessionDb = {
  async saveMeta(meta: SessionMeta): Promise<void> {
    const db = await openDb()
    await put(db, 'sessions', meta)
  },

  async getMeta(id: string): Promise<SessionMeta | null> {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly')
      const req = tx.objectStore('sessions').get(id)
      req.onsuccess = () => resolve((req.result as SessionMeta) ?? null)
      req.onerror = () => reject(req.error)
    })
  },

  async getAllMeta(): Promise<SessionMeta[]> {
    const db = await openDb()
    return getAllFromStore<SessionMeta>(db, 'sessions')
  },

  async saveEvent(event: SessionEvent): Promise<void> {
    const db = await openDb()
    await put(db, 'events', event)
  },

  async getEvents(sessionId: string): Promise<SessionEvent[]> {
    const db = await openDb()
    const events = await getAll<SessionEvent>(db, 'events', 'sessionId', sessionId)
    return events.sort((a, b) => a.sequenceId - b.sequenceId)
  },

  async saveSnapshot(snapshot: SessionSnapshot): Promise<void> {
    const db = await openDb()
    await put(db, 'snapshots', snapshot)
  },

  async getSnapshots(sessionId: string): Promise<SessionSnapshot[]> {
    const db = await openDb()
    const all = await getAllFromStore<SessionSnapshot>(db, 'snapshots')
    return all.filter(s => s.sessionId === sessionId).sort((a, b) => a.sequenceId - b.sequenceId)
  },

  async saveCursorSample(sample: CursorSample): Promise<void> {
    const db = await openDb()
    await put(db, 'cursor_samples', sample)
  },

  async getCursorSamples(sessionId: string): Promise<CursorSample[]> {
    const db = await openDb()
    return getAll<CursorSample>(db, 'cursor_samples', 'sessionId', sessionId)
  },

  // Crash recovery — find sessions with no endTime
  async getIncomplete(): Promise<SessionMeta[]> {
    const all = await SessionDb.getAllMeta()
    return all.filter(s => !s.endTime)
  },

  // Write an entire merged session in bulk — one connection, one transaction per store.
  async saveMerged(
    meta: SessionMeta,
    events: SessionEvent[],
    snapshots: SessionSnapshot[],
    cursorSamples: CursorSample[]
  ): Promise<void> {
    const db = await openDb()
    await put(db, 'sessions', meta)
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction('events', 'readwrite')
        const store = tx.objectStore('events')
        for (const e of events) store.put(e)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction('snapshots', 'readwrite')
        const store = tx.objectStore('snapshots')
        for (const s of snapshots) store.put(s)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction('cursor_samples', 'readwrite')
        const store = tx.objectStore('cursor_samples')
        for (const c of cursorSamples) store.put(c)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
    ])
  },

  // Prune oldest sessions if total count exceeds maxCount
  async pruneOldSessions(maxCount: number): Promise<void> {
    const all = await SessionDb.getAllMeta()
    if (all.length <= maxCount) return
    const sorted = all.slice().sort((a, b) => a.startTime - b.startTime)
    const toDelete = sorted.slice(0, all.length - maxCount)
    await Promise.all(toDelete.map(s => SessionDb.deleteSession(s.id)))
  },

  // Delete a session and all its data
  async deleteSession(sessionId: string): Promise<void> {
    const db = await openDb()
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction('sessions', 'readwrite')
        const req = tx.objectStore('sessions').delete(sessionId)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      }),
      deleteByIndex(db, 'events', 'sessionId', sessionId),
      // snapshots use autoIncrement keys — cursor by sessionId
      (async () => {
        const tx = db.transaction('snapshots', 'readwrite')
        const store = tx.objectStore('snapshots')
        const req = store.openCursor()
        await new Promise<void>((resolve, reject) => {
          req.onsuccess = () => {
            const cursor = req.result
            if (!cursor) {
              resolve()
              return
            }
            const snap = cursor.value as SessionSnapshot
            if (snap.sessionId === sessionId) cursor.delete()
            cursor.continue()
          }
          req.onerror = () => reject(req.error)
        })
      })(),
      deleteByIndex(db, 'cursor_samples', 'sessionId', sessionId),
    ])
  },
}

// ─── Write batcher ────────────────────────────────────────────────────────────
// Buffers high-frequency writes (events, cursor samples) and flushes them in
// a single IDB transaction every 300ms, instead of one transaction per write.

type PendingWrite = { store: string; value: unknown }

class WriteBatcher {
  private queue: PendingWrite[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly intervalMs: number

  constructor(intervalMs = 300) {
    this.intervalMs = intervalMs
  }

  enqueue(store: string, value: unknown) {
    this.queue.push({ store, value })
    if (!this.timer) {
      this.timer = setTimeout(() => {
        void this.flush()
      }, this.intervalMs)
    }
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.queue.length === 0) return
    const batch = this.queue.splice(0)
    const db = await openDb()
    // Group by store so each store uses exactly one transaction
    const byStore = new Map<string, unknown[]>()
    for (const { store, value } of batch) {
      if (!byStore.has(store)) byStore.set(store, [])
      byStore.get(store)!.push(value)
    }
    await Promise.all(
      [...byStore.entries()].map(
        ([storeName, values]) =>
          new Promise<void>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite')
            const s = tx.objectStore(storeName)
            for (const v of values) s.put(v as object)
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
          })
      )
    )
  }
}

export const sessionWriteBatcher = new WriteBatcher(300)
