import { cn } from '@flowkit-kit/lib/utils'
import { Check } from 'lucide-react'
import * as React from 'react'

export interface CheckboxProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'defaultValue'
> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
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
        role="checkbox"
        aria-checked={isChecked}
        disabled={disabled}
        data-state={isChecked ? 'checked' : 'unchecked'}
        onClick={e => {
          onClick?.(e)
          toggle()
        }}
        className={cn(
          'kit-checkbox__box grid place-content-center peer shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground size-4',
          className
        )}
        {...props}
      >
        {isChecked && (
          <span className="grid place-content-center text-current">
            <Check className="size-4" />
          </span>
        )}
      </button>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
