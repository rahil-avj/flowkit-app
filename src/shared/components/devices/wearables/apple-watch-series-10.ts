import type { DevicePreset } from '@flowkit/types/index'

const device: DevicePreset = {
  label: 'Apple Watch Series 10',
  type: 'wearable',
  platform: 'watchos',
  width: 187,
  height: 223,
  cornerRadius: 32,
  screenRadius: 28,
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
