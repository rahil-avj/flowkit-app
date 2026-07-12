import type { InputHTMLAttributes } from 'react'

export type ToggleSize = 'sm' | 'md'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  size?: ToggleSize
  label?: string
  labelPosition?: 'left' | 'right'
}

const SIZES: Record<ToggleSize, { w: number; h: number; thumb: number; offset: number }> = {
  sm: { w: 32, h: 18, thumb: 12, offset: 3 },
  md: { w: 44, h: 24, thumb: 18, offset: 3 },
}

export default function Toggle({
  size = 'md',
  label,
  labelPosition = 'right',
  checked,
  disabled,
  style,
  ...rest
}: Props) {
  const s = SIZES[size]
  const thumbX = checked ? s.w - s.thumb - s.offset : s.offset

  const track = (
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        className="absolute opacity-0 m-0 z-1"
        style={{
          width: s.w,
          height: s.h,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        {...rest}
      />
      <span
        className="block rounded-full relative pointer-events-none transition-[background,border-color] duration-[0.18s]"
        style={{
          width: s.w,
          height: s.h,
          background: checked ? 'var(--color-theme-blue)' : 'var(--color-theme-border)',
          border: checked
            ? '1px solid var(--color-theme-blue)'
            : '1px solid var(--color-theme-border)',
          boxShadow: checked
            ? 'inset 0 1px 3px rgba(0,0,0,0.2)'
            : 'inset 0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <span
          className="absolute rounded-full bg-white"
          style={{
            top: (s.h - 2 - s.thumb) / 2,
            left: thumbX,
            width: s.thumb,
            height: s.thumb,
            boxShadow: '0 1px 3px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(0,0,0,0.1)',
            transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1), background 0.18s',
          }}
        />
      </span>
    </span>
  )

  if (!label) return track

  return (
    <label
      className="inline-flex items-center gap-2.5 select-none"
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.38 : 1,
        ...style,
      }}
    >
      {labelPosition === 'left' && (
        <span className="text-ui-sm font-normal text-theme-text-secondary leading-normal">
          {label}
        </span>
      )}
      {track}
      {labelPosition === 'right' && (
        <span className="text-ui-sm font-normal text-theme-text-secondary leading-normal">
          {label}
        </span>
      )}
    </label>
  )
}
