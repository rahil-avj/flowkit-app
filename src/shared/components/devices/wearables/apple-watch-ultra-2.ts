import type { DevicePreset } from '@flowkit/types/index'

const device: DevicePreset = {
  label: 'Apple Watch Ultra 2',
  type: 'wearable',
  platform: 'watchos',
  variant: 'ultra',
  width: 205,
  height: 251,
  cornerRadius: 36,
  screenRadius: 32,
  hasNotch: false,
  supportsLandscape: false,
  safeTop: 0,
  safeBottom: 0,
  safeLeft: 0,
  safeRight: 0,
  marginH: 8,
  minTapTarget: 44,
}

export default device
