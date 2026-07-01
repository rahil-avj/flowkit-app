/**
 * FlowLens mode brand accent. The rest of the platform theme (light/dark,
 * surfaces) is reused unchanged — only the accent shifts to signal a distinct
 * module, the way Figma uses green for Dev Mode and blue for Design Mode.
 *
 * The base values live in FlowLensModeContext (always-bundled) so the toolbar
 * toggle can tint without importing this lazy chunk; re-exported here for the
 * FlowLens UI plus a couple of derived tokens.
 */
export {
  FLOWLENS_ACCENT,
  FLOWLENS_ACCENT_SOFT,
} from '@platform/shared/contexts/FlowLensModeContext'

export const FLOWLENS_ACCENT_BORDER = 'rgba(139, 92, 246, 0.5)'
