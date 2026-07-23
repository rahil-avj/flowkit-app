import { useFeedback } from '@flowkit-features/feedback/context/FeedbackContext'
import Checkbox from '@flowkit-shared/components/ui/Checkbox'
import Select from '@flowkit-shared/components/ui/Select'
import { useTheme } from '@flowkit-shared/contexts/ThemeContext'

import { useFeedbackTabContext } from '../context'

export default function FilterPanel() {
  const { filter, setFilter, allTags, hasActiveFilters } = useFeedbackTabContext()
  const { comments } = useFeedback()
  const { theme, scale } = useTheme()

  return (
    <div
      className="flex flex-col gap-3 border"
      style={{
        borderColor: theme.bg.border,
        backgroundColor: theme.bg.surface,
        borderRadius: scale.radius.lg,
        padding: scale.space.sm,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <Checkbox
          label="Auto filter for current screen"
          checked={filter.filterForCurrentScreen}
          onChange={e =>
            setFilter(prev => ({
              ...prev,
              filterForCurrentScreen: e.target.checked,
              pageId: e.target.checked ? prev.pageId : null,
            }))
          }
        />
        <span
          className="shrink-0 font-mono font-bold px-1.5 py-0.5 rounded"
          title="Toggle auto filter for current screen"
          style={{
            fontSize: scale.text.xxs,
            color: theme.text.muted,
            background: theme.bg.elevated,
            border: `1px solid ${theme.bg.border}`,
          }}
        >
          ⇧F
        </span>
      </div>
      {!filter.filterForCurrentScreen && (
        <Select
          value={filter.pageId || ''}
          onChange={e => setFilter(prev => ({ ...prev, pageId: e.target.value || null }))}
        >
          <option value="">All screens</option>
          {Array.from(new Set(comments.map(c => c.pageId))).map(pageId => {
            const label = comments.find(c => c.pageId === pageId)?.pageLabel || pageId
            return (
              <option key={pageId} value={pageId}>
                {label}
              </option>
            )
          })}
        </Select>
      )}
      <div className="flex flex-col gap-1.5">
        <span className="font-bold" style={{ fontSize: scale.text.xs, color: theme.text.muted }}>
          Tags
        </span>
        {allTags.size === 0 ? (
          <p className="italic" style={{ fontSize: scale.text.xs, color: theme.text.muted }}>
            No tags to filter by — add comments with tags first
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {Array.from(allTags).map(tag => (
              <button
                key={tag}
                onClick={() =>
                  setFilter(prev => {
                    const newTags = new Set(prev.tags)
                    if (newTags.has(tag)) newTags.delete(tag)
                    else newTags.add(tag)
                    return { ...prev, tags: newTags }
                  })
                }
                className="font-bold transition-all border"
                style={{
                  fontSize: scale.text.xxs,
                  padding: '4px 8px',
                  borderRadius: scale.radius.sm,
                  minHeight: scale.minTap,
                  backgroundColor: filter.tags.has(tag) ? theme.accent.greenDim : theme.bg.elevated,
                  borderColor: filter.tags.has(tag) ? theme.accent.green : theme.bg.border,
                  color: filter.tags.has(tag) ? theme.accent.green : theme.text.secondary,
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
      {hasActiveFilters && (
        <button
          onClick={() => setFilter(prev => ({ ...prev, pageId: null, tags: new Set() }))}
          className="font-bold transition-all border-none bg-transparent cursor-pointer"
          style={{ fontSize: scale.text.xs, color: theme.text.muted, minHeight: scale.minTap }}
          onMouseEnter={e => (e.currentTarget.style.color = theme.accent.red)}
          onMouseLeave={e => (e.currentTarget.style.color = theme.text.muted)}
        >
          Clear Filters
        </button>
      )}
    </div>
  )
}
