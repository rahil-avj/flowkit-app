import { cn } from '@flowkit-kit/lib/utils'
import * as React from 'react'

export interface SwitchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'defaultValue'
> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, defaultChecked, onCheckedChange, disabled, onClick, ...props }, ref) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultChecked ?? false)
    const isControlled = checked !== undefined
    const isChecked = isControlled ? checked : uncontrolled

    function toggle() {
      if (disabled) return
      const next = !isChecked
      if (!isControlled) setUncontrolled(next)
      onCheckedChange?.(next)
    }

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        data-state={isChecked ? 'checked' : 'unchecked'}
        onClick={e => {
          onClick?.(e)
          toggle()
        }}
        className={cn(
          'kit-switch__track peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
          className
        )}
        {...props}
      >
        <span
          data-state={isChecked ? 'checked' : 'unchecked'}
          className="pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 size-5"
        />
      </button>
    )
  }
)
Switch.displayName = 'Switch'

export { Switch }
