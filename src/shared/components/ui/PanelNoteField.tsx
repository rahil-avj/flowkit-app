import { useTheme } from '@platform/shared/contexts/ThemeContext'
import React from 'react'

export interface PanelNoteFieldProps {
  /** Section header label */
  label: string
  /** Optional icon rendered before the label */
  icon?: React.ReactNode
  /** Committed value from screenMeta */
  value?: string
  /**
   * In-progress edit buffer. Pass `undefined` when the field has not been
   * touched in the current edit session (distinct from an empty string).
   */
  pendingValue?: string
  /** When true the field is editable; when false it renders read-only */
  editing?: boolean
  onChange?: (value: string) => void
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>
  onClick?: React.MouseEventHandler<HTMLTextAreaElement>
  rows?: number
  placeholder?: string
  /**
   * Rendered when not editing and value is empty.
   * Accepts ReactNode so callers can embed <code> tags etc.
   */
  emptyHint?: React.ReactNode
}

export default function PanelNoteField({
  label,
  icon,
  value,
  pendingValue,
  editing = false,
  onChange,
  onKeyDown,
  onClick,
  rows = 3,
  placeholder,
  emptyHint,
}: PanelNoteFieldProps) {
  const { theme } = useTheme()
  const [focused, setFocused] = React.useState(false)

  const isDirty = pendingValue !== undefined
  const displayValue = pendingValue ?? value ?? ''
  const hasContent = displayValue.trim().length > 0

  // ── container appearance ────────────────────────────────────────────────────
  // bg: green-tinted when editing or has content, elevated otherwise
  const containerBg = editing || hasContent ? theme.accent.greenDim : theme.bg.elevated

  // border: dashed when completely untouched (no edit mode, no content)
  const borderStyle = !editing && !hasContent ? 'dashed' : 'solid'

  // border color priority: dirty → has-content → focused → default
  let borderColor = theme.bg.border
  if (hasContent && !editing) borderColor = theme.accent.green + '33'
  if (editing) borderColor = isDirty ? theme.accent.green + '66' : theme.bg.border
  if (focused) borderColor = theme.accent.green + '99'

  return (
    <div
      className={`flex flex-col gap-1.5 p-3 rounded-sm border ${borderStyle === 'dashed' ? 'border-dashed' : 'border-solid'}`}
      style={{ backgroundColor: containerBg, borderColor }}
    >
      {/* ── header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {icon && <span className="shrink-0 text-theme-green flex items-center">{icon}</span>}
        <span className="text-ui-2xs font-black tracking-widest text-theme-green">{label}</span>
        {isDirty && (
          <span className="ml-auto text-ui-2xs font-bold text-theme-green opacity-60">unsaved</span>
        )}
      </div>

      {/* ── body ───────────────────────────────────────────────────────────── */}
      {editing ? (
        <textarea
          rows={rows}
          className="w-full bg-transparent outline-none resize-none leading-relaxed text-ui-xs text-theme-text-primary"
          style={{ caretColor: theme.accent.green }}
          placeholder={placeholder}
          value={displayValue}
          onChange={e => onChange?.(e.target.value)}
          onKeyDown={e => {
            e.stopPropagation()
            onKeyDown?.(e)
          }}
          onClick={e => {
            e.stopPropagation()
            onClick?.(e)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      ) : hasContent ? (
        <p className="leading-relaxed text-ui-xs text-theme-text-secondary">{displayValue}</p>
      ) : (
        <p className="italic text-ui-2xs text-theme-text-muted">{emptyHint}</p>
      )}
    </div>
  )
}
