'use client'

import { cn } from '@flowkit-kit/lib/utils'
import { useDismissableLayer } from '@flowkit-kit/primitives/useDismissableLayer'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import * as React from 'react'
import { createPortal } from 'react-dom'

interface SelectContextValue {
  value: string | undefined
  setValue: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  activeValue: string | undefined
  setActiveValue: (value: string) => void
  registerItem: (value: string, label: string) => void
  labelFor: (value: string | undefined) => string | undefined
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const ctx = React.useContext(SelectContext)
  if (!ctx) throw new Error('Select parts must be used within <Select>')
  return ctx
}

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

const Select = ({
  value,
  defaultValue,
  onValueChange,
  open: openProp,
  onOpenChange,
  children,
}: SelectProps) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const isValueControlled = value !== undefined
  const currentValue = isValueControlled ? value : uncontrolledValue

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isOpenControlled = openProp !== undefined
  const isOpen = isOpenControlled ? openProp : uncontrolledOpen

  const [activeValue, setActiveValue] = React.useState<string | undefined>(currentValue)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const labelsRef = React.useRef<Map<string, string>>(new Map())

  const setValue = (next: string) => {
    if (!isValueControlled) setUncontrolledValue(next)
    onValueChange?.(next)
  }
  const setOpen = (next: boolean) => {
    if (!isOpenControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
    if (next) setActiveValue(currentValue)
  }
  const registerItem = (itemValue: string, label: string) => {
    labelsRef.current.set(itemValue, label)
  }
  const labelFor = (v: string | undefined) =>
    v === undefined ? undefined : labelsRef.current.get(v)

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        setValue,
        open: isOpen,
        setOpen,
        triggerRef,
        activeValue,
        setActiveValue,
        registerItem,
        labelFor,
      }}
    >
      {children}
    </SelectContext.Provider>
  )
}

const SelectGroup = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div role="group" className={className} {...props} />
)
SelectGroup.displayName = 'SelectGroup'

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value, labelFor } = useSelectContext()
  const label = labelFor(value)
  return <span data-placeholder={label === undefined ? '' : undefined}>{label ?? placeholder}</span>
}
SelectValue.displayName = 'SelectValue'

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, onClick, ...props }, ref) => {
  const { open, setOpen, triggerRef } = useSelectContext()
  return (
    <button
      ref={node => {
        triggerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as React.RefObject<HTMLButtonElement | null>).current = node
      }}
      type="button"
      role="combobox"
      aria-expanded={open}
      onClick={e => {
        onClick?.(e)
        setOpen(!open)
      }}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background data-placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="opacity-50 size-4" />
    </button>
  )
})
SelectTrigger.displayName = 'SelectTrigger'

const SelectScrollUpButton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronUp className="size-4" />
    </div>
  )
)
SelectScrollUpButton.displayName = 'SelectScrollUpButton'

const SelectScrollDownButton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronDown className="size-4" />
  </div>
))
SelectScrollDownButton.displayName = 'SelectScrollDownButton'

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { position?: 'popper' | 'item-aligned' }
>(({ className, children, position = 'popper', ...props }, ref) => {
  const { open, setOpen, triggerRef, activeValue, setActiveValue, setValue } = useSelectContext()
  const listRef = useDismissableLayer(open, setOpen)
  const [rect, setRect] = React.useState<{ top: number; left: number; width: number } | null>(null)
  const typeaheadRef = React.useRef('')
  const typeaheadTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  React.useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setRect({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width })
  }, [open, triggerRef])

  React.useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      const node = listRef.current
      if (!node) return
      const items = Array.from(node.querySelectorAll<HTMLElement>('[data-select-item]'))
      const values = items.map(el => el.dataset.value ?? '')
      const idx = values.indexOf(activeValue ?? '')

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = values[(idx + 1 + values.length) % values.length]
        setActiveValue(next)
        items[values.indexOf(next)]?.scrollIntoView({ block: 'nearest' })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const next = values[(idx - 1 + values.length) % values.length]
        setActiveValue(next)
        items[values.indexOf(next)]?.scrollIntoView({ block: 'nearest' })
      } else if (e.key === 'Home') {
        e.preventDefault()
        setActiveValue(values[0])
      } else if (e.key === 'End') {
        e.preventDefault()
        setActiveValue(values[values.length - 1])
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (activeValue !== undefined) {
          setValue(activeValue)
          setOpen(false)
        }
      } else if (e.key.length === 1 && /\S/.test(e.key)) {
        typeaheadRef.current += e.key.toLowerCase()
        clearTimeout(typeaheadTimer.current)
        typeaheadTimer.current = setTimeout(() => {
          typeaheadRef.current = ''
        }, 600)
        const match = items.find(el =>
          el.textContent?.trim().toLowerCase().startsWith(typeaheadRef.current)
        )
        if (match?.dataset.value !== undefined) setActiveValue(match.dataset.value)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, activeValue, listRef, setActiveValue, setValue, setOpen])

  if (!open || !rect) return null

  return createPortal(
    <div
      ref={node => {
        listRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as React.RefObject<HTMLDivElement | null>).current = node
      }}
      role="listbox"
      tabIndex={-1}
      style={{ position: 'absolute', top: rect.top, left: rect.left, minWidth: rect.width }}
      className={cn(
        'z-50 max-h-96 min-w-32 overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
        className
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <div className={cn('p-1', position === 'popper' && 'w-full')}>{children}</div>
      <SelectScrollDownButton />
    </div>,
    document.body
  )
})
SelectContent.displayName = 'SelectContent'

const SelectLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)} {...props} />
  )
)
SelectLabel.displayName = 'SelectLabel'

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string; disabled?: boolean }
>(({ className, children, value, disabled, onClick, ...props }, ref) => {
  const {
    value: selected,
    setValue,
    setOpen,
    activeValue,
    setActiveValue,
    registerItem,
  } = useSelectContext()
  const isSelected = selected === value
  const isActive = activeValue === value

  React.useEffect(() => {
    registerItem(value, typeof children === 'string' ? children : String(children))
  }, [value, children, registerItem])

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      data-select-item
      data-value={value}
      data-disabled={disabled ? '' : undefined}
      onMouseEnter={() => !disabled && setActiveValue(value)}
      onClick={e => {
        onClick?.(e)
        if (disabled) return
        setValue(value)
        setOpen(false)
      }}
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-disabled:pointer-events-none data-disabled:opacity-50',
        isActive && 'bg-accent text-accent-foreground',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex items-center justify-center size-3.5">
        {isSelected && <Check className="size-4" />}
      </span>
      {children}
    </div>
  )
})
SelectItem.displayName = 'SelectItem'

const SelectSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />
  )
)
SelectSeparator.displayName = 'SelectSeparator'

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
