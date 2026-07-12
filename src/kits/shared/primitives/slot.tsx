import * as React from 'react'

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === 'function') ref(node)
      else (ref as React.RefObject<T | null>).current = node
    }
  }
}

function mergeProps(slotProps: Record<string, unknown>, childProps: Record<string, unknown>) {
  const merged: Record<string, unknown> = { ...slotProps, ...childProps }
  for (const key in childProps) {
    const slotValue = slotProps[key]
    const childValue = childProps[key]
    const isHandler = /^on[A-Z]/.test(key)
    if (isHandler && typeof slotValue === 'function' && typeof childValue === 'function') {
      merged[key] = (...args: unknown[]) => {
        ;(childValue as (...a: unknown[]) => void)(...args)
        ;(slotValue as (...a: unknown[]) => void)(...args)
      }
    } else if (key === 'className' && slotValue) {
      merged[key] = [slotValue, childValue].filter(Boolean).join(' ')
    } else if (key === 'style' && slotValue) {
      merged[key] = { ...(slotValue as object), ...(childValue as object) }
    }
  }
  return merged
}

/** Renders its single child, merging props/ref/className instead of adding a DOM wrapper. */
export const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ children, ...slotProps }, ref) => {
    if (!React.isValidElement(children)) return null
    const child = children as React.ReactElement<Record<string, unknown>> & {
      ref?: React.Ref<HTMLElement>
    }
    return React.cloneElement(child, {
      ...mergeProps(slotProps, child.props),
      ref: mergeRefs(ref, child.ref),
    })
  }
)
Slot.displayName = 'Slot'
