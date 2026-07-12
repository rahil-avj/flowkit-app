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

// ─── Highlight contrast helpers ───────────────────────────────────────────────
// Shared by desktop Settings and mobile settings so the Debug highlight preview's
// contrast math and swatch choices can't drift between the two surfaces.

export const HIGHLIGHT_SWATCHES = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#ec4899']

// WCAG 2.x relative luminance + contrast ratio, from https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
export function relativeLuminance(hex: string): number {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
export function contrastRatio(hexA: string, hexB: string): number {
  const [l1, l2] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a)
  return (l1 + 0.05) / (l2 + 0.05)
}
// Alpha-composites a semi-transparent foreground hex over an opaque backdrop hex,
// so a partially/fully transparent highlight background is checked against what it
// will actually render on top of — not treated as if it were fully opaque itself.
export function compositeOverBackdrop(fgHex: string, alphaPct: number, backdropHex: string): string {
  const alpha = alphaPct / 100
  const fg = fgHex.replace('#', '')
  const bg = backdropHex.replace('#', '')
  const mix = (i: number) => {
    const f = parseInt(fg.slice(i, i + 2), 16)
    const b = parseInt(bg.slice(i, i + 2), 16)
    return Math.round(f * alpha + b * (1 - alpha))
      .toString(16)
      .padStart(2, '0')
  }
  return `#${mix(0)}${mix(2)}${mix(4)}`
}
// Rounds to 2 decimal places, then trims trailing zeros (1.00 -> "1", 1.50 -> "1.5").
export function formatRatio(ratio: number): string {
  return ratio.toFixed(2).replace(/\.?0+$/, '')
}
export function contrastRating(ratio: number): { label: string; color: string } {
  if (ratio >= 7) return { label: 'AAA', color: 'var(--color-theme-green)' }
  if (ratio >= 4.5) return { label: 'AA', color: 'var(--color-theme-green)' }
  if (ratio >= 3) return { label: 'AA Large', color: 'var(--color-theme-amber)' }
  return { label: 'Fail', color: 'var(--color-theme-red)' }
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
