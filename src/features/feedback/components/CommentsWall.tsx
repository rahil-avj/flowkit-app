import { useFeedback } from '@platform/features/feedback/context/FeedbackContext'
import Button from '@platform/shared/components/ui/Button'
import EmptyState from '@platform/shared/components/ui/EmptyState'
import { useNavigation } from '@platform/shared/contexts/DashboardContext'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
import { FileSearch, ListFilter, Monitor } from 'lucide-react'

import { useFeedbackTabContext } from '../context'
import CommentCard from './CommentCard'
import CommentGroup from './CommentGroup'

export default function CommentsWall() {
  const { filteredGroupedComments, filter, setFilter, setViewMode, views } = useFeedbackTabContext()
  const { comments, deleteComment } = useFeedback()
  const { navigateTo, activeViewId } = useNavigation()
  const { theme } = useTheme()

  if (Object.keys(filteredGroupedComments).length === 0) {
    // Case 1 — no comments anywhere at all
    if (comments.length === 0) {
      return (
        <EmptyState
          className="max-h-fit"
          variant="panel"
          icon={<Monitor size={36} strokeWidth={1.5} />}
          title="No feedback yet"
          subtitle="Be the first to leave a note on this design. Your thoughts help make it better."
          cta={
            <Button size="sm" variant="primary" onClick={() => setViewMode('add-comment')}>
              Add first comment
            </Button>
          }
        />
      )
    }

    // Case 2 — auto-filter for current screen is on, but this screen has no comments
    if (filter.filterForCurrentScreen) {
      return (
        <EmptyState
          variant="panel"
          icon={<FileSearch size={36} strokeWidth={1.5} />}
          title="This screen hasn't been reviewed yet"
          subtitle="No one has left feedback on this screen yet. Be the first to share your thoughts."
          cta={
            <div className="flex flex-col items-center gap-2">
              <Button size="sm" variant="primary" onClick={() => setViewMode('add-comment')}>
                Add comment
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFilter(prev => ({ ...prev, filterForCurrentScreen: false }))}
              >
                See feedback from all screens
              </Button>
            </div>
          }
        />
      )
    }

    // Case 3 — manual screen or tag filter active, no matches
    return (
      <EmptyState
        variant="panel"
        icon={<ListFilter size={36} strokeWidth={1.5} />}
        title="No comments match these filters"
        subtitle="Try widening your search — clear the active screen or tag filters to see all feedback."
        cta={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFilter(prev => ({ ...prev, screenId: null, tags: new Set() }))}
            style={{ color: theme.accent.red }}
          >
            Clear filters
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col">
      {Object.entries(filteredGroupedComments).map(([screenId, screenComments], index) => {
        const screenExists = views.some(v => v.id === screenId)
        const isCurrentScreen = screenId === activeViewId.replace('-play', '')
        return (
          <CommentGroup
            key={screenId}
            screenId={screenId}
            screenLabel={screenComments[0].screenLabel}
            screenExists={screenExists}
            isCurrentScreen={isCurrentScreen}
            isFirst={index === 0}
            onNavigate={navigateTo}
          >
            {screenComments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                screenExists={screenExists}
                onDelete={deleteComment}
              />
            ))}
          </CommentGroup>
        )
      })}
    </div>
  )
}
