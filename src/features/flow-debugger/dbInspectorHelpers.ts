import { useCallback, useState } from 'react'

// ─── Value helpers ────────────────────────────────────────────────────────────

export function typeOf(
  val: unknown
): 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object' {
  if (val === null) return 'null'
  if (Array.isArray(val)) return 'array'
  return typeof val as 'boolean' | 'number' | 'string' | 'object'
}

export function nodeMatches(key: string, val: unknown, query: string): boolean {
  const q = query.toLowerCase()
  if (key.toLowerCase().includes(q)) return true
  if (typeof val === 'string' && val.toLowerCase().includes(q)) return true
  if (typeof val === 'number' && String(val).includes(q)) return true
  if (typeof val === 'boolean' && String(val).includes(q)) return true
  if (val !== null && typeof val === 'object') {
    return Object.entries(val as object).some(([k, v]) => nodeMatches(k, v, query))
  }
  return false
}

/** Case-insensitive count of non-overlapping occurrences of `query` in `text`. */
export function countMatches(text: string, query: string): number {
  if (!query) return 0
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let count = 0
  let from = 0
  while (true) {
    const idx = t.indexOf(q, from)
    if (idx === -1) break
    count++
    from = idx + q.length
  }
  return count
}

/** Walk a dot-path like "user.plan" and set the value on the draft. */
export function setAtPath(draft: Record<string, unknown>, dotPath: string, value: unknown) {
  const parts = dotPath.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursor: any = draft
  for (let i = 0; i < parts.length - 1; i++) {
    cursor = cursor[parts[i]]
    if (cursor == null) return
  }
  cursor[parts[parts.length - 1]] = value
}

// ─── Copy-path hook ───────────────────────────────────────────────────────────

export function useCopyPath() {
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const copy = useCallback((path: string) => {
    navigator.clipboard.writeText(path).catch(() => {})
    setCopiedPath(path)
    setTimeout(() => setCopiedPath(null), 1500)
  }, [])
  return { copiedPath, copy }
}
