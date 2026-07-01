import React from 'react'

interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
}

export default function Radio({
  label,
  description,
  checked,
  disabled,
  style,
  ...props
}: RadioProps) {
  return (
    <label
      className={`inline-flex gap-2 select-none ${description ? 'items-start' : 'items-center'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      style={style}
    >
      <div className="relative inline-flex shrink-0">
        <input
          type="radio"
          checked={checked}
          disabled={disabled}
          className={`absolute opacity-0 m-0 z-1 size-4 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          {...props}
        />
        <div
          className="rounded-full border flex items-center justify-center transition-[border-color] duration-150 bg-theme-base size-4"
          style={{
            borderColor: checked ? 'var(--color-theme-blue)' : 'var(--color-theme-border)',
          }}
        >
          {checked && (
            <div
              className="rounded-full size-2"
              style={{ backgroundColor: 'var(--color-theme-blue)' }}
            />
          )}
        </div>
      </div>
      {(label || description) && (
        <div className="flex flex-col gap-0.5 leading-[1.2]">
          {label && <span className="text-ui-xs font-medium text-theme-text-primary">{label}</span>}
          {description && <span className="text-[10px] text-theme-text-muted">{description}</span>}
        </div>
      )}
    </label>
  )
}
