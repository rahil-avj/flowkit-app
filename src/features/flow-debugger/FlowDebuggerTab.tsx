import EmptyState from '@platform/shared/components/ui/EmptyState'
import { useDashboard } from '@platform/shared/contexts/DashboardContext'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
import { AlertOctagon, Cpu, GitBranch, Route, Zap } from 'lucide-react'
import React from 'react'

import type { DebugSubTab } from './debugSubTabs'

interface Props {
  subTab: DebugSubTab
}

export default function FlowDebuggerTab({ subTab }: Props) {
  const { theme, scale } = useTheme()
  const { activeFlowDebugInfo } = useDashboard()

  const isEmpty = !activeFlowDebugInfo

  const logTab = (
    <>
      {isEmpty || activeFlowDebugInfo.transitionLog.length === 0 ? (
        <EmptyState
          variant="panel"
          icon={<Route size={28} />}
          title={isEmpty ? 'No active flow' : 'No transitions yet'}
          subtitle={
            isEmpty
              ? 'Play a flow to see transitions.'
              : 'Actions will appear here as you navigate.'
          }
        />
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto pr-0.5">
          {[...activeFlowDebugInfo.transitionLog].reverse().map((log, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-1 p-2 rounded bg-black/15 leading-relaxed"
              style={{
                fontSize: scale.text.xxs,
                borderLeft: log.error
                  ? `2px solid ${theme.accent.red}`
                  : log.warnings?.length
                    ? `2px solid ${theme.accent.amber}`
                    : `2px solid ${theme.accent.green}`,
              }}
            >
              <div
                className="flex justify-between items-center"
                style={{ fontSize: scale.text.xxs, color: theme.text.muted }}
              >
                <span>{log.timestamp}</span>
                <span className="font-mono">
                  {log.fromScreen} ➔ {log.toScreen}
                </span>
              </div>
              <div className="font-bold font-mono truncate" style={{ color: theme.text.primary }}>
                Action: <span style={{ color: theme.accent.green }}>{log.action}</span>
              </div>
              {log.payload != null && (
                <div
                  className="font-mono bg-black/10 p-1.5 rounded overflow-x-auto select-all leading-tight"
                  style={{ fontSize: scale.text.xxs, color: theme.text.secondary }}
                >
                  Payload: {JSON.stringify(log.payload)}
                </div>
              )}
              {log.warnings?.map((warn: string, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-1 font-semibold mt-0.5 leading-snug"
                  style={{ fontSize: scale.text.xxs, color: theme.accent.amber }}
                >
                  <AlertOctagon size={10} className="mt-0.5 shrink-0" />
                  <span>{warn}</span>
                </div>
              ))}
              {log.error && (
                <div
                  className="flex items-start gap-1 font-semibold mt-0.5 leading-snug"
                  style={{ fontSize: scale.text.xxs, color: theme.accent.red }}
                >
                  <AlertOctagon size={10} className="mt-0.5 shrink-0" />
                  <span>{log.error}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )

  const effectsTab = (
    <>
      {isEmpty || activeFlowDebugInfo.effects.length === 0 ? (
        <EmptyState
          variant="panel"
          icon={<Zap size={28} />}
          title={isEmpty ? 'No active flow' : 'No signals triggered'}
          subtitle={
            isEmpty
              ? 'Play a flow to see dispatched effects.'
              : 'Effects dispatched during navigation will appear here.'
          }
        />
      ) : (
        <div className="flex flex-wrap gap-1">
          {activeFlowDebugInfo.effects.map((effect, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded font-mono font-bold"
              style={{
                fontSize: scale.text.xxs,
                backgroundColor: theme.accent.purple + '22',
                color: theme.accent.purple,
              }}
            >
              {effect}
            </span>
          ))}
        </div>
      )}
    </>
  )

  const journeyTab = (
    <>
      {isEmpty || activeFlowDebugInfo.history.length === 0 ? (
        <EmptyState
          variant="panel"
          icon={<GitBranch size={28} />}
          title={isEmpty ? 'No active flow' : 'Journey not started'}
          subtitle={
            isEmpty
              ? 'Play a flow to start tracking the journey.'
              : 'Screens visited will appear here.'
          }
        />
      ) : (
        <div className="flex flex-col gap-1.5 pl-2 relative">
          <div
            className="absolute left-[3px] w-px inset-y-1.5"
            style={{ backgroundColor: theme.bg.border }}
          />
          {activeFlowDebugInfo.history.map((screen, idx) => {
            const isCurrent = idx === activeFlowDebugInfo.history.length - 1
            return (
              <div
                key={idx}
                className="flex items-center gap-2 relative"
                style={{ fontSize: scale.text.xs }}
              >
                <div
                  className="rounded-full z-10 transition-all"
                  style={{
                    width: '7px',
                    height: '7px',
                    backgroundColor: isCurrent ? theme.accent.green : theme.text.muted,
                    boxShadow: isCurrent ? `0 0 8px ${theme.accent.green}` : 'none',
                  }}
                />
                <span
                  className={isCurrent ? 'font-bold text-sm' : 'font-normal'}
                  style={{ color: isCurrent ? theme.text.primary : theme.text.secondary }}
                >
                  {screen}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Local Sandbox State */}
      {!isEmpty && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Cpu size={11} style={{ color: theme.accent.blue }} />
            <span
              className="font-black tracking-widest uppercase"
              style={{ fontSize: scale.text.xxs, color: theme.text.muted }}
            >
              Local Sandbox State
            </span>
          </div>
          {Object.keys(activeFlowDebugInfo.state).length === 0 ? (
            <span
              className="italic font-normal"
              style={{ fontSize: scale.text.xs, color: theme.text.muted }}
            >
              No local variables active.
            </span>
          ) : (
            <div
              className="grid grid-cols-2 gap-y-1.5 gap-x-2 bg-black/10 rounded-lg p-2.5 font-mono"
              style={{ fontSize: scale.text.xxs }}
            >
              {Object.entries(activeFlowDebugInfo.state).map(([key, val]) => (
                <React.Fragment key={key}>
                  <span
                    className="truncate pr-1 font-semibold"
                    style={{ color: theme.text.secondary }}
                  >
                    {key}:
                  </span>
                  <span
                    className="truncate select-all text-right font-bold"
                    style={{ color: theme.accent.green }}
                  >
                    {JSON.stringify(val)}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )

  return (
    <div className="flex flex-col gap-3 h-full">
      {subTab === 'journey' && journeyTab}
      {subTab === 'effects' && effectsTab}
      {subTab === 'log' && logTab}
    </div>
  )
}
