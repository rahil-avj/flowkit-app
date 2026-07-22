import { defineFlow } from '@flowkit-core/config'

export default defineFlow({
  id: 'home-flow',
  name: 'Home Flow',
  description: 'Browse the item list and view a detail page.',
  // Screen the device home button targets while this flowplan is playing.
  // Overrides the workspace's startScreen for the duration of playback.
  homeScreen: 'home-screen',

  steps: [
    { screenId: 'home-screen', on: 'item-1', actionNote: 'Taps the first item' },
    { screenId: 'detail-screen', on: 'back', actionNote: 'Goes back to list' },
  ],
})
