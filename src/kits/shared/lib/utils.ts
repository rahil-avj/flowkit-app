import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// text-ui-* are custom font-size utilities (text-ui-2xs, text-ui-xs, text-ui-sm, etc.)
// twMerge doesn't know about them, so without this they conflict with text-theme-* color
// classes — both match the text-* pattern and twMerge drops one.
// Registering them under 'font-size' keeps size and color in separate conflict groups.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [(v: string) => /^ui-/.test(v)] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
