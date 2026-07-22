import { cn } from '@flowkit-kit/lib/utils'
import type { ReactNode } from 'react'

interface GridProps<T> {
  items: T[]
  columns: number
  renderItem: (item: T, index: number) => ReactNode
  gap?: string
  className?: string
}

export default function Grid<T>({
  items,
  columns,
  renderItem,
  gap = 'gap-2',
  className,
}: GridProps<T>) {
  return (
    <div
      className={cn('grid', gap, className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}
    </div>
  )
}
