import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  containerStyle?: React.CSSProperties
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightIcon, style, containerStyle, disabled, ...props },
  ref
) {
  const [isFocused, setIsFocused] = React.useState(false)

  return (
    <div className="flex flex-col gap-1 w-full" style={containerStyle}>
      {label && <label className="text-ui-xs font-bold text-theme-text-secondary">{label}</label>}
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-[10px] flex items-center text-theme-text-muted">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full h-8 text-ui-sm rounded-[6px] bg-theme-base text-theme-text-primary outline-none transition-[border-color] duration-150 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'} ${leftIcon ? 'pl-8' : 'pl-[10px]'} ${rightIcon ? 'pr-8' : 'pr-[10px]'} ${error ? 'border border-theme-red' : isFocused ? 'border border-theme-blue' : 'border border-theme-border'}`}
          style={style}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-[10px] flex items-center text-theme-text-muted">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <span className="text-ui-2xs text-theme-red font-medium">{error}</span>}
      {hint && !error && <span className="text-ui-2xs text-theme-text-muted">{hint}</span>}
    </div>
  )
})

export default Input
