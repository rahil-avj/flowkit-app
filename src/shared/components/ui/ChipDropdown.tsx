import Chip from './Chip'
import Combobox from './Combobox'

interface Option {
  value: string
  label: string
}

interface ChipDropdownProps {
  label?: string
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  hint?: string
  creatable?: boolean
  onCreateOption?: (inputValue: string) => void
}

export default function ChipDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select tags...',
  disabled,
  error,
  hint,
  creatable,
  onCreateOption,
}: ChipDropdownProps) {
  const handleSelect = (val: string) => {
    if (!value.includes(val)) {
      onChange([...value, val])
    }
  }

  const handleRemove = (val: string) => {
    onChange(value.filter(v => v !== val))
  }

  const availableOptions = options.filter(o => !value.includes(o.value))
  const selectedOptions = options.filter(o => value.includes(o.value))

  return (
    <div className="flex flex-col gap-[6px] w-full">
      <Combobox
        label={label}
        options={availableOptions}
        value=""
        onChange={handleSelect}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        hint={hint}
        creatable={creatable}
        onCreateOption={input => {
          if (onCreateOption) {
            onCreateOption(input)
          } else {
            const newValue = input.toLowerCase().replace(/\s+/g, '-')
            handleSelect(newValue)
          }
        }}
      />
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedOptions.map(opt => (
            <Chip key={opt.value} onRemove={() => handleRemove(opt.value)}>
              {opt.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}
