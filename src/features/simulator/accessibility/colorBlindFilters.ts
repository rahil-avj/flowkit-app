import type { ColorBlindMode } from '@platform/types/index'

export const COLOR_BLIND_FILTERS: Record<ColorBlindMode, string> = {
  none: '',
  deuteranopia: 'url(#cb-deuteranopia)',
  protanopia: 'url(#cb-protanopia)',
  tritanopia: 'url(#cb-tritanopia)',
  deuteranomaly: 'url(#cb-deuteranomaly)',
  protanomaly: 'url(#cb-protanomaly)',
  tritanomaly: 'url(#cb-tritanomaly)',
  achromatopsia: 'url(#cb-achromatopsia)',
}
