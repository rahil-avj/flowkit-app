import { ControlAccordion } from '@platform/features/simulator/controls'
import SegmentedControl from '@platform/shared/components/ui/SegmentedControl'
import { useSimulator } from '@platform/shared/contexts/DashboardContext'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
import { Gauge, PlaneTakeoff, Wifi, WifiOff, Zap } from 'lucide-react'

export default function DeviceSettings() {
  const { theme, scale } = useTheme()
  const { connectionMode, setConnectionMode, networkSpeed, setNetworkSpeed } = useSimulator()

  return (
    <ControlAccordion label="OS & Device Settings" defaultOpen>
      <div className="flex flex-col gap-1.5">
        <span
          className="font-black tracking-widest px-1"
          style={{ fontSize: scale.text.xxs, color: theme.text.muted }}
        >
          Connection Mode
        </span>
        <SegmentedControl
          value={connectionMode}
          onChange={v => setConnectionMode(v as Parameters<typeof setConnectionMode>[0])}
          activeColor="blue"
        >
          <SegmentedControl.Segment value="wifi">
            <SegmentedControl.Icon>
              <Wifi size={10} />
            </SegmentedControl.Icon>
            <SegmentedControl.Label>Wi-Fi</SegmentedControl.Label>
          </SegmentedControl.Segment>
          <SegmentedControl.Segment value="mobile">
            <SegmentedControl.Icon>
              <Gauge size={10} />
            </SegmentedControl.Icon>
            <SegmentedControl.Label>Mobile Data</SegmentedControl.Label>
          </SegmentedControl.Segment>
          <SegmentedControl.Segment value="airplane">
            <SegmentedControl.Icon>
              <PlaneTakeoff size={10} />
            </SegmentedControl.Icon>
            <SegmentedControl.Label>Airplane Mode</SegmentedControl.Label>
          </SegmentedControl.Segment>
        </SegmentedControl>
      </div>

      <div
        className="flex flex-col gap-1.5"
        style={{ opacity: connectionMode === 'airplane' ? 0.4 : 1, transition: 'opacity 0.2s' }}
      >
        <div className="flex justify-between items-center px-1">
          <span
            className="font-black tracking-widest"
            style={{ fontSize: scale.text.xxs, color: theme.text.muted }}
          >
            Network Speed
          </span>
          {connectionMode === 'airplane' && (
            <span className="font-bold text-amber-500" style={{ fontSize: scale.text.xxs }}>
              Not Applicable
            </span>
          )}
        </div>
        <SegmentedControl
          value={networkSpeed}
          onChange={v => setNetworkSpeed(v as Parameters<typeof setNetworkSpeed>[0])}
          activeColor="green"
          disabled={connectionMode === 'airplane'}
        >
          <SegmentedControl.Segment value="strong">
            <SegmentedControl.Icon>
              <Zap size={10} />
            </SegmentedControl.Icon>
            <SegmentedControl.Label>Strong</SegmentedControl.Label>
          </SegmentedControl.Segment>
          <SegmentedControl.Segment value="weak">
            <SegmentedControl.Icon>
              <Gauge size={10} />
            </SegmentedControl.Icon>
            <SegmentedControl.Label>Weak</SegmentedControl.Label>
          </SegmentedControl.Segment>
          <SegmentedControl.Segment value="offline">
            <SegmentedControl.Icon>
              <WifiOff size={10} />
            </SegmentedControl.Icon>
            <SegmentedControl.Label>Offline</SegmentedControl.Label>
          </SegmentedControl.Segment>
        </SegmentedControl>
      </div>
    </ControlAccordion>
  )
}
