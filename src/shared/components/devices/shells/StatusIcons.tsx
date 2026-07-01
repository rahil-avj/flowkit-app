import { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignalStrength = 'full' | 'weak' | 'offline'
export type BatterySize = 'sm' | 'md' | 'lg'
export type SignalSize = 'sm' | 'md'

// ─── Cellular Bars ────────────────────────────────────────────────────────────
// Shows 4 rising bars. Weak = bars 2–4 dim + slow scan animation.
// Offline = all bars at low opacity.

interface CellularBarsProps {
  strength: SignalStrength
  size?: SignalSize
  color?: string
}

const SIGNAL_DIMS: Record<SignalSize, { w: number; h: number; bw: number; gap: number }> = {
  sm: { w: 15, h: 10, bw: 2, gap: 3.5 },
  md: { w: 16, h: 11, bw: 2.5, gap: 4.5 },
}

const BAR_HEIGHTS_FRAC = [0.4, 0.55, 0.75, 1.0]

export function CellularBars({ strength, size = 'sm', color = 'currentColor' }: CellularBarsProps) {
  const [scanBar, setScanBar] = useState(0)

  // Animate a sweep across bars when weak signal
  useEffect(() => {
    if (strength !== 'weak') return
    const id = setInterval(() => setScanBar(b => (b + 1) % 4), 500)
    return () => clearInterval(id)
  }, [strength])

  const { w, h, bw, gap } = SIGNAL_DIMS[size]

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill={color}
      style={{ opacity: strength === 'offline' ? 0.35 : 1, flexShrink: 0 }}
    >
      {BAR_HEIGHTS_FRAC.map((frac, i) => {
        const barH = Math.round(h * frac)
        const y = h - barH
        const x = i * (bw + gap)

        const isActive = i === 0 || strength === 'full'
        const isDimmed = strength !== 'full' && i > 0

        // During weak: the scanBar index lights up briefly
        const isScanlit = strength === 'weak' && i === scanBar

        const opacity = isDimmed ? (isScanlit ? 0.9 : 0.25) : 1

        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={bw}
            height={barH}
            rx={0.5}
            opacity={isActive ? 1 : opacity}
            style={{ transition: 'opacity 0.3s ease' }}
          />
        )
      })}
    </svg>
  )
}

// ─── Battery Icon ─────────────────────────────────────────────────────────────
// Renders a battery with fill level. Optionally shows % label.
// Low battery (≤20%) pulses red. Charging plays a fill animation.

interface BatteryIconProps {
  percent?: number
  charging?: boolean
  size?: BatterySize
  showLabel?: boolean
  color?: string
  accentRed?: string
  accentGreen?: string
}

const BATTERY_DIMS: Record<
  BatterySize,
  { w: number; h: number; rx: number; nubW: number; nubH: number; pad: number; fillRx: number }
> = {
  sm: { w: 18, h: 9, rx: 2, nubW: 1.5, nubH: 4, pad: 1.5, fillRx: 1 },
  md: { w: 20, h: 10, rx: 2.5, nubW: 2, nubH: 5, pad: 1.5, fillRx: 1.5 },
  lg: { w: 22, h: 11, rx: 3, nubW: 2, nubH: 5, pad: 2, fillRx: 1.5 },
}

export function BatteryIcon({
  percent = 80,
  charging = false,
  size = 'md',
  showLabel = false,
  color = 'currentColor',
  accentRed = '#ef4444',
  accentGreen = '#22c55e',
}: BatteryIconProps) {
  const [pulse, setPulse] = useState(true)
  const [chargeLevel, setChargeLevel] = useState(percent)

  const isLow = percent <= 20 && !charging

  // Low battery pulse
  useEffect(() => {
    if (!isLow) return
    const id = setInterval(() => setPulse(p => !p), 800)
    return () => {
      clearInterval(id)
      setPulse(true)
    }
  }, [isLow])

  // Charging animation: sweep fill from current % → 100 then reset
  useEffect(() => {
    if (!charging) return
    const id = setInterval(() => {
      setChargeLevel(lvl => {
        const next = lvl + 3
        return next > 100 ? percent : next
      })
    }, 80)
    return () => {
      clearInterval(id)
      setChargeLevel(percent)
    }
  }, [charging, percent])

  const { w, h, rx, nubW, nubH, pad, fillRx } = BATTERY_DIMS[size]
  const bodyW = w - nubW
  const innerW = bodyW - pad * 2
  const innerH = h - pad * 2

  const displayLevel = charging ? chargeLevel : percent
  const fillW = Math.max(0, Math.round((displayLevel / 100) * innerW))

  const fillColor = isLow ? accentRed : charging ? accentGreen : color

  const labelFontSize = size === 'sm' ? 9 : size === 'md' ? 9 : 10

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
      {showLabel && (
        <span
          style={{
            fontSize: labelFontSize,
            fontVariantNumeric: 'tabular-nums',
            color: isLow ? accentRed : color,
            opacity: isLow && !pulse ? 0.3 : 1,
            transition: 'opacity 0.25s ease',
          }}
        >
          {percent}%
        </span>
      )}

      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        fill={isLow && !pulse ? 'none' : color}
        style={{ flexShrink: 0, transition: 'opacity 0.25s ease' }}
      >
        {/* Battery body outline */}
        <rect
          x={0.5}
          y={0.5}
          width={bodyW - 1}
          height={h - 1}
          rx={rx}
          fill="none"
          stroke={isLow ? accentRed : color}
          strokeWidth={1}
          opacity={0.4}
          style={{ transition: 'stroke 0.3s ease' }}
        />

        {/* Fill level */}
        {fillW > 0 && (
          <rect
            x={pad}
            y={pad}
            width={fillW}
            height={innerH}
            rx={fillRx}
            fill={fillColor}
            style={{ transition: 'fill 0.3s ease, width 0.1s linear' }}
          />
        )}

        {/* Nub (positive terminal) */}
        <path
          d={`M${bodyW + 0.5} ${(h - nubH) / 2}v${nubH}a${nubW} ${nubW} 0 0 0 0-${nubH}z`}
          fill={isLow ? accentRed : color}
          opacity={0.5}
          style={{ transition: 'fill 0.3s ease' }}
        />

        {/* Lightning bolt overlay when charging */}
        {charging && (
          <text
            x={bodyW / 2}
            y={h / 2 + 3.5}
            textAnchor="middle"
            fontSize={size === 'sm' ? 6 : 7}
            fill="#fff"
            style={{ userSelect: 'none', fontWeight: 900 }}
          >
            ⚡
          </text>
        )}
      </svg>
    </div>
  )
}
