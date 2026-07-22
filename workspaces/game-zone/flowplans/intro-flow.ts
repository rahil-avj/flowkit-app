import { defineFlow } from '@flowkit-core/config'

export default defineFlow({
  id: 'intro-flow',
  name: 'Intro Flow',
  description: 'Splash into welcome into the game hub.',
  homeScreen: 'hub-screen',

  steps: [
    { screenId: 'splash-screen', actionNote: 'Splash auto-advances' },
    { screenId: 'welcome-screen', on: 'play', actionNote: 'Taps Play' },
    { screenId: 'hub-screen', actionNote: 'Arrives at the game hub' },
  ],
})
