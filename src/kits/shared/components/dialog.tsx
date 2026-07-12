'use client'

import { cn } from '@flowkit-kit/lib/utils'
import { Slot } from '@flowkit-kit/primitives/slot'
import { useDismissableLayer, useScrollLock } from '@flowkit-kit/primitives/useDismissableLayer'
import { X } from 'lucide-react'
import * as React from 'react'
import { createPortal } from 'react-dom'

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error('Dialog parts must be used within <Dialog>')
  return ctx
}

interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

const Dialog = ({ open, defaultOpen, onOpenChange, children }: DialogProps) => {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen ?? false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : uncontrolled

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  return (
    <DialogContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, onClick, ...props }, ref) => {
  const { onOpenChange } = useDialogContext()
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : 'button'}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)
        onOpenChange(true)
      }}
      {...props}
    />
  )
})
DialogTrigger.displayName = 'DialogTrigger'

const DialogPortal = ({ children }: { children?: React.ReactNode }) => {
  const { open } = useDialogContext()
  if (!open || typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, onClick, ...props }, ref) => {
  const { onOpenChange } = useDialogContext()
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : 'button'}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)
        onOpenChange(false)
      }}
      {...props}
    />
  )
})
DialogClose.displayName = 'DialogClose'

const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-state="open"
      className={cn(
        'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  )
)
DialogOverlay.displayName = 'DialogOverlay'

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, onOpenChange } = useDialogContext()
    useScrollLock(open)
    const contentRef = useDismissableLayer(open, onOpenChange)

    return (
      <DialogPortal>
        <DialogOverlay />
        <div
          ref={node => {
            contentRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) (ref as React.RefObject<HTMLDivElement | null>).current = node
          }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          data-state="open"
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg translate-[-50%]',
            className
          )}
          {...props}
        >
          {children}
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
      </DialogPortal>
    )
  }
)
DialogContent.displayName = 'DialogContent'

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
DialogDescription.displayName = 'DialogDescription'

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
