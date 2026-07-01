import type { DevicePreset } from '@platform/types/index'

import fullHD from './desktops/full-hd'
import macBookPro14 from './desktops/macbook-pro-14'
import compact from './phones/compact'
import iPhone16 from './phones/iphone-16'
import iPhone16Pro from './phones/iphone-16-pro'
import pixel9 from './phones/pixel-9'
import iPadMini from './tablets/ipad-mini'
import iPadPro13 from './tablets/ipad-pro-13'
import appleWatchSeries10 from './wearables/apple-watch-series-10'
import appleWatchUltra2 from './wearables/apple-watch-ultra-2'

export const DEVICE_PRESETS: DevicePreset[] = [
  compact,
  iPhone16Pro,
  iPhone16,
  pixel9,
  iPadMini,
  iPadPro13,
  macBookPro14,
  fullHD,
  appleWatchUltra2,
  appleWatchSeries10,
]
