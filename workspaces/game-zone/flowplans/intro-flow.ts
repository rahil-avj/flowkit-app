import { defineFlow } from '@flowkit-core/config'

export default defineFlow({
  id: 'intro-flow',
  name: 'Intro Flow',
  description: 'Splash into welcome into the game hub.',
  homeScreen: 'hub-screen',

  steps: [
    { pageId: 'splash-screen', actionNote: 'Splash auto-advances' },
    { pageId: 'welcome-screen', on: 'play', actionNote: 'Taps Play' },
    { pageId: 'hub-screen', actionNote: 'Arrives at the game hub' },
  ],
})
