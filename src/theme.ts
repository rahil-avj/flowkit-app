export interface UIScale {
  readonly text: {
    readonly xxs: string // timestamps, metadata, badges        — 11px
    readonly xs: string // secondary labels, captions          — 12px
    readonly sm: string // primary body, buttons, inputs       — 13px
    readonly md: string // section headers, tab labels         — 14px
    readonly lg: string // panel titles, card headings         — 15px
    readonly xl: string // modal titles, page headings         — 17px
  }
  readonly space: {
    readonly px: string // tight internal padding
    readonly sm: string // card padding
    readonly md: string // group / section padding
  }
  readonly radius: {
    readonly sm: string // chips, badges
    readonly md: string // cards
    readonly lg: string // groups, panels
  }
  readonly minTap: string // minimum touch target height
}

// All values mirror the --text-ui-* CSS variables in index.css.
// Change sizes in ONE place (index.css @theme) and update the px values here to match.
export const uiScale: UIScale = {
  text: {
    xxs: 'var(--text-ui-2xs)', // 11px
    xs: 'var(--text-ui-xs)', // 12px
    sm: 'var(--text-ui-sm)', // 13px
    md: 'var(--text-ui-md)', // 14px
    lg: 'var(--text-ui-lg)', // 15px
    xl: 'var(--text-ui-xl)', // 17px
  },
  space: {
    px: '6px',
    sm: '10px',
    md: '14px',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '12px',
  },
  minTap: '28px',
}

export interface Theme {
  readonly bg: {
    readonly base: string
    readonly surface: string
    readonly elevated: string
    readonly hover: string
    readonly border: string
    readonly borderSubtle: string
  }
  readonly text: {
    readonly primary: string
    readonly secondary: string
    readonly muted: string
    readonly disabled: string
  }
  readonly accent: {
    readonly blue: string
    readonly blueDim: string
    readonly green: string
    readonly greenDim: string
    readonly red: string
    readonly redDim: string
    readonly amber: string
    readonly amberDim: string
    readonly purple: string
    readonly purpleDim: string
  }
  readonly shadow: {
    readonly card: string
    readonly float: string
  }
}

export const dark: Theme = {
  bg: {
    base: '#09090b',
    surface: '#111113',
    elevated: '#18191e',
    hover: '#1e1f25',
    border: '#24252a',
    borderSubtle: 'rgba(255,255,255,0.07)',
  },
  text: {
    primary: '#f4f4f5',
    secondary: '#b4b9c9',
    muted: '#6d758f',
    disabled: 'rgba(255,255,255,0.25)',
  },
  accent: {
    blue: '#3b82f6',
    blueDim: 'rgba(59,130,246,0.15)',
    green: '#22c55e',
    greenDim: 'rgba(34,197,94,0.12)',
    red: '#ef4444',
    redDim: 'rgba(239,68,68,0.12)',
    amber: '#f59e0b',
    amberDim: 'rgba(245,158,11,0.12)',
    purple: '#a855f7',
    purpleDim: 'rgba(168,85,247,0.12)',
  },
  shadow: {
    card: '0 2px 8px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.12)',
    float: '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18)',
  },
}

export const light: Theme = {
  bg: {
    base: '#f4f5f6',
    surface: '#ffffff',
    elevated: '#eef0f3',
    hover: '#e2e5ea',
    border: '#dcdfe5',
    borderSubtle: 'rgba(0,0,0,0.05)',
  },
  text: {
    primary: '#18181b',
    secondary: '#4f566b',
    muted: '#7c8ba1',
    disabled: 'rgba(0,0,0,0.25)',
  },
  accent: {
    blue: '#2563eb',
    blueDim: 'rgba(37,99,235,0.1)',
    green: '#16a34a',
    greenDim: 'rgba(22,163,74,0.08)',
    red: '#dc2626',
    redDim: 'rgba(220,38,38,0.08)',
    amber: '#d97706',
    amberDim: 'rgba(217,119,6,0.08)',
    purple: '#9333ea',
    purpleDim: 'rgba(147,51,234,0.08)',
  },
  shadow: {
    card: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    float: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
  },
}
