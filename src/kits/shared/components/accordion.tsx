import { cn } from '@flowkit-kit/lib/utils'
import { ChevronDown } from 'lucide-react'
import * as React from 'react'

type AccordionType = 'single' | 'multiple'

interface AccordionContextValue {
  type: AccordionType
  value: string[]
  toggle: (itemValue: string) => void
  registerTrigger: (el: HTMLButtonElement | null) => void
  unregisterTrigger: (el: HTMLButtonElement | null) => void
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)
const AccordionItemContext = React.createContext<string | null>(null)

function useAccordionContext() {
  const ctx = React.useContext(AccordionContext)
  if (!ctx) throw new Error('Accordion parts must be used within <Accordion>')
  return ctx
}

interface AccordionRootProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  type?: AccordionType
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
  collapsible?: boolean
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionRootProps>(
  (
    {
      type = 'single',
      value,
      defaultValue,
      onValueChange,
      collapsible = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const toArray = (v: string | string[] | undefined): string[] =>
      v === undefined ? [] : Array.isArray(v) ? v : [v]

    const [uncontrolled, setUncontrolled] = React.useState<string[]>(toArray(defaultValue))
    const isControlled = value !== undefined
    const current = isControlled ? toArray(value) : uncontrolled
    const triggersRef = React.useRef<HTMLButtonElement[]>([])

    const emit = (next: string[]) => {
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(type === 'single' ? (next[0] ?? '') : next)
    }

    const toggle = (itemValue: string) => {
      if (type === 'single') {
        const isOpen = current.includes(itemValue)
        emit(isOpen && collapsible ? [] : [itemValue])
      } else {
        const isOpen = current.includes(itemValue)
        emit(isOpen ? current.filter(v => v !== itemValue) : [...current, itemValue])
      }
    }

    const registerTrigger = (el: HTMLButtonElement | null) => {
      if (el && !triggersRef.current.includes(el)) triggersRef.current.push(el)
    }
    const unregisterTrigger = (el: HTMLButtonElement | null) => {
      triggersRef.current = triggersRef.current.filter(t => t !== el)
    }

    React.useEffect(() => {
      const container = (ref as React.RefObject<HTMLDivElement>)?.current
      function handleKeyDown(e: KeyboardEvent) {
        const items = triggersRef.current
        const idx = items.indexOf(document.activeElement as HTMLButtonElement)
        if (idx === -1) return
        let nextIdx: number | null = null
        if (e.key === 'ArrowDown') nextIdx = (idx + 1) % items.length
        else if (e.key === 'ArrowUp') nextIdx = (idx - 1 + items.length) % items.length
        else if (e.key === 'Home') nextIdx = 0
        else if (e.key === 'End') nextIdx = items.length - 1
        if (nextIdx !== null) {
          e.preventDefault()
          items[nextIdx]?.focus()
        }
      }
      container?.addEventListener('keydown', handleKeyDown)
      return () => container?.removeEventListener('keydown', handleKeyDown)
    }, [ref])

    return (
      <AccordionContext.Provider
        value={{ type, value: current, toggle, registerTrigger, unregisterTrigger }}
      >
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)
Accordion.displayName = 'Accordion'

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => (
  <AccordionItemContext.Provider value={value}>
    <div ref={ref} className={cn('border-b', className)} {...props} />
  </AccordionItemContext.Provider>
))
AccordionItem.displayName = 'AccordionItem'

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { value, toggle, registerTrigger, unregisterTrigger } = useAccordionContext()
  const itemValue = React.useContext(AccordionItemContext)
  const localRef = React.useRef<HTMLButtonElement | null>(null)
  if (itemValue === null) throw new Error('AccordionTrigger must be used within <AccordionItem>')
  const isOpen = value.includes(itemValue)

  React.useEffect(() => {
    const el = localRef.current
    registerTrigger(el)
    return () => unregisterTrigger(el)
  }, [registerTrigger, unregisterTrigger])

  return (
    <h3 className="flex">
      <button
        ref={node => {
          localRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as React.RefObject<HTMLButtonElement | null>).current = node
        }}
        type="button"
        aria-expanded={isOpen}
        data-state={isOpen ? 'open' : 'closed'}
        onClick={() => toggle(itemValue)}
        className={cn(
          'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180',
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="shrink-0 transition-transform duration-200 size-4" />
      </button>
    </h3>
  )
})
AccordionTrigger.displayName = 'AccordionTrigger'

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { value } = useAccordionContext()
  const itemValue = React.useContext(AccordionItemContext)
  if (itemValue === null) throw new Error('AccordionContent must be used within <AccordionItem>')
  const isOpen = value.includes(itemValue)
  if (!isOpen) return null

  return (
    <div
      ref={ref}
      data-state={isOpen ? 'open' : 'closed'}
      className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn('pb-4 pt-0', className)}>{children}</div>
    </div>
  )
})
AccordionContent.displayName = 'AccordionContent'

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
