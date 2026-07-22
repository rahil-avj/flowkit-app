import { defineFlow } from '@flowkit-core/config'

export default defineFlow({
  id: 'onboarding-flow',
  name: 'Onboarding Flow',
  description: 'Guides the user through welcome, profile setup, and into the app.',

  steps: [
    { screenId: 'welcome-screen', on: 'get-started', actionNote: 'Taps Get Started' },
    { screenId: 'setup-screen', on: 'continue', actionNote: 'Confirms profile and continues' },
    { screenId: 'ready-screen', on: 'go-to-home', actionNote: 'Proceeds to home' },
  ],
})
