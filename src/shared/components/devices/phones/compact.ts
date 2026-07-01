import type { DevicePreset } from '@platform/types/index'

// Generic small Android — represents budget/mid-range 5" class devices
const device: DevicePreset = {
  label: 'Compact',
  type: 'phone',
  platform: 'android',
  width: 360,
  height: 780,
  cornerRadius: 24,
  screenRadius: 20,
  hasNotch: false,
  hasChin: true,
  safeTop: 24,
  safeBottom: 16,
  safeLeft: 0,
  safeRight: 0,
  marginH: 16,
  minTapTarget: 48,
}

export default device
