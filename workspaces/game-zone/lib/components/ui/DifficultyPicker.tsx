import { cn } from '@flowkit-kit/lib/utils'

export type Difficulty = 'easy' | 'medium' | 'hard'

const OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

interface DifficultyPickerProps {
  value: Difficulty
  onSelect?: (value: Difficulty) => void
}

export default function DifficultyPicker({ value, onSelect }: DifficultyPickerProps) {
  return (
    <div className="flex rounded-[6px] bg-theme-surface p-0.5 gap-0.5">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          id={`difficulty-${opt.value}`}
          onClick={() => onSelect?.(opt.value)}
          className={cn(
            'flex-1 px-2 py-1 rounded-[6px] text-ui-xs font-medium transition-colors duration-150',
            value === opt.value
              ? 'bg-theme-blue-dim text-theme-blue'
              : 'text-theme-text-secondary hover:bg-theme-hover'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
