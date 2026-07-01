import type { DevicePreset } from '@platform/types/index'

// 1080p monitor — most common desktop resolution
const device: DevicePreset = {
  label: 'Full HD 1080p',
  type: 'desktop',
  platform: 'windows',
  width: 1920,
  height: 1080,
  cornerRadius: 0,
  screenRadius: 0,
  hasNotch: false,
  supportsLandscape: false,
  safeTop: 0,
  safeBottom: 0,
  safeLeft: 0,
  safeRight: 0,
  marginH: 64,
  minTapTarget: 32,
}

export default device
