import type { ReactNode } from 'react'

import { useSimulator } from '../../contexts/DashboardContext'
import DesktopShell from './shells/DesktopShell'
import PhoneShell from './shells/PhoneShell'
import TabletShell from './shells/TabletShell'
import WatchShell from './shells/WatchShell'

interface Props {
  children: ReactNode
  filter?: string
}

export default function DeviceMockup({ children, filter }: Props) {
  const { devicePreset } = useSimulator()

  switch (devicePreset.type) {
    case 'phone':
      return (
        <PhoneShell preset={devicePreset} filter={filter}>
          {children}
        </PhoneShell>
      )
    case 'tablet':
      return (
        <TabletShell preset={devicePreset} filter={filter}>
          {children}
        </TabletShell>
      )
    case 'desktop':
      return (
        <DesktopShell preset={devicePreset} filter={filter}>
          {children}
        </DesktopShell>
      )
    case 'wearable':
      return (
        <WatchShell preset={devicePreset} filter={filter}>
          {children}
        </WatchShell>
      )
    default:
      return (
        <PhoneShell preset={devicePreset} filter={filter}>
          {children}
        </PhoneShell>
      )
  }
}
