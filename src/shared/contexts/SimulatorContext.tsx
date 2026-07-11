import type {
  AutoPlayConfig,
  ColorBlindMode,
  ConnectionMode,
  DevicePreset,
  NetworkSpeed,
} from '@flowkit/types/index'
import { createContext, useContext } from 'react'

export interface SimulatorContextValue {
  devicePreset: DevicePreset
  setDevicePreset: (preset: DevicePreset) => void
  connectionMode: ConnectionMode
  setConnectionMode: (v: ConnectionMode) => void
  networkSpeed: NetworkSpeed
  setNetworkSpeed: (v: NetworkSpeed) => void
  colorBlindMode: ColorBlindMode
  setColorBlindMode: (v: ColorBlindMode) => void
  blurryVision: number
  setBlurryVision: (v: number) => void
  simulatorEnabled: boolean
  setSimulatorEnabled: (v: boolean) => void
  // Auto-play — tightly coupled to simulator controls, lives here rather than a third slice
  flowAutoPlayOverride: Partial<AutoPlayConfig> | null
  setFlowAutoPlayOverride: (v: Partial<AutoPlayConfig> | null) => void
  flowAutoPlayPaused: boolean
  setFlowAutoPlayPaused: (v: boolean) => void
  flowAutoPlayEnabled: boolean
  setFlowAutoPlayEnabled: (v: boolean) => void
  flowAutoPlayDelay: number
  setFlowAutoPlayDelay: (v: number) => void
  flowAutoPlayAnimation: string
  setFlowAutoPlayAnimation: (v: string) => void
  flowAutoPlayLoop: boolean
  setFlowAutoPlayLoop: (v: boolean) => void
}

if (import.meta.hot && !import.meta.hot.data.SimulatorContext) {
  import.meta.hot.data.SimulatorContext = createContext<SimulatorContextValue | null>(null)
}
export const SimulatorContext =
  (import.meta.hot?.data.SimulatorContext as
    ReturnType<typeof createContext<SimulatorContextValue | null>> | undefined) ??
  createContext<SimulatorContextValue | null>(null)

export function useSimulator() {
  const ctx = useContext(SimulatorContext)
  if (!ctx) throw new Error('useSimulator must be used within DashboardProvider')
  return ctx
}
