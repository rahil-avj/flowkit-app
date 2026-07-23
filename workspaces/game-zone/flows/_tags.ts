import { tag as _tag } from '@flowkit-core/config'

// Annotation tags — ephemeral review markers shown as badges in the Screens panel.
// Use screenIds from pageMeta.id (same strings used in flowplan steps).
//
// _tag('label', { color, icon, note, expiresAt, pulse, screens, flows })
//
// Colors: 'blue' | 'green' | 'red' | 'amber' | 'purple'
// Icons:  'FlaskConical' | 'Star' | 'Zap' | 'Eye' | 'Sparkles' | 'CircleDot' | 'Flag' | 'Tag'

export default [
  // _tag('new', { color: 'green', icon: 'Star', screens: ['welcome-screen'] }),
  // _tag('beta', { color: 'amber', icon: 'FlaskConical', note: 'Not shown to clients yet', screens: [] }),
  // _tag('v2', { color: 'blue', expiresAt: '2026-12-01', screens: [] }),
]
