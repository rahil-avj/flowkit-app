import type { Theme } from '@flowkit/theme'
import Input from '@flowkit-shared/components/ui/Input'
import Toggle from '@flowkit-shared/components/ui/Toggle'
import { update } from '@flowkit-shared/utils/dbHelpers'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'

import type { Ctx } from './helpers'

interface ArrayEditorProps {
  label: string
  bind: string
  val: Record<string, unknown>[]
  theme: Theme
  ctx: Ctx
}

export function SimArrayEditor({ label, bind, val, theme, ctx }: ArrayEditorProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItemData, setNewItemData] = useState<Record<string, unknown>>({})

  const templateItem = val[0] || {}
  const itemKeys = Object.keys(templateItem).filter(k => typeof templateItem[k] !== 'object')

  const handleRemoveItem = (index: number) => {
    const targetPath = bind.replace(/^db\./, '')
    update<unknown[]>(ctx.updateDb, targetPath, (array = []) => {
      if (Array.isArray(array)) array.splice(index, 1)
      return array
    })
  }

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const targetPath = bind.replace(/^db\./, '')
    update<unknown[]>(ctx.updateDb, targetPath, (array = []) => {
      if (!Array.isArray(array)) return array
      const itemToAdd: Record<string, unknown> = {}

      if ('id' in templateItem) {
        if (typeof templateItem.id === 'number') {
          const maxId = array.reduce(
            (max: number, item: unknown) =>
              Math.max(max, Number((item as Record<string, unknown>).id) || 0),
            0
          )
          itemToAdd.id = maxId + 1
        } else {
          itemToAdd.id = Math.random().toString(36).substring(2, 9)
        }
      }

      itemKeys.forEach(key => {
        if (key === 'id') return
        const templateVal = templateItem[key]
        const inputVal = newItemData[key]

        if (typeof templateVal === 'boolean') {
          itemToAdd[key] = !!inputVal
        } else if (typeof templateVal === 'number') {
          itemToAdd[key] = parseFloat(inputVal as string) || 0
        } else {
          itemToAdd[key] = inputVal !== undefined ? String(inputVal) : ''
        }
      })

      array.push(itemToAdd)
      return array
    })

    setNewItemData({})
    setShowAddForm(false)
  }

  const getItemLabel = (item: Record<string, unknown>, idx: number): string => {
    const v = item.name ?? item.label ?? item.title ?? item.text ?? item.email ?? item.id
    return v != null ? String(v) : `Item #${idx + 1}`
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
          className="px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1"
          style={{
            fontSize: 'var(--font-size-ui-2xs)',
            backgroundColor: theme.bg.base,
            color: theme.text.muted,
          }}
        >
          Array ({val.length} items)
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
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-0.5">
            {val.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 rounded"
                style={{
                  fontSize: 'var(--font-size-ui-2xs)',
                  backgroundColor: theme.bg.base,
                  border: `1px solid ${theme.bg.border}50`,
                }}
              >
                <span className="truncate max-w-[200px]" style={{ color: theme.text.secondary }}>
                  {getItemLabel(item, idx)}
                </span>
                <button
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1 rounded text-red-500 hover:bg-red-500/10 cursor-pointer border-none bg-transparent"
                  title="Remove item"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
            {val.length === 0 && (
              <span
                className="text-center italic py-2"
                style={{ fontSize: 'var(--font-size-ui-2xs)', color: theme.text.disabled }}
              >
                Empty List
              </span>
            )}
          </div>

          {showAddForm ? (
            <form
              onSubmit={handleAddItemSubmit}
              className="flex flex-col gap-2 p-2 rounded border"
              style={{ borderColor: theme.bg.border, backgroundColor: theme.bg.base }}
            >
              <span
                className="font-black uppercase tracking-wider block"
                style={{ fontSize: 'var(--font-size-ui-xs)', color: theme.text.primary }}
              >
                Add New Item
              </span>
              {itemKeys.map(key => {
                if (key === 'id') return null
                const templateVal = templateItem[key]
                const isBool = typeof templateVal === 'boolean'
                const isNum = typeof templateVal === 'number'

                return (
                  <div
                    key={key}
                    className="flex flex-col gap-0.5"
                    style={{ fontSize: 'var(--font-size-ui-xs)' }}
                  >
                    <span className="font-mono text-slate-400 uppercase select-none">{key}</span>
                    {isBool ? (
                      <Toggle
                        checked={!!newItemData[key]}
                        onChange={e =>
                          setNewItemData(prev => ({ ...prev, [key]: e.target.checked }))
                        }
                      />
                    ) : (
                      <Input
                        type={isNum ? 'number' : 'text'}
                        value={newItemData[key] !== undefined ? String(newItemData[key]) : ''}
                        onChange={e => setNewItemData(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{ height: 28, fontSize: 'var(--font-size-ui-xs)' }}
                        required
                      />
                    )}
                  </div>
                )
              })}
              <div className="flex gap-1 justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2 py-1 rounded font-bold border cursor-pointer bg-transparent"
                  style={{
                    fontSize: 'var(--font-size-ui-xs)',
                    color: theme.text.secondary,
                    borderColor: theme.bg.border,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2 py-1 rounded font-bold text-white cursor-pointer border-none"
                  style={{
                    fontSize: 'var(--font-size-ui-xs)',
                    backgroundColor: theme.accent.green,
                  }}
                >
                  Add
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center justify-center gap-1 py-1.5 rounded border border-dashed font-bold transition-all cursor-pointer bg-transparent"
              style={{
                fontSize: 'var(--font-size-ui-2xs)',
                borderColor: theme.bg.border,
                color: theme.text.secondary,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = theme.accent.green
                e.currentTarget.style.color = theme.accent.green
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = theme.bg.border
                e.currentTarget.style.color = theme.text.secondary
              }}
            >
              <Plus size={10} /> Add Item
            </button>
          )}
        </div>
      )}
    </div>
  )
}
