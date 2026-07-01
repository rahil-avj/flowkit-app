// Kit manifest — source of truth for CLI drift checks and documentation generation.
// Used by `flowkit kit:check` to verify every theme covers every component.

export const KIT_MANIFEST = {
  components: [
    'accordion',
    'alert-dialog',
    'avatar',
    'badge',
    'button',
    'card',
    'checkbox',
    'header',
    'input',
    'list-row',
    'modal',
    'navigation',
    'select',
    'switch',
  ],
  themes: ['apple', 'material', 'neo-brutalism'],
} as const

export type KitTheme = (typeof KIT_MANIFEST.themes)[number]
export type KitComponent = (typeof KIT_MANIFEST.components)[number]
