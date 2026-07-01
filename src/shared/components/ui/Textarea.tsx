import React from 'react'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  containerStyle?: React.CSSProperties
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, style, containerStyle, disabled, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)

    return (
      <div className="flex flex-col gap-1 w-full" style={containerStyle}>
        {label && <label className="text-ui-xs font-bold text-theme-text-secondary">{label}</label>}
        <textarea
          ref={ref}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full min-h-[60px] p-2 text-ui-sm rounded-[6px] bg-theme-base text-theme-text-primary outline-none transition-[border-color] duration-150 resize-y font-[inherit] ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'} ${error ? 'border border-theme-red' : isFocused ? 'border border-theme-blue' : 'border border-theme-border'}`}
          style={style}
          {...props}
        />
        {error && <span className="text-ui-2xs text-theme-red font-medium">{error}</span>}
        {hint && !error && <span className="text-ui-2xs text-theme-text-muted">{hint}</span>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export default Textarea
