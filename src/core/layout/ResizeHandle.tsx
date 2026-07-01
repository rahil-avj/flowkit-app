interface ResizeHandleProps {
  side: 'left' | 'right'
  handleActive: 'hover' | 'drag' | null
  onMouseDown: (e: React.MouseEvent) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  /** Whether the panel is open — handle is inert (not rendered) when collapsed */
  isOpen: boolean
  accentColor: string
}

/**
 * Shared 10px drag handle for resizable panels.
 *
 * Positioning contract (place inside a `position: relative` container):
 *   left  panel → right: -5
 *   right panel → left:  -5
 *
 * All drag logic lives in PanelFrame via usePanelLayout.
 * This component is purely presentational + event-forwarding.
 */
export default function ResizeHandle({
  side,
  handleActive,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  isOpen,
  accentColor,
}: ResizeHandleProps) {
  if (!isOpen) return null

  const edgeProp = side === 'left' ? { right: -5 } : { left: -5 }
  const lineProp = side === 'left' ? { right: 4 } : { left: 4 }

  const lineColor =
    handleActive === 'drag'
      ? accentColor
      : handleActive === 'hover'
        ? accentColor + '80'
        : 'transparent'

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute top-0 w-2.5 h-full z-20 cursor-col-resize"
      style={{
        ...edgeProp,
      }}
    >
      <div
        className={`absolute top-0 w-0.5 h-full`}
        style={{
          ...lineProp,
          backgroundColor: lineColor,
          transition: handleActive === 'drag' ? 'none' : 'background 0.15s',
        }}
      />
    </div>
  )
}
