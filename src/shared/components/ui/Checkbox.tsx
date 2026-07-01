import { Check, Minus } from 'lucide-react'
import React, { useEffect, useRef } from 'react'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
  indeterminate?: boolean
}

export default function Checkbox({
  label,
  description,
  indeterminate,
  checked,
  disabled,
  style,
  ...props
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = !!indeterminate
    }
  }, [indeterminate])

  return (
    <label
      className={`inline-flex gap-2 select-none ${description ? 'items-start' : 'items-center'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      style={style}
    >
      <div className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          ref={inputRef}
          checked={checked}
          disabled={disabled}
          className={`absolute opacity-0 m-0 z-1 size-4 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          {...props}
        />
        <div
          className="rounded-[4px] flex items-center justify-center transition-[background-color,border-color] duration-150 size-4"
          style={{
            border: `1px solid ${checked || indeterminate ? 'var(--color-theme-blue)' : 'var(--color-theme-border)'}`,
            backgroundColor:
              checked || indeterminate ? 'var(--color-theme-blue)' : 'var(--color-theme-base)',
          }}
        >
          {indeterminate && <Minus size={10} strokeWidth={3} className="text-white" />}
          {!indeterminate && checked && <Check size={10} strokeWidth={3} className="text-white" />}
        </div>
      </div>
      {(label || description) && (
        <div className="flex flex-col gap-0.5 leading-[1.2]">
          {label && <span className="text-ui-sm font-medium text-theme-text-primary">{label}</span>}
          {description && <span className="text-ui-2xs text-theme-text-muted">{description}</span>}
        </div>
      )}
    </label>
  )
}
