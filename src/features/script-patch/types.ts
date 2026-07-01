export interface PatchScript {
  /** Short label shown on the copy button (e.g. "Copy patch script"). */
  label: string
  /** The full node heredoc string, ready to paste into a terminal. */
  script: string
  /** Optional: a paired restore script shown as a secondary button. */
  restoreScript?: string
}

/** One screen's pending metadata edits — passed to generateScreenMetaPatch. */
export interface ScreenMetaPatchEntry {
  filePath: string
  screenLabel: string
  desc: string
  devNotes: string
  isStandalone?: boolean
  hasTag?: string
  tags?: string[]
}
