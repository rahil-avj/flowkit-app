// ── Panel layout constants — single source of truth ───────────────────────────
// All panel widths, rail widths, and resize bounds for every mode.
// Import from here, never define locally in a mode or hook.

// Rail (the icon column, always visible) — button 28px + padding 4px each side
export const RAIL_W = 36

// ── Left panel ────────────────────────────────────────────────────────────────
export const LEFT_PANEL_DEFAULT = 296 // rail(36) + content(260)
export const LEFT_PANEL_MIN = 216 // rail(36) + content(180) — tight but readable
export const LEFT_PANEL_MAX = 496

// ── Right panel ───────────────────────────────────────────────────────────────
export const RIGHT_PANEL_DEFAULT = 356 // rail(36) + content(320)
export const RIGHT_PANEL_MIN = 256 // rail(36) + content(220)
export const RIGHT_PANEL_MAX = 576
