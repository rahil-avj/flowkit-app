import { useFeedback } from '@platform/features/feedback/context/FeedbackContext'
import ExportModal from '@platform/shared/components/ui/ExportModal'
import ImportModal from '@platform/shared/components/ui/ImportModal'
import { useNavigation } from '@platform/shared/contexts/DashboardContext'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
import type { WireframeView } from '@platform/types/index'
import { Plus, SlidersHorizontal } from 'lucide-react'
import React, { useCallback, useEffect } from 'react'

import AddCommentForm from './components/AddCommentForm'
import CommentsWall from './components/CommentsWall'
import FilterPanel from './components/FilterPanel'
import { FeedbackTabContext, FeedbackTabProvider, useFeedbackTabContext } from './context'

function FeedbackTabContent() {
  const {
    viewMode,
    setViewMode,
    showExportModal,
    setShowExportModal,
    showImportModal,
    setShowImportModal,
    showFilterPanel,
    setShowFilterPanel,
    filter,
    setFilter,
    hasActiveFilters,
    exportReviewerName,
    setExportReviewerName,
    exportIncludeScreenshots,
    setExportIncludeScreenshots,
    cloudKey,
    setCloudKey,
    providedKey,
    exportStatus,
    exportError,
    exportShareUrl,
    cloudExportEnabled,
    handleExport,
    handleLocalExport,
    resetExport,
    importStatus,
    setImportStatus,
    importErrorMessage,
    importedCount,
    importedReviewer,
    importedDuplicates,
    importedTotalAfter,
    handleImportFile,
    handleImportText,
    importReadKey,
    setImportReadKey,
    handleImportFromCloud,
    setSelectedScreen,
    setSelectedScreenLabel,
    filteredGroupedComments,
  } = useFeedbackTabContext()

  const { activeViewId } = useNavigation()
  const { theme, scale } = useTheme()
  const { setOpenExportModal, setOpenImportModal, setOpenCommentForm } = useFeedback()

  // Register modal openers so Action Center / keyboard shortcuts can trigger them from outside the tab
  useEffect(() => {
    setOpenExportModal(() => setShowExportModal(true))
    setOpenImportModal(() => setShowImportModal(true))
  }, [setOpenExportModal, setOpenImportModal, setShowExportModal, setShowImportModal])

  // Derive the current view's id/label from activeViewId for defaulting the add-comment form.
  // We use the keys from filteredGroupedComments + raw activeViewId since we don't have ALL_VIEWS here.
  const getDefaultScreen = useCallback(() => {
    const cleanId = activeViewId.replace('-play', '')
    // Prefer any existing comment's screenLabel for the clean id
    const existingEntry = Object.entries(filteredGroupedComments).find(([sid]) => sid === cleanId)
    return { id: cleanId, label: existingEntry?.[1][0]?.screenLabel ?? cleanId }
  }, [activeViewId, filteredGroupedComments])

  useEffect(() => {
    setOpenCommentForm(() => {
      const defaultScreen = getDefaultScreen()
      setSelectedScreen(defaultScreen.id)
      setSelectedScreenLabel(defaultScreen.label)
      setViewMode('add-comment')
    })
    return () => setOpenCommentForm(() => {})
  }, [setOpenCommentForm, setViewMode, setSelectedScreen, setSelectedScreenLabel, getDefaultScreen])

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (showExportModal || showImportModal) return
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      if (mod && !e.shiftKey && key === 'i') {
        e.preventDefault()
        setShowImportModal(true)
      }
      if (mod && e.shiftKey && key === 'f') {
        e.preventDefault()
        setFilter(prev => ({ ...prev, filterForCurrentScreen: !prev.filterForCurrentScreen }))
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [showExportModal, showImportModal, setShowImportModal, setFilter])

  if (viewMode === 'wall') {
    return (
      <div className="flex flex-col gap-2 min-h-full overflow-y-auto p-2 size-full">
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setViewMode('add-comment')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              background: theme.accent.blue,
              border: 'none',
              color: '#fff',
              fontSize: 'var(--font-size-ui-sm)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            <Plus size={13} /> Add Comment
          </button>
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            title="Filter comments"
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background:
                showFilterPanel || hasActiveFilters ? theme.accent.blue : theme.bg.elevated,
              border: `1px solid ${showFilterPanel || hasActiveFilters ? theme.accent.blue : theme.bg.border}`,
              color: showFilterPanel || hasActiveFilters ? '#fff' : theme.text.muted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>

        {showFilterPanel && <FilterPanel />}

        <CommentsWall />

        <ExportModal
          isOpen={showExportModal}
          onClose={() => {
            setShowExportModal(false)
            resetExport()
          }}
          reviewerName={exportReviewerName}
          setReviewerName={setExportReviewerName}
          includeScreenshots={exportIncludeScreenshots}
          setIncludeScreenshots={setExportIncludeScreenshots}
          cloudKey={cloudKey}
          setCloudKey={setCloudKey}
          providedKey={providedKey}
          exportStatus={exportStatus}
          exportError={exportError}
          exportShareUrl={exportShareUrl}
          cloudExportEnabled={cloudExportEnabled}
          onExport={handleExport}
          onDownload={handleLocalExport}
        />

        <ImportModal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false)
            setImportStatus('idle')
          }}
          importStatus={importStatus}
          setImportStatus={setImportStatus}
          importErrorMessage={importErrorMessage}
          importedCount={importedCount}
          importedReviewer={importedReviewer}
          importedDuplicates={importedDuplicates}
          importedTotalAfter={importedTotalAfter}
          onImportFile={handleImportFile}
          onImportText={handleImportText}
          importReadKey={importReadKey}
          setImportReadKey={setImportReadKey}
          onImportFromCloud={handleImportFromCloud}
          cloudExportEnabled={cloudExportEnabled}
        />

        <div
          className="italic border-t pt-2 mt-auto"
          style={{
            fontSize: scale.text.xxs,
            borderColor: theme.bg.border,
            color: theme.text.muted,
          }}
        >
          <p>
            ⌘K: Add comment • ⌘I: Import • ⌘⇧F: Toggle screen filter
            {filter.filterForCurrentScreen && (
              <span style={{ color: theme.accent.blue }}> · Screen filter ON</span>
            )}
          </p>
        </div>
      </div>
    )
  }

  return <AddCommentForm />
}

export default function FeedbackPanel({ views }: { views: WireframeView[] }) {
  const existingCtx = React.useContext(FeedbackTabContext)
  if (existingCtx) {
    return <FeedbackTabContent />
  }
  return (
    <FeedbackTabProvider views={views}>
      <FeedbackTabContent />
    </FeedbackTabProvider>
  )
}
