import OverlayShell from '@flowkit-shared/components/overlays/OverlayShell'
import Select from '@flowkit-shared/components/ui/Select'
import { Lock, X } from 'lucide-react'
import { useState } from 'react'

import type { SessionSettings } from './useSessionSettings'

const SAMPLING_RATES = [
  { label: 'Auto (rAF)', value: 0 },
  { label: '5 fps', value: 200 },
  { label: '10 fps', value: 100 },
  { label: '30 fps', value: 33 },
  { label: '60 fps', value: 16 },
]

interface Props {
  settings: SessionSettings
  mode: 'start' | 'settings'
  onClose: () => void
  onSave: (s: SessionSettings) => void
  onStart?: (s: SessionSettings, remember: boolean) => void
}

export default function SessionSettingsOverlay({
  settings,
  mode,
  onClose,
  onSave,
  onStart,
}: Props) {
  const [draft, setDraft] = useState<SessionSettings>({ ...settings })
  const [remember, setRemember] = useState(false)

  const patch = (p: Partial<SessionSettings>) => setDraft(d => ({ ...d, ...p }))

  const handleConfirm = () => {
    if (mode === 'start') {
      if (remember) onSave(draft)
      onStart?.(draft, remember)
    } else {
      onSave(draft)
      onClose()
    }
  }

  return (
    <OverlayShell onClose={onClose} width={640}>
      {/* Header */}
      <div className="flex items-center px-3.5 pt-3 pb-2.5 border-b border-theme-border shrink-0">
        <span className="flex-1 font-bold text-ui-sm text-theme-text-primary">
          {mode === 'start' ? 'Start a session' : 'Session settings'}
        </span>
        <button
          onClick={onClose}
          className="bg-transparent border-none text-theme-text-muted cursor-pointer p-0.5"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="overflow-y-auto p-3.5 flex flex-col gap-4.5 flex-1">
        {/* Name template */}
        <div className="flex flex-col gap-1.5">
          <span className="text-ui-xs text-theme-text-muted font-bold tracking-[0.06em] uppercase">
            Session name template
          </span>
          <input
            className="w-full bg-theme-elevated border border-theme-border rounded-md text-theme-text-primary text-ui-sm px-2.5 py-1.5 outline-none"
            value={draft.nameTemplate}
            onChange={e => patch({ nameTemplate: e.target.value })}
            placeholder="Session · {date}"
          />
          <span className="text-ui-xs text-theme-text-muted">
            Use <code className="text-theme-text-secondary">{'{date}'}</code> for auto date/time
          </span>
        </div>

        {/* Auto-start */}
        <SettingToggle
          label="Auto-start on flow entry"
          value={draft.autoStartOnFlow}
          onChange={v => patch({ autoStartOnFlow: v })}
        />

        {/* Quality threshold */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-ui-xs text-theme-text-muted font-bold tracking-[0.06em] uppercase">
              Quality threshold
            </span>
            <span className="text-ui-xs text-theme-text-secondary">{draft.qualityThreshold}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={draft.qualityThreshold}
            onChange={e => patch({ qualityThreshold: Number(e.target.value) })}
            className="w-full"
            style={{ accentColor: 'var(--color-theme-blue)' }}
          />
          <span className="text-ui-xs text-theme-text-muted">
            Sessions scoring below this are auto-discarded
          </span>
        </div>

        {/* Cursor tracking */}
        <div className="flex flex-col gap-2">
          <SettingToggle
            label="Cursor tracking"
            value={draft.cursorTracking}
            onChange={v => patch({ cursorTracking: v })}
          />
          {draft.cursorTracking && (
            <div className="flex flex-col gap-1.5">
              <span className="text-ui-xs text-theme-text-muted font-bold tracking-[0.06em] uppercase">
                Sampling rate
              </span>
              <Select
                value={String(draft.cursorSamplingRateMs)}
                onChange={e => patch({ cursorSamplingRateMs: Number(e.target.value) })}
                aria-label="Cursor sampling rate"
              >
                {SAMPLING_RATES.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {/* Channels */}
        <div className="flex flex-col gap-2">
          <span className="text-ui-xs text-theme-text-muted font-bold tracking-[0.06em] uppercase">
            Recording channels
          </span>
          <div className="flex flex-col gap-px border border-theme-border rounded-lg overflow-hidden">
            <LockedChannel label="Interactions" />
            <LockedChannel label="Navigation" />
            <ChannelRow
              label="Effects"
              value={draft.effects}
              onChange={v => patch({ effects: v })}
            />
            <ChannelRow
              label="State changes"
              value={draft.stateChanges}
              onChange={v => patch({ stateChanges: v })}
            />
            <ChannelRow
              label="Simulator changes"
              value={draft.simulatorChanges}
              onChange={v => patch({ simulatorChanges: v })}
            />
            <ChannelRow
              label="Panel activity"
              value={draft.panelActivity}
              onChange={v => patch({ panelActivity: v })}
            />
            <ChannelRow
              label="Sidebar activity"
              value={draft.sidebarActivity}
              onChange={v => patch({ sidebarActivity: v })}
            />
            <ChannelRow
              label="Frustrated clicks"
              value={draft.frustratedClicks}
              onChange={v => patch({ frustratedClicks: v })}
            />
            <ChannelRow
              label="Hover events"
              value={draft.hoverEvents}
              onChange={v => patch({ hoverEvents: v })}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3.5 py-2.5 border-t border-theme-border flex items-center gap-2">
        {mode === 'start' && (
          <label className="flex items-center gap-1.5 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="size-3"
              style={{ accentColor: 'var(--color-theme-blue)' }}
            />
            <span className="text-ui-xs text-theme-text-muted">Remember settings</span>
          </label>
        )}
        {mode === 'settings' && <div className="flex-1" />}
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-md bg-transparent border border-theme-border text-theme-text-muted text-ui-xs cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="px-3.5 py-1.5 rounded-md bg-theme-blue border-none text-white text-ui-xs font-bold cursor-pointer"
        >
          {mode === 'start' ? 'Start session' : 'Save settings'}
        </button>
      </div>
    </OverlayShell>
  )
}

function SettingToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-ui-sm text-theme-text-secondary">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
        className="size-3.5"
        style={{ accentColor: 'var(--color-theme-blue)' }}
      />
    </label>
  )
}

function ChannelRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between px-2.5 py-1.5 bg-theme-elevated cursor-pointer">
      <span className="text-ui-xs text-theme-text-secondary">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
        className="size-3"
        style={{ accentColor: 'var(--color-theme-blue)' }}
      />
    </label>
  )
}

function LockedChannel({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 bg-theme-elevated">
      <span className="text-ui-xs text-theme-text-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-ui-xs text-theme-text-muted">Always on</span>
        <Lock size={10} className="text-theme-text-muted" />
      </div>
    </div>
  )
}
