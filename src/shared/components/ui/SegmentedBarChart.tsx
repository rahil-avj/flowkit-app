import { useState } from 'react'

import { useTheme } from '../../contexts/ThemeContext'

export interface ChartSegment {
  key: string
  value: number
  color: string
  label: string
  legendLabel: string
}

interface SegmentedBarChartProps {
  segments: ChartSegment[]
  activeKey: string
  title: string
  activeLabel: string
}

export default function SegmentedBarChart({
  segments,
  activeKey,
  title,
  activeLabel,
}: SegmentedBarChartProps) {
  const { theme, scale } = useTheme()
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  const total = segments.reduce((sum, s) => sum + s.value, 0)
  let currentStart = 0
  const centers: Record<string, string> = {}

  segments.forEach(seg => {
    const widthPct = total > 0 ? (seg.value / total) * 100 : 0
    const centerPct = currentStart + widthPct / 2
    centers[seg.key] = `${centerPct}%`
    currentStart += widthPct
  })

  const pointerLeft = centers[activeKey] || '0%'
  const activeSegment = segments.find(s => s.key === activeKey)

  return (
    <div className="relative w-full min-w-0 mt-2 mb-1 flex flex-col gap-1.5 px-1">
      <div
        className="flex justify-between items-center font-black tracking-wider uppercase mb-0.5 text-theme-text-muted text-ui-2xs"
        style={{ fontSize: scale.text.xxs }}
      >
        <span>{title}</span>
        <span className="text-theme-text-primary" style={{ color: theme.text.primary }}>
          {activeLabel}
        </span>
      </div>

      {/* Sliding Pointer Indicator */}
      <div className="relative w-full min-w-0 h-6.5 overflow-hidden">
        {/* Floating Active Label */}
        <div
          className="absolute bottom-1.5 max-w-full"
          style={{
            left: pointerLeft,
            transform: `translateX(-${parseFloat(pointerLeft)}%)`,
            transition: 'left 0.2s ease-in-out, transform 0.2s ease-in-out',
          }}
        >
          <span
            className="font-black font-mono px-1 py-0.5 rounded shadow-sm bg-theme-elevated border border-theme-border whitespace-nowrap"
            style={{
              fontSize: scale.text.xxs,
              color: activeSegment?.color || theme.text.primary,
              backgroundColor: theme.bg.elevated,
              border: `1px solid ${theme.bg.border}`,
            }}
          >
            {activeSegment?.legendLabel}
          </span>
        </div>

        {/* Downward Triangle Arrow */}
        <div
          className="size-0 absolute bottom-0 border-x-4 border-x-transparent"
          style={{
            left: pointerLeft,
            transform: 'translateX(-50%)',
            borderTop: `5px solid ${theme.text.primary}`,
            transition: 'left 0.2s ease-in-out',
          }}
        />
      </div>

      {/* Segmented bar */}
      <div
        className="relative w-full h-2 rounded-full overflow-hidden flex border border-theme-border"
        style={{ border: `1px solid ${theme.bg.border}` }}
      >
        {segments.map(seg => (
          <div
            key={seg.key}
            onMouseEnter={() => setHoveredKey(seg.key)}
            onMouseLeave={() => setHoveredKey(null)}
            className="cursor-pointer"
            style={{
              width: `${total > 0 ? (seg.value / total) * 100 : 0}%`,
              backgroundColor: seg.color,
            }}
            title={`${seg.label} (~${seg.value}% of population)`}
          />
        ))}
      </div>

      {/* Legend percentages */}
      <div
        className="flex w-full min-w-0 font-extrabold text-slate-500 font-mono mt-0.5 px-0.5 h-3"
        style={{ fontSize: scale.text.xxs }}
      >
        {segments.map((seg, idx) => {
          const widthPct = total > 0 ? (seg.value / total) * 100 : 0
          const isActive = seg.key === activeKey
          const isHovered = hoveredKey === seg.key

          let textAlign: 'left' | 'center' | 'right' = 'center'
          if (idx === 0) textAlign = 'left'
          if (idx === segments.length - 1) textAlign = 'right'
          return (
            <span
              key={seg.key}
              onMouseEnter={() => setHoveredKey(seg.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className="inline-block min-w-0 overflow-hidden whitespace-nowrap text-ellipsis transition-opacity duration-150 ease-in-out"
              style={{
                width: `${widthPct}%`,
                color: seg.color,
                textAlign,
                opacity: !isActive && isHovered ? 1 : 0,
                pointerEvents: isActive ? 'none' : 'auto',
              }}
            >
              {seg.legendLabel}
            </span>
          )
        })}
      </div>
    </div>
  )
}
