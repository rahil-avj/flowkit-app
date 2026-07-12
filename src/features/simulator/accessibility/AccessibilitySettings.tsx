import type { ColorBlindMode } from '@flowkit/types/index'
import SegmentedBarChart from '@flowkit-shared/components/ui/SegmentedBarChart'
import Select from '@flowkit-shared/components/ui/Select'
import { useSimulator } from '@flowkit-shared/contexts/DashboardContext'
import { useTheme } from '@flowkit-shared/contexts/ThemeContext'
import { Eye } from 'lucide-react'

// ─── CVD data ─────────────────────────────────────────────────────────────────

interface CVDInfo {
  cause: string
  looksLike: string
  prevalence: string
  source: string
}

const CVD_DETAILS: Record<Exclude<ColorBlindMode, 'none'>, CVDInfo> = {
  deuteranopia: {
    cause: 'Complete absence of green-sensitive (M) cones.',
    looksLike:
      'Greens look beige or grey, and red appears brownish-yellow. Hard to distinguish red, green, and orange.',
    prevalence: '~1.2% of males, ~0.01% of females.',
    source: 'National Eye Institute (NEI) & University of Utah Webvision',
  },
  protanopia: {
    cause: 'Complete absence of red-sensitive (L) cones.',
    looksLike:
      'Reds appear dark or black. Red, orange, yellow, and green all shift toward a similar yellow-ish green.',
    prevalence: '~1.0% of males, ~0.01% of females.',
    source: 'National Eye Institute (NEI) & University of Utah Webvision',
  },
  tritanopia: {
    cause: 'Complete absence of blue-sensitive (S) cones.',
    looksLike: 'Blues look green, and yellows look pink or light grey. Orange appears red.',
    prevalence: '~0.008% of the global population (affects males and females equally).',
    source: 'National Eye Institute (NEI) & Colour Blind Awareness',
  },
  deuteranomaly: {
    cause: 'Mutated green-sensitive (M) cones with shifted wavelength sensitivity.',
    looksLike:
      'Yellows and greens look slightly more red/yellow. Differentiating close green and red hues is harder.',
    prevalence: 'Most common type of CVD: ~5.0% to 6.0% of males, ~0.35% to 0.4% of females.',
    source: 'National Eye Institute (NEI) & University of Utah Webvision',
  },
  protanomaly: {
    cause: 'Mutated red-sensitive (L) cones with shifted wavelength sensitivity.',
    looksLike: 'Reds, oranges, and yellows appear duller, darker, and shift visually toward green.',
    prevalence: '~1.0% of males, ~0.01% of females.',
    source: 'National Eye Institute (NEI) & University of Utah Webvision',
  },
  tritanomaly: {
    cause: 'Mutated blue-sensitive (S) cones with shifted wavelength sensitivity.',
    looksLike: 'Differentiating blues from greens, and yellows from violets, is slightly harder.',
    prevalence:
      'Extremely rare (<0.01% of the global population; affects males and females equally).',
    source: 'National Eye Institute (NEI) & Colour Blind Awareness',
  },
  achromatopsia: {
    cause: 'Non-functional cones or missing cone pathways (relying solely on rod cells).',
    looksLike:
      'Complete color blindness. The world is seen entirely in shades of black, white, and grey.',
    prevalence: 'Extremely rare: ~1 in 33,000 individuals.',
    source: 'National Eye Institute (NEI) & Colour Blind Awareness',
  },
}

// ─── Acuity data ──────────────────────────────────────────────────────────────

interface AcuityInfo {
  index: number
  label: string
  acuity: string
  stat: string
  description: string
  source: string
}

function getAcuityCategory(blur: number): AcuityInfo {
  if (blur === 0)
    return {
      index: 0,
      label: 'Normal Vision',
      acuity: '20/20 or better',
      stat: '~72.5% of global population',
      description: 'Standard visual acuity under normal or fully corrected conditions.',
      source: 'World Health Organization (WHO) & IAPB Vision Atlas',
    }
  if (blur <= 1.5)
    return {
      index: 1,
      label: 'Mild Vision Impairment',
      acuity: '20/30 to 20/50 (6/12 - 6/18)',
      stat: '~10.3% of global population (826M+)',
      description: 'Slight distance or near-vision blur (e.g. presbyopia, mild refractive errors).',
      source: 'World Health Organization (WHO) & IAPB Vision Atlas',
    }
  if (blur <= 4.5)
    return {
      index: 2,
      label: 'Moderate to Severe Impairment (MSVI)',
      acuity: '20/60 to 20/200 (6/18 - 6/60)',
      stat: '~13.7% of global population (1.1B+)',
      description:
        'Significant distance blur, often caused by cataracts, glaucoma, or unaddressed refractive errors.',
      source: 'World Health Organization (WHO) & IAPB Vision Atlas',
    }
  return {
    index: 3,
    label: 'Profound Impairment / Blindness',
    acuity: 'Worse than 20/200 (worse than 6/60)',
    stat: '~3.5% of global population (280M+)',
    description:
      'Threshold of legal blindness or profound visual loss. Needs high contrast designs and larger hit targets.',
    source: 'World Health Organization (WHO) & IAPB Vision Atlas',
  }
}

const CB_OPTIONS: { value: ColorBlindMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'deuteranopia', label: 'Deuteranopia' },
  { value: 'protanopia', label: 'Protanopia' },
  { value: 'tritanopia', label: 'Tritanopia' },
  { value: 'deuteranomaly', label: 'Deuteranomaly' },
  { value: 'protanomaly', label: 'Protanomaly' },
  { value: 'tritanomaly', label: 'Tritanomaly' },
  { value: 'achromatopsia', label: 'Achromatopsia' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function AccessibilitySettings() {
  const { theme, scale } = useTheme()
  const { colorBlindMode, setColorBlindMode, blurryVision, setBlurryVision } = useSimulator()

  const acuityCategory = getAcuityCategory(blurryVision)
  const activeBlurKey = ['normal', 'mild', 'msvi', 'blind'][acuityCategory.index] || 'normal'

  function infoEntry(label: string, content: string) {
    return (
      <div>
        <span
          className="font-extrabold block uppercase tracking-wider mb-0.5"
          style={{ fontSize: scale.text.xxs, color: theme.text.primary }}
        >
          {label}
        </span>
        <span style={{ fontSize: scale.text.sm, color: theme.text.muted }}>{content}</span>
      </div>
    )
  }

  return (
<>
      {/* Color vision */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 px-1">
          <Eye size={10} style={{ color: theme.text.muted }} />
          <span
            className="font-black tracking-widest"
            style={{ fontSize: scale.text.xxs, color: theme.text.muted }}
          >
            Color Vision
          </span>
        </div>
        <Select
          value={colorBlindMode}
          onChange={e => setColorBlindMode(e.target.value as ColorBlindMode)}
          style={{
            backgroundColor: theme.bg.elevated,
            border: `1px solid ${theme.bg.border}`,
            color: theme.text.primary,
            fontSize: '11px',
            height: '30px',
          }}
        >
          {CB_OPTIONS.map(({ value, label }) => (
            <option
              key={value}
              value={value}
              style={{ backgroundColor: theme.bg.elevated, color: theme.text.primary }}
            >
              {label}
            </option>
          ))}
        </Select>

        {colorBlindMode !== 'none' && (
          <div
            className="mt-1 p-2.5 rounded-lg leading-relaxed flex flex-col gap-2 transition-all border"
            style={{
              fontSize: scale.text.xs,
              backgroundColor: theme.bg.elevated,
              borderColor: theme.bg.border,
              color: theme.text.secondary,
            }}
          >
            {infoEntry('Cause', CVD_DETAILS[colorBlindMode].cause)}
            {infoEntry('Prevalence', CVD_DETAILS[colorBlindMode].prevalence)}
            {infoEntry('What it is like', CVD_DETAILS[colorBlindMode].looksLike)}
            <div
              className="border-t pt-1.5 mt-0.5 flex items-center"
              style={{
                fontSize: scale.text.xxs,
                color: '#64748b',
                borderColor: `${theme.bg.border}80`,
              }}
            >
              <span className="shrink-0">Source:</span>
              <span
                className="font-semibold truncate min-w-0 flex-1 px-2"
                title={CVD_DETAILS[colorBlindMode].source}
              >
                {CVD_DETAILS[colorBlindMode].source}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Vision Blur */}
      <div className="flex flex-col gap-1.5 mt-1">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-1.5">
            <Eye size={10} style={{ color: theme.text.muted }} />
            <span
              className="font-black tracking-widest"
              style={{ fontSize: scale.text.xxs, color: theme.text.muted }}
            >
              Vision Blur
            </span>
          </div>
          <span
            className="font-bold"
            style={{
              fontSize: scale.text.xs,
              color: blurryVision > 0 ? theme.accent.purple : theme.text.muted,
            }}
          >
            {blurryVision > 0 ? `${blurryVision}px` : 'None'}
          </span>
        </div>

        <div
          className="flex items-center gap-2 p-2 rounded-lg"
          style={{ backgroundColor: theme.bg.elevated, border: `1px solid ${theme.bg.border}` }}
        >
          <input
            type="range"
            min="0"
            max="8"
            step="0.5"
            value={blurryVision}
            onChange={e => setBlurryVision(parseFloat(e.target.value))}
            className="flex-1 cursor-pointer accent-purple-500"
            style={{ height: 4, borderRadius: 2, outline: 'none' }}
          />
          {blurryVision > 0 && (
            <button
              onClick={() => setBlurryVision(0)}
              className="p-1 rounded font-bold hover:bg-slate-700/20"
              style={{ fontSize: scale.text.xxs, color: theme.accent.red }}
              title="Reset blur"
            >
              Reset
            </button>
          )}
        </div>

        <SegmentedBarChart
          title="Acuity Distribution (WHO)"
          activeLabel={acuityCategory.label}
          activeKey={activeBlurKey}
          segments={[
            {
              key: 'normal',
              value: 72.5,
              color: theme.accent.green,
              label: 'Normal Vision',
              legendLabel: 'Normal: 72.5%',
            },
            {
              key: 'mild',
              value: 10.3,
              color: theme.accent.amber,
              label: 'Mild Impairment',
              legendLabel: 'Mild: 10.3%',
            },
            {
              key: 'msvi',
              value: 13.7,
              color: '#f97316',
              label: 'Moderate/Severe',
              legendLabel: 'MSVI: 13.7%',
            },
            {
              key: 'blind',
              value: 3.5,
              color: theme.accent.red,
              label: 'Profound/Blindness',
              legendLabel: 'Blind: 3.5%',
            },
          ]}
        />

        <div
          className="mt-1 p-2.5 rounded-lg leading-relaxed flex flex-col gap-2 transition-all border"
          style={{
            fontSize: scale.text.xs,
            backgroundColor: theme.bg.elevated,
            borderColor: theme.bg.border,
            color: theme.text.secondary,
          }}
        >
          {infoEntry('Equivalent Acuity', acuityCategory.acuity)}
          {infoEntry('Global Impact', acuityCategory.stat)}
          {infoEntry('Description', acuityCategory.description)}
          <div
            className="border-t pt-1.5 mt-0.5 flex items-center"
            style={{
              fontSize: scale.text.xxs,
              color: '#64748b',
              borderColor: `${theme.bg.border}80`,
            }}
          >
            <span className="shrink-0">Source:</span>
            <span
              className="font-semibold truncate min-w-0 flex-1 px-2"
              title={acuityCategory.source}
            >
              {acuityCategory.source}
            </span>
          </div>
        </div>
      </div>
</>
  )
}
