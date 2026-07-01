import { cn } from '@kit/lib/utils'
import * as React from 'react'

export interface AlertDialogProps {
  open?: boolean
  onClose?: () => void
  icon?: React.ReactNode
  destructive?: boolean
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

const AlertDialog = React.forwardRef<HTMLDivElement, AlertDialogProps>(
  ({ open = true, onClose, icon, destructive, title, description, children, className }, ref) => {
    if (!open) return null
    return (
      <div className="kit-alert-dialog__backdrop" onClick={onClose}>
        <div
          ref={ref}
          className={cn('kit-alert-dialog', className)}
          onClick={e => e.stopPropagation()}
        >
          {icon && (
            <div
              className={cn(
                'kit-alert-dialog__icon',
                destructive && 'kit-alert-dialog__icon--destructive'
              )}
            >
              {icon}
            </div>
          )}
          <div className="kit-alert-dialog__title">{title}</div>
          {description && <div className="kit-alert-dialog__body">{description}</div>}
          {children && <div className="kit-alert-dialog__actions">{children}</div>}
        </div>
      </div>
    )
  }
)
AlertDialog.displayName = 'AlertDialog'

export interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'ghost'
}

const AlertDialogAction = React.forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'kit-button',
        variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'destructive' &&
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
        className
      )}
      {...props}
    />
  )
)
AlertDialogAction.displayName = 'AlertDialogAction'

export { AlertDialog, AlertDialogAction }
