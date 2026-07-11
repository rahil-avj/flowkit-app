import type { Theme } from '@flowkit/theme'
import Input from '@flowkit-shared/components/ui/Input'
import Toggle from '@flowkit-shared/components/ui/Toggle'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import type { Ctx } from './helpers'
import { updateNestedDbValue } from './helpers'

interface ObjectEditorProps {
  label: string
  bind: string
  val: Record<string, unknown>
  theme: Theme
  ctx: Ctx
}

export function SimObjectEditor({ label, bind, val, theme, ctx }: ObjectEditorProps) {
  const [collapsed, setCollapsed] = useState(true)

  const keys = Object.keys(val).filter(k => typeof val[k] !== 'object')

  const handleFieldChange = (key: string, newValue: unknown) => {
    updateNestedDbValue(ctx, `${bind}.${key}`, newValue)
  }

  return (
    <div
      className="flex flex-col gap-1.5 p-2.5 rounded-lg border"
      style={{ borderColor: theme.bg.border, backgroundColor: theme.bg.elevated }}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex justify-between items-center w-full text-xs font-bold text-left cursor-pointer border-none bg-transparent"
        style={{ color: theme.text.primary }}
      >
        <span>{label}</span>
        <span
          className="px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
          style={{
            fontSize: 'var(--font-size-ui-2xs)',
            backgroundColor: theme.bg.base,
            color: theme.text.muted,
          }}
        >
          Object ({keys.length} fields)
          <ChevronDown
            size={8}
            className="transition-transform"
            style={{ transform: collapsed ? 'none' : 'rotate(180deg)' }}
          />
        </span>
      </button>

      {!collapsed && (
        <div
          className="flex flex-col gap-2 mt-1.5 border-t pt-2"
          style={{ borderColor: `${theme.bg.border}60` }}
        >
          {keys.map(key => {
            const fieldVal = val[key]
            const isBool = typeof fieldVal === 'boolean'
            const isNum = typeof fieldVal === 'number'

            return (
              <div
                key={key}
                className="flex items-center justify-between gap-2"
                style={{ fontSize: 'var(--font-size-ui-2xs)' }}
              >
                <span className="font-mono font-bold text-slate-400 select-none shrink-0">
                  {key}
                </span>
                {isBool ? (
                  <Toggle
                    checked={!!fieldVal}
                    onChange={e => handleFieldChange(key, e.target.checked)}
                  />
                ) : (
                  <Input
                    type={isNum ? 'number' : 'text'}
                    value={fieldVal !== undefined && fieldVal !== null ? String(fieldVal) : ''}
                    onChange={e => {
                      const raw = e.target.value
                      handleFieldChange(key, isNum ? parseFloat(raw) || 0 : raw)
                    }}
                    style={{
                      height: 28,
                      fontSize: 'var(--font-size-ui-xs)',
                      textAlign: isNum ? 'right' : 'left',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
