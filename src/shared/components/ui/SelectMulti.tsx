import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import Chip from './Chip'

interface SelectOption {
  value: string
  label: string
}

interface SelectMultiProps {
  label?: string
  options: SelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  hint?: string
}

export default function SelectMulti({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  disabled,
  error,
  hint,
}: SelectMultiProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (val: string) => {
    const newValue = value.includes(val) ? value.filter(v => v !== val) : [...value, val]
    onChange(newValue)
  }

  const selectedOptions = options.filter(o => value.includes(o.value))

  return (
    <div ref={containerRef} className="flex flex-col gap-1 w-full relative">
      {label && <label className="text-ui-2xs font-bold text-theme-text-secondary">{label}</label>}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center flex-wrap gap-1 min-h-[32px] text-ui-xs rounded-[6px] bg-theme-base text-theme-text-primary relative ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        style={{
          padding: '4px 32px 4px 8px',
          border: `1px solid ${error ? 'var(--color-theme-red)' : isOpen ? 'var(--color-theme-blue)' : 'var(--color-theme-border)'}`,
        }}
      >
        {selectedOptions.length === 0 && (
          <span className="text-theme-text-muted">{placeholder}</span>
        )}
        {selectedOptions.map(opt => (
          <Chip key={opt.value} onRemove={() => toggleOption(opt.value)}>
            {opt.label}
          </Chip>
        ))}
        <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center text-theme-text-muted">
          <ChevronDown size={14} />
        </div>
      </div>
      {isOpen && (
        <div className="absolute top-full z-100 mt-1 bg-theme-elevated border border-theme-border rounded-[6px] max-h-[200px] overflow-y-auto shadow-theme-float inset-x-0">
          {options.map(opt => {
            const isSelected = value.includes(opt.value)
            return (
              <div
                key={opt.value}
                onClick={() => toggleOption(opt.value)}
                className={`px-3 py-2 text-ui-xs bg-transparent cursor-pointer flex items-center ${isSelected ? 'text-theme-blue font-semibold' : 'text-theme-text-primary font-normal'}`}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--color-theme-hover)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {opt.label}
              </div>
            )
          })}
        </div>
      )}
      {error && <span className="text-[10px] text-theme-red font-medium">{error}</span>}
      {hint && !error && <span className="text-[10px] text-theme-text-muted">{hint}</span>}
    </div>
  )
}
