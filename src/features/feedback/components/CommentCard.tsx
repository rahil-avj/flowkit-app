import { useFeedback } from '@platform/features/feedback/context/FeedbackContext'
import Badge from '@platform/shared/components/ui/Badge'
import IconButton from '@platform/shared/components/ui/IconButton'
import Textarea from '@platform/shared/components/ui/Textarea'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
import { FEEDBACK_TAGS, FeedbackComment, FeedbackTag } from '@platform/types/index'
import { Check, ChevronDown, ChevronUp, Lock, Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'

import AuthorAvatar from './AuthorAvatar'

function formatCommentTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (isToday) return 'today'

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  if (isYesterday) return 'yesterday'

  const isThisYear = date.getFullYear() === now.getFullYear()
  if (isThisYear) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface CommentCardProps {
  comment: FeedbackComment
  screenExists: boolean
  onDelete: (id: string) => void
}

const TAG_COLORS: Record<string, 'red' | 'amber' | 'blue' | 'green' | 'purple'> = {
  '#minor-issue': 'amber',
  '#major-issue': 'red',
  '#question': 'blue',
  '#suggestion': 'purple',
  '#approved': 'green',
  '#needs-revision': 'red',
}

export default function CommentCard({ comment, screenExists, onDelete }: CommentCardProps) {
  const { theme, scale } = useTheme()
  const { editComment } = useFeedback()

  const [hovered, setHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.text)
  const [editTags, setEditTags] = useState<FeedbackTag[]>(comment.tags)
  const [expanded, setExpanded] = useState(false)

  const canEdit = !comment.isImported

  // Needs truncation if there are more than 3 lines or the text is long
  const lines = comment.text.split('\n')
  const isTall = lines.length > 3 || comment.text.length > 200

  function handleSave() {
    if (!editText.trim()) return
    editComment(comment.id, editText.trim(), editTags)
    setIsEditing(false)
  }

  function handleCancel() {
    setEditText(comment.text)
    setEditTags(comment.tags)
    setIsEditing(false)
  }

  function toggleTag(tag: FeedbackTag) {
    setEditTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]))
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        backgroundColor: isEditing ? theme.bg.elevated : theme.bg.base,
        border: `1px solid ${isEditing ? theme.accent.blue + '55' : theme.bg.border}`,
        borderRadius: scale.radius.md,
        padding: scale.space.sm,
        opacity: screenExists ? 1 : 0.55,
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      {/* Floating action toolbar */}
      {hovered && !isEditing && (
        <div
          style={{
            position: 'absolute',
            top: -14,
            right: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: theme.bg.surface,
            border: `1px solid ${theme.bg.border}`,
            borderRadius: 8,
            padding: '3px 4px',
            boxShadow: theme.shadow.float,
            zIndex: 10,
          }}
        >
          {canEdit ? (
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              icon={<Pencil size={12} />}
              style={{ color: theme.text.muted, width: 26, height: 26 }}
              onMouseEnter={e => (e.currentTarget.style.color = theme.accent.blue)}
              onMouseLeave={e => (e.currentTarget.style.color = theme.text.muted)}
            />
          ) : (
            <span
              title="Imported — cannot edit"
              style={{
                color: theme.text.disabled,
                display: 'flex',
                alignItems: 'center',
                width: 26,
                height: 26,
                justifyContent: 'center',
              }}
            >
              <Lock size={11} />
            </span>
          )}
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => onDelete(comment.id)}
            icon={<Trash2 size={12} />}
            style={{ color: theme.text.muted, width: 26, height: 26 }}
            onMouseEnter={e => (e.currentTarget.style.color = theme.accent.red)}
            onMouseLeave={e => (e.currentTarget.style.color = theme.text.muted)}
          />
        </div>
      )}
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            {FEEDBACK_TAGS.map(tag => {
              const active = editTags.includes(tag)
              const color = TAG_COLORS[tag]
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="font-bold tracking-tight transition-all"
                  style={{
                    fontSize: scale.text.xxs,
                    padding: '3px 8px',
                    borderRadius: scale.radius.sm,
                    background: active && color ? theme.accent[color] + '25' : theme.bg.surface,
                    color: active && color ? theme.accent[color] : theme.text.muted,
                    border: `1px solid ${active && color ? theme.accent[color] + '55' : theme.bg.border}`,
                    minHeight: scale.minTap,
                  }}
                >
                  {tag}
                </button>
              )
            })}
          </div>

          <Textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            autoFocus
            rows={3}
            className="resize-none text-ui-xs"
          />

          <div className="flex justify-end gap-1.5">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 font-bold transition-colors"
              style={{
                fontSize: scale.text.xs,
                padding: '5px 10px',
                borderRadius: scale.radius.sm,
                minHeight: scale.minTap,
                color: theme.text.muted,
                background: theme.bg.surface,
                border: `1px solid ${theme.bg.border}`,
              }}
            >
              <X size={10} /> Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 font-bold transition-colors"
              style={{
                fontSize: scale.text.xs,
                padding: '5px 10px',
                borderRadius: scale.radius.sm,
                minHeight: scale.minTap,
                color: theme.accent.green,
                background: theme.accent.green + '18',
                border: `1px solid ${theme.accent.green + '33'}`,
              }}
            >
              <Check size={10} /> Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Author + timestamp — top */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {comment.authorName && <AuthorAvatar name={comment.authorName} size={16} />}
              <span
                className="truncate font-semibold"
                style={{ fontSize: scale.text.xxs, color: theme.text.secondary }}
              >
                {comment.authorName || 'Anonymous'}
              </span>
              {comment.isImported && (
                <span
                  className="font-semibold flex items-center gap-0.5 shrink-0"
                  style={{ fontSize: scale.text.xxs, color: theme.text.disabled }}
                >
                  <Lock size={8} /> imported
                </span>
              )}
            </div>
            <span
              className="font-mono shrink-0"
              title={new Date(comment.timestamp).toLocaleString()}
              style={{ fontSize: scale.text.xxs, color: theme.text.disabled, cursor: 'default' }}
            >
              {formatCommentTime(comment.timestamp)}
            </span>
          </div>

          {/* Comment body — preserves line breaks, truncates at 3 lines */}
          <div>
            <p
              className="leading-relaxed whitespace-pre-wrap"
              style={{
                fontSize: scale.text.xs,
                color: theme.text.secondary,
                ...(isTall && !expanded
                  ? {
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }
                  : {}),
              }}
            >
              {comment.text}
            </p>
            {isTall && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-0.5 font-semibold mt-0.5"
                style={{ fontSize: scale.text.xxs, color: theme.text.muted }}
              >
                {expanded ? (
                  <>
                    <ChevronUp size={10} /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown size={10} /> Show more
                  </>
                )}
              </button>
            )}
          </div>

          {/* Tags */}
          {comment.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {comment.tags.map(tag => (
                <Badge key={tag} color={screenExists ? (TAG_COLORS[tag] ?? 'blue') : 'amber'}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
