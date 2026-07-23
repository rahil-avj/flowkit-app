import { FEEDBACK_TAGS, FeedbackTag } from '@flowkit/types/index'
import { useFeedback } from '@flowkit-features/feedback/context/FeedbackContext'
import Button from '@flowkit-shared/components/ui/Button'
import Checkbox from '@flowkit-shared/components/ui/Checkbox'
import Chip from '@flowkit-shared/components/ui/Chip'
import Select from '@flowkit-shared/components/ui/Select'
import Textarea from '@flowkit-shared/components/ui/Textarea'
import { useNavigation } from '@flowkit-shared/contexts/DashboardContext'
import { useTheme } from '@flowkit-shared/contexts/ThemeContext'
import { X } from 'lucide-react'
import { useRef } from 'react'

import { useFeedbackTabContext } from '../context'

export default function AddCommentForm() {
  const {
    setViewMode,
    selectedPage,
    setSelectedPage,
    selectedPageLabel,
    setSelectedPageLabel,
    textInput,
    setTextInput,
    selectedTags,
    setSelectedTags,
    tagInput,
    setTagInput,
    includeScreenshot,
    setIncludeScreenshot,
    isCapturing,
    handleAddComment,
    views,
  } = useFeedbackTabContext()

  const { comments } = useFeedback()
  const { activeViewId } = useNavigation()
  const { theme, scale } = useTheme()

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const getTagSuggestions = (input: string): FeedbackTag[] => {
    const query = input.startsWith('#') ? input.slice(1).toLowerCase() : input.toLowerCase()
    return FEEDBACK_TAGS.filter(tag => tag.slice(1).toLowerCase().includes(query))
  }

  return (
    <div
      className="flex flex-col gap-3 h-full overflow-y-auto p-2"
      style={{ backgroundColor: theme.bg.base }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: theme.text.primary }}>
          Add Comment
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('wall')}
          icon={<X size={16} />}
        />
      </div>

      <Select
        label="Select Page"
        value={`${selectedPage}|${selectedPageLabel}`}
        onChange={e => {
          const parts = e.target.value.split('|')
          setSelectedPage(parts[0])
          setSelectedPageLabel(parts[1] || '')
        }}
      >
        <option value="|">Choose a page...</option>
        {Array.from(new Set(comments.map(c => c.pageId)))
          .concat(views.filter(v => !v.id.endsWith('-play')).map(v => v.id))
          .filter((id, idx, arr) => arr.indexOf(id) === idx)
          .map(id => {
            const label =
              comments.find(c => c.pageId === id)?.pageLabel ||
              views.find(v => v.id === id)?.label ||
              id
            return (
              <option key={id} value={`${id}|${label}`}>
                {label}
              </option>
            )
          })}
      </Select>

      <Textarea
        ref={textareaRef}
        label="Comment"
        value={textInput}
        onChange={e => setTextInput(e.target.value)}
        placeholder="Enter your feedback... (Type @name for callouts)"
        style={{ minHeight: 100 }}
      />

      {/* Screenshot attachment check */}
      {selectedPage === activeViewId.replace('-play', '') && (
        <div
          className="flex items-center justify-between p-2 rounded-lg border"
          style={{ borderColor: theme.bg.border, backgroundColor: theme.bg.surface }}
        >
          <div className="flex flex-col text-left">
            <span
              className="font-bold"
              style={{ fontSize: scale.text.sm, color: theme.text.primary }}
            >
              Attach screenshot
            </span>
            <span style={{ fontSize: scale.text.xxs, color: theme.text.muted }}>
              Capture the mockup screen layout
            </span>
          </div>
          {isCapturing ? (
            <span
              className="font-mono animate-pulse"
              style={{ fontSize: scale.text.xxs, color: theme.accent.green }}
            >
              Capturing...
            </span>
          ) : (
            <Checkbox
              checked={includeScreenshot}
              onChange={e => setIncludeScreenshot(e.target.checked)}
            />
          )}
        </div>
      )}

      <div>
        <span
          className="font-black uppercase tracking-widest"
          style={{ fontSize: scale.text.xxs, color: theme.text.muted }}
        >
          Tags (optional)
        </span>
        <div
          className="flex flex-wrap gap-1 mt-2 p-2.5 border rounded-lg min-h-10"
          style={{ backgroundColor: theme.bg.base, borderColor: theme.bg.border }}
        >
          {selectedTags.map(tag => (
            <Chip key={tag} onRemove={() => setSelectedTags(prev => prev.filter(t => t !== tag))}>
              {tag}
            </Chip>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            placeholder="Type #tag..."
            onKeyDown={e => {
              if (e.key === 'Enter' && tagInput.startsWith('#')) {
                const tag = tagInput.slice(1).trim()
                if (tag && !selectedTags.includes(tag as FeedbackTag)) {
                  setSelectedTags(prev => [...prev, tag as FeedbackTag])
                  setTagInput('')
                }
              }
            }}
            className="flex-1 min-w-20 bg-transparent text-xs outline-none border-none"
            style={{ color: theme.text.primary }}
          />
        </div>
        {tagInput.startsWith('#') && (
          <div
            className="mt-1 flex flex-wrap gap-1"
            style={{ fontSize: scale.text.xxs, color: theme.text.muted }}
          >
            {getTagSuggestions(tagInput).length > 0 ? (
              <>
                <span>Suggestions:</span>
                {getTagSuggestions(tagInput).map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (!selectedTags.includes(tag)) {
                        setSelectedTags(prev => [...prev, tag])
                      }
                      setTagInput('')
                    }}
                    className="border-none bg-transparent cursor-pointer font-mono hover:underline"
                    style={{ color: theme.accent.green }}
                  >
                    {tag}
                  </button>
                ))}
              </>
            ) : (
              <span>
                Custom tag:{' '}
                <span className="font-mono font-bold" style={{ color: theme.accent.green }}>
                  {tagInput}
                </span>{' '}
                — Press Enter to add
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setViewMode('wall')} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button
          onClick={handleAddComment}
          disabled={!textInput.trim() || !selectedPage || isCapturing}
          variant="primary"
          style={{ flex: 1, backgroundColor: theme.accent.green, borderColor: theme.accent.green }}
        >
          {isCapturing ? 'Capturing...' : 'Add Comment'}
        </Button>
      </div>
    </div>
  )
}
