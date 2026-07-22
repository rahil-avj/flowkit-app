import { defineConfig } from '@flowkit-core/config'

export default defineConfig({
  workspace: { name: 'game-zone' },
  // Screen loaded by default (cold load, device home button, reset-to-first)
  // when no flowplan is active. Falls back to the first declared screen when unset.
  startScreen: 'welcome-screen',
  // Default device shell shown on load. Must match a DevicePreset.label from
  // src/shared/components/devices (e.g. "iPhone 16 Pro"). Falls back to the
  // platform default when unset or unrecognized.
  defaultDevice: 'Compact',
  // Default orientation on load. Ignored if the device doesn't support landscape.
  defaultOrientation: 'portrait',
  flows: ['onboarding-flow', 'home-flow'],
  screenOrder: {
    'onboarding-flow': ['welcome-screen', 'setup-screen', 'ready-screen'],
    'home-flow': ['home-screen', 'detail-screen'],
  },
})
