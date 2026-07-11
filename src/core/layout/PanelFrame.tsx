import { useTheme } from '@flowkit-shared/contexts/ThemeContext'

import type { PanelDragHandle } from './hooks/usePanelDrag'
import ResizeHandle from './ResizeHandle'

interface PanelFrameProps {
  side: 'left' | 'right'
  /**
   * 'absolute' (default) — panel is absolutely positioned and sized to `width`.
   *   Use for overlay panels (FlowLens) that float over the canvas.
   * 'grid' — panel lives inside a CSS grid cell. Width is driven by the grid
   *   column; no width/position styles are applied by this component.
   *   Use for the default-mode panels in PreviewCanvas.
   */
  layout?: 'absolute' | 'grid'
  /** Required when layout='absolute'. Ignored for layout='grid'. */
  width?: number
  handle: PanelDragHandle
  /** Whether the panel content is expanded (handle is hidden when collapsed). */
  isOpen?: boolean
  accentColor?: string
  className?: string
  /** Extra inline styles on the outer container (z-index, shadow, etc.). */
  style?: React.CSSProperties
  children: React.ReactNode
}

/**
 * Shared container for resizable side panels used in every mode.
 *
 * Owns:
 *   - The outer positioned div (absolute, sized to `width`)
 *   - The ResizeHandle, fully wired to `handle` from usePanelLayout
 *
 * Does NOT own:
 *   - Panel content (rail, tabs, lists) — that is `children`
 *   - State, storage, or canvas coupling — the caller controls those
 *
 * Usage:
 *   <PanelFrame side="left" width={leftW} handle={leftHandle} isOpen accentColor={accent}>
 *     <MyPanelContent />
 *   </PanelFrame>
 *   Or with custom Tailwind classes:
 *   <PanelFrame side="left" className="z-30" ...>
 */
export default function PanelFrame({
  side,
  layout = 'absolute',
  width,
  handle,
  isOpen = true,
  accentColor,
  className,
  style,
  children,
}: PanelFrameProps) {
  const { theme } = useTheme()
  const color = accentColor ?? theme.accent.blue

  const isLeft = side === 'left'

  const layoutClass =
    layout === 'absolute'
      ? `absolute top-0 bottom-0 ${isLeft ? 'left-0' : 'right-0'}`
      : 'relative h-full'

  const dynamicStyles: React.CSSProperties = {
    ...(layout === 'absolute' ? { width } : {}),
    ...style,
  }

  return (
    <div
      className={`flex flex-col overflow-clip ${layoutClass} ${className ?? ''}`}
      style={dynamicStyles}
    >
      {children}
      <ResizeHandle
        side={side}
        handleActive={handle.handleActive}
        onMouseDown={handle.startDrag}
        onMouseEnter={() => handle.setHandleActive('hover')}
        onMouseLeave={() => handle.handleActive !== 'drag' && handle.setHandleActive(null)}
        isOpen={isOpen}
        accentColor={color}
      />
    </div>
  )
}
