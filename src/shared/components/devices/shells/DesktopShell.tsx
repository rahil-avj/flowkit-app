import type { DevicePreset } from '@flowkit/types/index'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Plane,
  RotateCw,
  Wifi,
  WifiOff,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { useNavigation, useSimulator } from '../../../contexts/DashboardContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { BatteryIcon } from './StatusIcons'

interface ShellProps {
  preset: DevicePreset
  filter?: string
  children: React.ReactNode
}

export default function DesktopShell({ preset, filter, children }: ShellProps) {
  const { activeViewId } = useNavigation()
  const { connectionMode, networkSpeed } = useSimulator()
  const { theme, mode } = useTheme()
  const [time, setTime] = useState(() => formatTime(new Date()))

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  const [isCloseHovered, setIsCloseHovered] = useState(false)

  const isMacBook = preset.label.toLowerCase().includes('macbook')
  const isOffline = connectionMode === 'airplane' || networkSpeed === 'offline'

  const width = preset.width
  const height = preset.height

  // Connection indicator helpers for desktop header
  const renderWifiIcon = () => {
    if (connectionMode === 'airplane')
      return <Plane size={11} style={{ transform: 'rotate(90deg)' }} />
    if (connectionMode === 'wifi') {
      if (networkSpeed === 'offline')
        return <WifiOff size={11} style={{ color: theme.accent.red }} />
      if (networkSpeed === 'weak') return <Wifi size={11} style={{ opacity: 0.5 }} />
      return <Wifi size={11} />
    }
    return (
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: networkSpeed === 'offline' ? theme.text.disabled : theme.accent.blue,
          opacity: 0.8,
        }}
      >
        5G
      </span>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        userSelect: 'none',
        flexDirection: 'column',
        width,
        height,
        background: theme.bg.base,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        border: isMacBook
          ? `8px solid ${mode === 'dark' ? '#1e1f22' : '#a8a29e'}` // Space gray MacBook bezel
          : `1px solid ${theme.bg.border}`,
        borderRadius: isMacBook ? 16 : 4,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* MacBook notched macOS layout */}
      {isMacBook ? (
        <>
          {/* macOS Top Menu Bar */}
          <div
            style={{
              height: 24,
              backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(20px)',
              color: mode === 'dark' ? '#f3f4f6' : '#1f2937',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              zIndex: 35,
              position: 'relative',
            }}
          >
            {/* Left Menu Items (clipped around center notch) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 13, marginRight: 2, cursor: 'default' }}></span>
              <span style={{ fontWeight: 700, cursor: 'default' }}>Flowkit</span>
              <span style={{ opacity: 0.8, cursor: 'default' }}>File</span>
              <span style={{ opacity: 0.8, cursor: 'default' }}>Edit</span>
              <span style={{ opacity: 0.8, cursor: 'default' }}>View</span>
              <span style={{ opacity: 0.8, cursor: 'default' }}>Go</span>
              <span style={{ opacity: 0.8, cursor: 'default' }}>Window</span>
              <span style={{ opacity: 0.8, cursor: 'default' }}>Help</span>
            </div>

            {/* Hardware camera notch centered in macOS menu bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 140,
                height: 20,
                backgroundColor: '#000',
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Camera green led + lens reflection */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#065f46' }} />
                <div
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: '#22c55e',
                    opacity: 0.4,
                  }}
                />
              </div>
            </div>

            {/* Right Status Tray */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {renderWifiIcon()}
              {/* Battery */}
              <BatteryIcon size="sm" percent={100} showLabel />
              <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.9, cursor: 'default' }}>
                {time}
              </span>
            </div>
          </div>

          {/* macOS Browser Chrome (Safari style) */}
          <div
            style={{
              backgroundColor: theme.bg.surface,
              borderBottom: `1px solid ${theme.bg.border}`,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              zIndex: 30,
            }}
          >
            {/* Traffic Light Window Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#ff5f56',
                  border: '0.5px solid #e0443e',
                }}
              />
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#ffbd2e',
                  border: '0.5px solid #dea123',
                }}
              />
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#27c93f',
                  border: '0.5px solid #1aab29',
                }}
              />
            </div>

            {/* Nav Arrows */}
            <div style={{ display: 'flex', gap: 10, color: theme.text.muted }}>
              <ChevronLeft size={16} />
              <ChevronRight size={16} />
            </div>

            {/* URL / Search Bar */}
            <div
              style={{
                flex: 1,
                maxWidth: 680,
                margin: '0 auto',
                height: 26,
                borderRadius: 6,
                backgroundColor: theme.bg.elevated,
                border: `1px solid ${isOffline ? theme.accent.red + '30' : theme.bg.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 10px',
                fontSize: 11,
                color: isOffline ? theme.accent.red : theme.text.secondary,
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                {isOffline ? (
                  <AlertCircle size={12} />
                ) : (
                  <Lock size={10} style={{ opacity: 0.6 }} />
                )}
                <span
                  style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                >
                  {isOffline
                    ? 'flowkit.local — No Internet Connection'
                    : `flowkit.local/view/${activeViewId}`}
                </span>
              </div>
              <RotateCw size={10} style={{ cursor: 'pointer', opacity: 0.6 }} />
            </div>
          </div>
        </>
      ) : (
        // Generic browser window header for Full HD Screen preset
        <div
          style={{
            backgroundColor: theme.bg.surface,
            borderBottom: `1px solid ${theme.bg.border}`,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 30,
          }}
        >
          {/* Tab bar / window header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px 0',
              height: 32,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Active Tab */}
              <div
                style={{
                  padding: '4px 16px',
                  borderRadius: '6px 6px 0 0',
                  backgroundColor: theme.bg.base,
                  border: `1px solid ${theme.bg.border}`,
                  borderBottom: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  color: theme.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>Flowkit Preview</span>
              </div>
            </div>

            {/* Windows Window Controls */}
            <div style={{ display: 'flex', gap: 14, paddingRight: 4, color: theme.text.muted }}>
              <span style={{ fontSize: 14, cursor: 'default' }}>—</span>
              <span style={{ fontSize: 12, cursor: 'default' }}>❑</span>
              <span
                onMouseEnter={() => setIsCloseHovered(true)}
                onMouseLeave={() => setIsCloseHovered(false)}
                style={{
                  fontSize: 13,
                  cursor: 'pointer',
                  color: isCloseHovered ? theme.accent.red : theme.text.muted,
                  transition: 'color 0.15s ease',
                }}
                title="Close"
              >
                ✕
              </span>
            </div>
          </div>

          {/* Browser controls and address bar */}
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: theme.bg.base,
              borderTop: `1px solid ${theme.bg.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', gap: 12, color: theme.text.secondary }}>
              <ChevronLeft size={16} />
              <ChevronRight size={16} />
              <RotateCw size={12} />
            </div>
            <div
              style={{
                flex: 1,
                height: 24,
                borderRadius: 4,
                backgroundColor: theme.bg.surface,
                border: `1px solid ${isOffline ? theme.accent.red + '30' : theme.bg.border}`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                fontSize: 11,
                color: isOffline ? theme.accent.red : theme.text.secondary,
              }}
            >
              {isOffline ? (
                <AlertCircle size={12} style={{ marginRight: 6 }} />
              ) : (
                <Lock size={10} style={{ opacity: 0.6, marginRight: 6 }} />
              )}
              <span>
                {isOffline
                  ? 'flowkit.local — Not Connected'
                  : `http://flowkit.local/view/${activeViewId}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Web content Viewport */}
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
    </div>
  )
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })
}
