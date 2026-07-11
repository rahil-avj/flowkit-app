import type { DevicePreset } from '@flowkit/types/index'
import { Plane, Wifi, WifiOff } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { useNavigation, useSimulator } from '../../../contexts/DashboardContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { BatteryIcon, CellularBars } from './StatusIcons'

interface ShellProps {
  preset: DevicePreset
  filter?: string
  children: React.ReactNode
}

export default function TabletShell({ preset, filter, children }: ShellProps) {
  const { orientation, goHome } = useNavigation()
  const { connectionMode, networkSpeed } = useSimulator()
  const { theme, mode } = useTheme()
  const [dateTime, setDateTime] = useState(() => formatDateTime(new Date()))

  useEffect(() => {
    const id = setInterval(() => setDateTime(formatDateTime(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  const isLandscape = orientation === 'landscape'
  const width = isLandscape ? preset.height : preset.width
  const height = isLandscape ? preset.width : preset.height
  const cornerRadius = preset.cornerRadius

  const renderConnectionIcon = () => {
    if (connectionMode === 'airplane') {
      return <Plane size={13} className="rotate-90" />
    }
    if (connectionMode === 'wifi') {
      if (networkSpeed === 'offline') {
        return <WifiOff size={13} style={{ color: theme.accent.red }} />
      }
      if (networkSpeed === 'weak') {
        return (
          <span className="inline-flex items-end gap-px">
            <Wifi size={13} className="opacity-60" />
            <span
              className="text-[7px] font-black leading-none"
              style={{ color: theme.accent.amber }}
            >
              !
            </span>
          </span>
        )
      }
      return <Wifi size={13} />
    }
    // For mobile data: show "5G" badge
    return (
      <span
        className="text-[10px] font-extrabold mr-0.5"
        style={{ color: networkSpeed === 'offline' ? theme.text.disabled : theme.accent.blue }}
      >
        5G
      </span>
    )
  }

  const cellularStrength =
    connectionMode !== 'mobile'
      ? 'full'
      : networkSpeed === 'offline'
        ? 'offline'
        : networkSpeed === 'weak'
          ? 'weak'
          : 'full'

  return (
    <div
      className="touchscreen-device select-none flex flex-col shrink-0 relative overflow-hidden box-border font-[Inter,system-ui,sans-serif]"
      style={{
        width,
        height,
        background: theme.bg.surface,
        boxShadow: theme.shadow.card,
        border: `4.5px solid ${mode === 'dark' ? '#262629' : '#b1b5bd'}`,
        borderRadius: cornerRadius,
      }}
    >
      {/* Outer aluminum rim highlights */}
      <div
        className="absolute inset-0 pointer-events-none z-40"
        style={{
          borderRadius: cornerRadius - 4.5,
          boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.12), inset 0 -1.5px 0 rgba(0,0,0,0.12)',
        }}
      />

      {/* Camera Bezel dot - Tablet top bezel center */}
      <div
        className="absolute top-[6px] left-1/2 -translate-x-1/2 rounded-full z-35 size-2"
        style={{
          backgroundColor: '#050505',
          boxShadow: 'inset 0 0 1.5px rgba(255,255,255,0.25)',
        }}
      />

      {/* iPadOS Status Bar */}
      <div
        className="flex items-end justify-between px-7 pb-1 text-ui-xs font-semibold z-30"
        style={{
          height: preset.safeTop || 36,
          color: theme.text.primary,
          backgroundColor: theme.bg.surface,
        }}
      >
        {/* Left Side: Date and Time */}
        <span className="[font-variant-numeric:tabular-nums]">{dateTime}</span>

        {/* Right Side: Connections and Battery */}
        <div className="flex items-center gap-2">
          {renderConnectionIcon()}
          {connectionMode !== 'airplane' && <CellularBars strength={cellularStrength} size="md" />}
          <BatteryIcon size="lg" percent={94} showLabel />
        </div>
      </div>

      {/* Content Viewport */}
      <div
        className="flex-1 flex flex-col overflow-y-auto overscroll-contain relative"
        style={{
          filter: filter ? filter : undefined,
        }}
      >
        {children}
      </div>

      {/* iPadOS Bottom Home Indicator bar */}
      <div
        className="flex justify-center items-center pb-0.5 z-30"
        style={{
          height: preset.safeBottom || 20,
          backgroundColor: theme.bg.surface,
        }}
      >
        <div
          onClick={goHome}
          className="w-[180px] h-[5px] rounded-[2.5px] opacity-75 cursor-pointer transition-all duration-150 ease-in-out"
          style={{
            backgroundColor: theme.text.primary,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.backgroundColor = theme.accent.blue
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = '0.75'
            e.currentTarget.style.backgroundColor = theme.text.primary
          }}
          title="Home"
        />
      </div>
    </div>
  )
}

function formatDateTime(d: Date) {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }
  // Format to: "Sat Jun 6  15:45"
  const formatted = d.toLocaleDateString('en-US', options)
  // Remove comma from "Sat, Jun 6, 15:45"
  return formatted.replace(/,/g, '')
}
