import React from 'react'

import Radio from './Radio'

export interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface RadioGroupProps {
  name: string
  options: RadioOption[]
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  direction?: 'horizontal' | 'vertical'
  style?: React.CSSProperties
}

export default function RadioGroup({
  name,
  options,
  value,
  onChange,
  disabled: groupDisabled,
  direction = 'vertical',
  style,
}: RadioGroupProps) {
  return (
    <div
      className={`flex ${direction === 'horizontal' ? 'flex-row gap-4' : 'flex-col gap-2'}`}
      style={style}
    >
      {options.map(opt => (
        <Radio
          key={opt.value}
          name={name}
          value={opt.value}
          checked={value === opt.value}
          disabled={groupDisabled || opt.disabled}
          onChange={() => onChange?.(opt.value)}
          label={opt.label}
          description={opt.description}
        />
      ))}
    </div>
  )
}
