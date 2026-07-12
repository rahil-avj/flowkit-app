import type { DevicePreset } from '@flowkit/types/index'
import { ArrowLeft, Circle, Plane, Square, Wifi, WifiOff } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { useNavigation, useSimulator } from '../../../contexts/DashboardContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { BatteryIcon, CellularBars } from './StatusIcons'

interface ShellProps {
  preset: DevicePreset
  filter?: string
  children: React.ReactNode
}

export default function PhoneShell({ preset, filter, children }: ShellProps) {
  const { orientation, canGoBack, goBack, goHome } = useNavigation()
  const { connectionMode, networkSpeed } = useSimulator()
  const { theme, mode } = useTheme()
  const [time, setTime] = useState(() => formatTime(new Date()))

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  const isLandscape = orientation === 'landscape'
  const isIPhone = preset.platform === 'ios'

  const width = isLandscape ? preset.height : preset.width
  const height = isLandscape ? preset.width : preset.height
  const cornerRadius = preset.cornerRadius

  // Render network status symbols
  const renderConnectionIcon = () => {
    if (connectionMode === 'airplane') {
      return <Plane size={12} style={{ transform: 'rotate(90deg)' }} />
    }
    if (connectionMode === 'wifi') {
      if (networkSpeed === 'offline') {
        return <WifiOff size={12} style={{ color: theme.accent.red }} />
      }
      if (networkSpeed === 'weak') {
        return (
          <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 1 }}>
            <Wifi size={12} style={{ opacity: 0.6 }} />
            <span
              style={{ fontSize: 7, fontWeight: 900, color: theme.accent.amber, lineHeight: 1 }}
            >
              !
            </span>
          </span>
        )
      }
      return <Wifi size={12} />
    }
    // For mobile data: show "5G" badge
    return (
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          color: networkSpeed === 'offline' ? theme.text.disabled : theme.accent.blue,
          marginRight: 2,
        }}
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
      className="touchscreen-device select-none"
      style={{
        display: 'flex',
        flexDirection: isLandscape ? 'row' : 'column',
        width,
        height,
        background: theme.bg.surface,
        boxShadow: theme.shadow.card,
        border: `3px solid ${mode === 'dark' ? '#2a2b30' : '#d1d5db'}`,
        borderRadius: cornerRadius,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* 1. Hardware highlights */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: cornerRadius - 3,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.1)',
          pointerEvents: 'none',
          zIndex: 40,
        }}
      />

      {/* 2. Top Status Bar & Notch Cutout */}
      {!isLandscape && (
        <div
          style={{
            height: preset.safeTop || 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: preset.hasNotch ? '0 24px 6px' : '0 16px',
            color: theme.text.primary,
            fontSize: 12,
            fontWeight: 600,
            userSelect: 'none',
            zIndex: 30,
            position: 'relative',
            backgroundColor: theme.bg.surface,
          }}
        >
          {/* Left status area (Time) */}
          <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 36 }}>{time}</span>

          {/* Device notch */}
          {preset.hasNotch &&
            (isIPhone ? (
              // Dynamic Island
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 100,
                  height: 26,
                  backgroundColor: '#000000',
                  borderRadius: 15,
                  zIndex: 35,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 10px',
                  boxShadow: 'inset 0 0 2px rgba(255,255,255,0.15)',
                }}
              >
                {/* Camera dot */}
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#111',
                    border: '1px solid #222',
                  }}
                />
                {/* Sensor indicator */}
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#050505' }} />
              </div>
            ) : (
              // Android Circular Hole punch
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 11,
                  height: 11,
                  backgroundColor: '#000000',
                  borderRadius: '50%',
                  zIndex: 35,
                  boxShadow: 'inset 0 0 2px rgba(255,255,255,0.2)',
                }}
              />
            ))}

          {/* Right status area (Wifi/Cellular/Battery) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {renderConnectionIcon()}
            {connectionMode !== 'airplane' && (
              <CellularBars strength={cellularStrength} size="sm" />
            )}
            <BatteryIcon size={preset.hasNotch ? 'md' : 'sm'} percent={88} showLabel={isIPhone} />
          </div>
        </div>
      )}

      {/* 3. Main content viewport */}
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

        {/* Floating back button for iOS (since iOS has no software navigation buttons) */}
        {isIPhone && canGoBack && (
          <button
            onClick={goBack}
            style={{
              position: 'absolute',
              bottom: 24,
              left: 16,
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: theme.bg.surface,
              border: `1px solid ${theme.bg.border}`,
              color: theme.text.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: theme.shadow.float,
              cursor: 'pointer',
              zIndex: 45,
              opacity: 0.9,
              transition: 'transform 0.15s, opacity 0.15s',
              outline: 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.06)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
            title="Go Back"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* 4. Bottom Chrome (Navigation) */}
      {!isLandscape ? (
        isIPhone ? (
          // iOS bottom chrome with home gesture indicator
          <div
            style={{
              height: preset.safeBottom || 24,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              paddingBottom: 4,
              backgroundColor: theme.bg.surface,
              zIndex: 30,
            }}
          >
            <div
              onClick={goHome}
              style={{
                width: 120,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: theme.text.primary,
                opacity: 0.8,
                cursor: 'pointer',
                transition: 'opacity 0.15s, background-color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.backgroundColor = theme.accent.blue
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = '0.8'
                e.currentTarget.style.backgroundColor = theme.text.primary
              }}
              title="Home"
            />
          </div>
        ) : (
          // Android bottom navigation bar (3-Button)
          <div
            style={{
              height: 48,
              borderTop: `1px solid ${theme.bg.border}`,
              backgroundColor: theme.bg.surface,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              paddingLeft: 40,
              paddingRight: 40,
              zIndex: 30,
            }}
          >
            <button
              onClick={goBack}
              disabled={!canGoBack}
              style={{
                border: 'none',
                background: 'none',
                color: canGoBack ? theme.text.primary : theme.text.disabled,
                cursor: canGoBack ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                outline: 'none',
              }}
              title="Back"
            >
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
            <button
              onClick={goHome}
              style={{
                border: 'none',
                background: 'none',
                color: theme.text.primary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                outline: 'none',
              }}
              title="Home"
            >
              <Circle size={16} strokeWidth={2.5} />
            </button>
            <div
              style={{
                color: theme.text.muted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
              }}
              title="Recents"
            >
              <Square size={13} strokeWidth={2} />
            </div>
          </div>
        )
      ) : (
        // Landscape navigation bar running on the right side
        <div
          style={{
            width: 52,
            borderLeft: `1px solid ${theme.bg.border}`,
            backgroundColor: theme.bg.surface,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingTop: 32,
            paddingBottom: 32,
            zIndex: 30,
          }}
        >
          <button
            onClick={goBack}
            disabled={!canGoBack}
            style={{
              border: 'none',
              background: 'none',
              color: canGoBack ? theme.text.primary : theme.text.disabled,
              cursor: canGoBack ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              outline: 'none',
            }}
            title="Back"
          >
            <ArrowLeft size={18} strokeWidth={2} style={{ transform: 'rotate(-90deg)' }} />
          </button>
          <button
            onClick={goHome}
            style={{
              border: 'none',
              background: 'none',
              color: theme.text.primary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              outline: 'none',
            }}
            title="Home"
          >
            <Circle size={16} strokeWidth={2.5} />
          </button>
          <div
            style={{
              color: theme.text.muted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
            }}
            title="Recents"
          >
            <Square size={13} strokeWidth={2} />
          </div>
        </div>
      )}
    </div>
  )
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })
}
