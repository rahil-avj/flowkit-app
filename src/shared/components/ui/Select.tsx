import { ChevronDown } from 'lucide-react'
import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  containerStyle?: React.CSSProperties
}

export default function Select({
  label,
  error,
  hint,
  children,
  style,
  containerStyle,
  disabled,
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1 w-full" style={containerStyle}>
      {label && <label className="text-ui-xs font-bold text-theme-text-secondary">{label}</label>}
      <div className="relative flex items-center w-full">
        <select
          disabled={disabled}
          className={`w-full h-8 pl-[10px] pr-8 text-ui-sm rounded-[6px] bg-theme-base text-theme-text-primary outline-none appearance-none ${error ? 'border border-theme-red' : 'border border-theme-border'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer opacity-100'}`}
          style={style}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-[10px] pointer-events-none flex items-center text-theme-text-muted">
          <ChevronDown size={14} />
        </div>
      </div>
      {error && <span className="text-ui-2xs text-theme-red font-medium">{error}</span>}
      {hint && !error && <span className="text-ui-2xs text-theme-text-muted">{hint}</span>}
    </div>
  )
}
