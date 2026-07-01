// ── Panel layout constants — single source of truth ───────────────────────────
// All panel widths, rail widths, and resize bounds for every mode.
// Import from here, never define locally in a mode or hook.

// Rail (the icon column, always visible)
export const RAIL_W = 56

// ── Left panel ────────────────────────────────────────────────────────────────
export const LEFT_PANEL_DEFAULT = 296 // rail(56) + content(240)
export const LEFT_PANEL_MIN = 216 // rail(56) + content(160) — tight but readable
export const LEFT_PANEL_MAX = 496

// ── Right panel ───────────────────────────────────────────────────────────────
export const RIGHT_PANEL_DEFAULT = 356 // rail(56) + content(300)
export const RIGHT_PANEL_MIN = 256 // rail(56) + content(200)
export const RIGHT_PANEL_MAX = 576
