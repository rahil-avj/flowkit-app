import { ChevronDown } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

interface Option {
  value: string
  label: string
}

interface ComboboxProps {
  label?: string
  options: Option[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  hint?: string
  creatable?: boolean
  onCreateOption?: (inputValue: string) => void
}

export default function Combobox({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  disabled,
  error,
  hint,
  creatable,
  onCreateOption,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
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

  const selectedOption = options.find(o => o.value === value)

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))

  const showCreateOption =
    creatable && search && !options.some(o => o.label.toLowerCase() === search.toLowerCase())

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
      }
      return
    }

    const totalCount = filteredOptions.length + (showCreateOption ? 1 : 0)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % totalCount)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev - 1 + totalCount) % totalCount)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        onChange(filteredOptions[activeIndex].value)
        setIsOpen(false)
        setSearch('')
      } else if (activeIndex === filteredOptions.length && showCreateOption) {
        onCreateOption?.(search)
        setIsOpen(false)
        setSearch('')
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-1 w-full relative">
      {label && <label className="text-ui-2xs font-bold text-theme-text-secondary">{label}</label>}
      <div className="relative flex items-center w-full">
        <input
          disabled={disabled}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          value={isOpen ? search : selectedOption?.label || ''}
          onChange={e => setSearch(e.target.value)}
          placeholder={selectedOption?.label || placeholder}
          className="w-full h-8 pl-[10px] pr-8 text-ui-xs rounded-[6px] bg-theme-base text-theme-text-primary outline-none"
          style={{
            border: `1px solid ${error ? 'var(--color-theme-red)' : isOpen ? 'var(--color-theme-blue)' : 'var(--color-theme-border)'}`,
            cursor: disabled ? 'not-allowed' : 'text',
            opacity: disabled ? 0.5 : 1,
          }}
        />
        <div className="absolute right-[10px] pointer-events-none flex items-center text-theme-text-muted">
          <ChevronDown size={14} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full z-100 mt-1 bg-theme-elevated border border-theme-border rounded-[6px] max-h-[200px] overflow-y-auto shadow-theme-float inset-x-0">
          {filteredOptions.length === 0 && !showCreateOption && (
            <div className="px-3 py-2 text-ui-xs text-theme-text-muted">No options found</div>
          )}
          {filteredOptions.map((opt, index) => {
            const isSelected = value === opt.value
            const isActive = index === activeIndex
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                  setSearch('')
                }}
                className={`px-3 py-2 text-ui-xs cursor-pointer ${isSelected ? 'font-semibold' : 'font-normal'} ${isActive ? 'bg-theme-hover' : 'bg-transparent'}`}
                style={{
                  color: isSelected ? 'var(--color-theme-blue)' : 'var(--color-theme-text-primary)',
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {opt.label}
              </div>
            )
          })}
          {showCreateOption && (
            <div
              onClick={() => {
                onCreateOption?.(search)
                setIsOpen(false)
                setSearch('')
              }}
              className={`px-3 py-2 text-ui-xs text-theme-blue cursor-pointer border-t border-theme-border ${activeIndex === filteredOptions.length ? 'bg-theme-hover' : 'bg-transparent'}`}
              onMouseEnter={() => setActiveIndex(filteredOptions.length)}
            >
              Create "{search}"
            </div>
          )}
        </div>
      )}
      {error && <span className="text-[10px] font-medium text-theme-red">{error}</span>}
      {hint && !error && <span className="text-[10px] text-theme-text-muted">{hint}</span>}
    </div>
  )
}
