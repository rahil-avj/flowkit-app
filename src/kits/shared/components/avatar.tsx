import { cn } from '@flowkit-kit/lib/utils'
import * as React from 'react'

type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error'

const AvatarContext = React.createContext<{
  status: ImageLoadingStatus
  setStatus: (status: ImageLoadingStatus) => void
} | null>(null)

function useAvatarContext() {
  const ctx = React.useContext(AvatarContext)
  if (!ctx) throw new Error('Avatar parts must be used within <Avatar>')
  return ctx
}

const Avatar = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => {
    const [status, setStatus] = React.useState<ImageLoadingStatus>('idle')
    return (
      <AvatarContext.Provider value={{ status, setStatus }}>
        <span
          ref={ref}
          className={cn(
            'kit-avatar relative flex shrink-0 overflow-hidden rounded-full size-10',
            className
          )}
          {...props}
        />
      </AvatarContext.Provider>
    )
  }
)
Avatar.displayName = 'Avatar'

const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, onLoad, onError, ...props }, ref) => {
    const { status, setStatus } = useAvatarContext()

    React.useEffect(() => {
      setStatus('loading')
    }, [props.src, setStatus])

    if (status === 'error') return null

    return (
      <img
        ref={ref}
        className={cn('aspect-square size-full', className)}
        onLoad={e => {
          setStatus('loaded')
          onLoad?.(e)
        }}
        onError={e => {
          setStatus('error')
          onError?.(e)
        }}
        {...props}
      />
    )
  }
)
AvatarImage.displayName = 'AvatarImage'

const AvatarFallback = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => {
    const { status } = useAvatarContext()
    if (status === 'loaded') return null
    return (
      <span
        ref={ref}
        className={cn(
          'flex items-center justify-center rounded-full bg-muted size-full',
          className
        )}
        {...props}
      />
    )
  }
)
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarFallback, AvatarImage }
