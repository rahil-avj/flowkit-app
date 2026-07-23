import { useFeedback } from '@flowkit-features/feedback/context/FeedbackContext'
import Button from '@flowkit-shared/components/ui/Button'
import EmptyState from '@flowkit-shared/components/ui/EmptyState'
import { useNavigation } from '@flowkit-shared/contexts/DashboardContext'
import { useTheme } from '@flowkit-shared/contexts/ThemeContext'
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

    // Case 2 — auto-filter for current page is on, but this page has no comments
    if (filter.filterForCurrentPage) {
      return (
        <EmptyState
          variant="panel"
          icon={<FileSearch size={36} strokeWidth={1.5} />}
          title="This page hasn't been reviewed yet"
          subtitle="No one has left feedback on this page yet. Be the first to share your thoughts."
          cta={
            <div className="flex flex-col items-center gap-2">
              <Button size="sm" variant="primary" onClick={() => setViewMode('add-comment')}>
                Add comment
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFilter(prev => ({ ...prev, filterForCurrentPage: false }))}
              >
                See feedback from all pages
              </Button>
            </div>
          }
        />
      )
    }

    // Case 3 — manual page or tag filter active, no matches
    return (
      <EmptyState
        variant="panel"
        icon={<ListFilter size={36} strokeWidth={1.5} />}
        title="No comments match these filters"
        subtitle="Try widening your search — clear the active page or tag filters to see all feedback."
        cta={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFilter(prev => ({ ...prev, pageId: null, tags: new Set() }))}
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
      {Object.entries(filteredGroupedComments).map(([pageId, pageComments], index) => {
        const pageExists = views.some(v => v.id === pageId)
        const isCurrentPage = pageId === activeViewId.replace('-play', '')
        return (
          <CommentGroup
            key={pageId}
            pageId={pageId}
            pageLabel={pageComments[0].pageLabel}
            pageExists={pageExists}
            isCurrentPage={isCurrentPage}
            isFirst={index === 0}
            onNavigate={navigateTo}
          >
            {pageComments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                pageExists={pageExists}
                onDelete={deleteComment}
              />
            ))}
          </CommentGroup>
        )
      })}
    </div>
  )
}
