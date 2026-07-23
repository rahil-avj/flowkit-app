import { defineConfig } from '@flowkit-core/config'

export default defineConfig({
  workspace: { name: 'test' },
  // Page loaded by default (cold load, device home button, reset-to-first)
  // when no flowStory is active. Falls back to the first declared page when unset.
  startPage: 'welcome-screen',
  // Default device shell shown on load. Must match a DevicePreset.label from
  // src/shared/components/devices (e.g. "iPhone 16 Pro"). Falls back to the
  // platform default when unset or unrecognized.
  defaultDevice: 'Compact',
  // Default orientation on load. Ignored if the device doesn't support landscape.
  defaultOrientation: 'portrait',
  chapters: ['onboarding-flow', 'home-flow'],
  pageOrder: {
    'onboarding-flow': ['welcome-screen', 'setup-screen', 'ready-screen'],
    'home-flow': ['home-screen', 'detail-screen'],
  },
})
