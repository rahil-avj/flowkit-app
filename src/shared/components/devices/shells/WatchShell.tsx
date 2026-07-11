import type { DevicePreset } from '@flowkit/types/index'
import React, { useEffect, useState } from 'react'

import { useNavigation, useSimulator } from '../../../contexts/DashboardContext'
import { useTheme } from '../../../contexts/ThemeContext'

interface ShellProps {
  preset: DevicePreset
  filter?: string
  children: React.ReactNode
}

export default function WatchShell({ preset, filter, children }: ShellProps) {
  const { goHome } = useNavigation()
  const { connectionMode, networkSpeed } = useSimulator()
  const { theme, mode } = useTheme()
  const [time, setTime] = useState(() => formatTime(new Date()))

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  const isUltra = preset.variant === 'ultra'
  const isOffline = connectionMode === 'airplane' || networkSpeed === 'offline'

  const width = preset.width
  const height = preset.height
  const cornerRadius = preset.cornerRadius

  return (
    <div
      className="touchscreen-device select-none"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 8px 6px 6px', // Space for Digital Crown on right
        boxSizing: 'content-box',
        width,
        height,
      }}
    >
      {/* Dynamic Digital Crown (Clickable Hardware Button on Right) */}
      <div
        onClick={goHome}
        style={{
          position: 'absolute',
          right: 0,
          top: '22%',
          width: isUltra ? 8 : 6,
          height: isUltra ? 38 : 34,
          background: isUltra
            ? 'linear-gradient(to bottom, #d6d3d1 0%, #a8a29e 25%, #d6d3d1 50%, #78716c 75%, #a8a29e 100%)'
            : 'linear-gradient(to bottom, #444 0%, #111 50%, #444 100%)',
          border: isUltra ? '1px solid #78716c' : '1px solid #222',
          borderLeft: 'none',
          borderRadius: '0 4px 4px 0',
          zIndex: 40,
          cursor: 'pointer',
          boxShadow: '1px 2px 4px rgba(0,0,0,0.35)',
        }}
        title="Digital Crown: Click to Go Home"
      />

      {/* Rugged side button (Apple Watch Ultra Action / Power Button) */}
      <div
        style={{
          position: 'absolute',
          right: 1,
          top: '43%',
          width: 5,
          height: isUltra ? 52 : 36,
          background: isUltra ? '#e11d48' : '#222', // Rugged red button on Ultra
          border: isUltra ? '1px solid #9f1239' : 'none',
          borderRadius: '0 2px 2px 0',
          zIndex: 35,
        }}
      />

      {/* Main Watch Case Chassis */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#000000', // Smartwatch screens are solid AMOLED black
          border: isUltra
            ? `5px solid ${mode === 'dark' ? '#2a2b30' : '#d6d3d1'}` // Rugged titanium bezel
            : `4px solid ${mode === 'dark' ? '#1e1e1e' : '#444'}`, // Sleek aluminum bezel
          borderRadius: cornerRadius,
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: theme.shadow.card,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Watch Screen hardware lens highlights */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: cornerRadius - 4,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            zIndex: 40,
          }}
        />

        {/* Watch Status Bar */}
        <div
          style={{
            height: preset.safeTop || 28,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            color: '#ffffff',
            fontSize: 10,
            fontWeight: 800,
            zIndex: 30,
            position: 'relative',
            backgroundColor: '#000000',
            paddingBottom: 2,
          }}
        >
          {/* Centered Time */}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{time}</span>

          {/* Connection / Notification indicator dot */}
          <div
            style={{
              position: 'absolute',
              top: 3,
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: isOffline
                ? theme.accent.red
                : isUltra
                  ? '#f97316'
                  : theme.accent.blue,
              transition: 'background-color 0.2s',
            }}
          />
        </div>

        {/* Content Viewport */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            position: 'relative',
            filter: filter ? filter : undefined,
          }}
        >
          {children}
        </div>

        {/* Bottom screen margin spacing */}
        <div
          style={{
            height: preset.safeBottom || 6,
            backgroundColor: '#000000',
            zIndex: 30,
          }}
        />
      </div>
    </div>
  )
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })
}
