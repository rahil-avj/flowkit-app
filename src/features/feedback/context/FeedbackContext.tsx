import { FeedbackComment, FeedbackTag } from '@flowkit/types/index'
import { LS_FEEDBACK, LS_LAST_REVIEWER } from '@flowkit-shared/constants/storageKeys'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

import { buildCloudSyncSlot, type CloudSyncSlot, useCloudSync } from '../cloud-sync'

const STORAGE_KEY = LS_FEEDBACK
const REVIEWER_STORAGE_KEY = LS_LAST_REVIEWER

export class FeedbackImageStore {
  static dbName = 'flowkit-feedback-images'
  static storeName = 'images'

  static getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore(this.storeName)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  static async set(key: string, value: string): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(value, key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  static async get(key: string): Promise<string | null> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.get(key)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    } catch {
      return null
    }
  }

  static async delete(key: string): Promise<void> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.delete(key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch {
      // ignore
    }
  }

  static async clear(): Promise<void> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch {
      // ignore
    }
  }
}

interface FeedbackContextValue {
  comments: FeedbackComment[]
  addComment: (
    pageId: string,
    screenLabel: string,
    tags: FeedbackTag[],
    text: string,
    authorName?: string,
    screenshot?: string
  ) => void
  editComment: (id: string, text: string, tags: FeedbackTag[]) => void
  deleteComment: (id: string) => void
  clearAll: () => void
  commentedScreenCount: number
  totalCommentCount: number
  exportAndDownload: (
    reviewerName: string,
    format: 'md' | 'json' | 'both',
    includeScreenshots: boolean,
    options?: { download?: boolean }
  ) => Promise<{ json?: string }>
  importComments: (file: File) => Promise<void>
  importCommentsFromText: (
    text: string
  ) => Promise<{ reviewer: string; added: number; duplicates: number }>
  openFeedbackTab: () => void
  setOpenFeedbackTab: (cb: () => void) => void
  openCommentForm: () => void
  setOpenCommentForm: (cb: () => void) => void
  openExportModal: () => void
  setOpenExportModal: (cb: () => void) => void
  openImportModal: () => void
  setOpenImportModal: (cb: () => void) => void
  lastReviewerName: string
  setLastReviewerName: (name: string) => void
  cloudSyncSlot?: CloudSyncSlot
  cloudExportEnabled: boolean
  cloudKey: string
  setCloudKey: (key: string) => void
  providedKey: string
  importReadKey: string
  setImportReadKey: (key: string) => void
  pushJson: (filename: string, json: string) => Promise<{ shareUrl: string }>
  pullFromBin: (binUrl: string) => Promise<string>
}

if (import.meta.hot && !import.meta.hot.data.FeedbackContext) {
  import.meta.hot.data.FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined)
}
const FeedbackContext =
  (import.meta.hot?.data.FeedbackContext as
    ReturnType<typeof createContext<FeedbackContextValue | undefined>> | undefined) ??
  createContext<FeedbackContextValue | undefined>(undefined)

export function useFeedback() {
  const context = useContext(FeedbackContext)
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider')
  }
  return context
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [comments, setComments] = useState<FeedbackComment[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return JSON.parse(stored).comments || []
    } catch {
      /* ignore malformed storage */
    }
    return []
  })
  const [lastReviewerName, setLastReviewerName] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(REVIEWER_STORAGE_KEY) || ''
  })
  const cloudSync = useCloudSync()
  const cloudSyncSlot = buildCloudSyncSlot(cloudSync)
  const openFeedbackTabRef = useRef<(() => void) | null>(null)
  const openCommentFormRef = useRef<(() => void) | null>(null)
  const openExportModalRef = useRef<(() => void) | null>(null)
  const openImportModalRef = useRef<(() => void) | null>(null)

  // Persist comments whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ comments }))
  }, [comments])

  const addComment = (
    pageId: string,
    screenLabel: string,
    tags: FeedbackTag[],
    text: string,
    authorName?: string,
    screenshot?: string
  ) => {
    const id = Date.now().toString()
    const newComment: FeedbackComment = {
      id,
      pageId,
      screenLabel,
      tags,
      text,
      timestamp: new Date().toISOString(),
      ...(authorName ? { authorName } : {}),
    }

    if (screenshot) {
      FeedbackImageStore.set(id, screenshot).catch(err => {
        console.error('Failed to store screenshot in IndexedDB:', err)
      })
    }

    setComments(prev => [...prev, newComment])
  }

  const editComment = (id: string, text: string, tags: FeedbackTag[]) => {
    setComments(prev => prev.map(c => (c.id === id ? { ...c, text, tags } : c)))
  }

  const deleteComment = (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id))
    FeedbackImageStore.delete(id).catch(() => {})
  }

  const clearAll = () => {
    setComments([])
    FeedbackImageStore.clear().catch(() => {})
  }

  const commentedScreenCount = new Set(comments.map(c => c.pageId)).size
  const totalCommentCount = comments.length

  const exportMarkdown = (
    reviewerName: string,
    commentsList: FeedbackComment[],
    includeScreenshots: boolean
  ): string => {
    const generated = new Date().toISOString().split('T')[0]
    const screenComments: Record<string, FeedbackComment[]> = {}

    commentsList.forEach(comment => {
      if (!screenComments[comment.pageId]) {
        screenComments[comment.pageId] = []
      }
      screenComments[comment.pageId].push(comment)
    })

    const screenIds = Object.keys(screenComments).sort()
    let md = `# Flowkit Feedback\n`
    md += `Reviewer: ${reviewerName}\n`
    md += `Generated: ${generated} · ${totalCommentCount} comment${totalCommentCount !== 1 ? 's' : ''} across ${commentedScreenCount} screen${commentedScreenCount !== 1 ? 's' : ''}\n\n`
    md += `---\n\n`

    screenIds.forEach(pageId => {
      const screenComments_ = screenComments[pageId]
      if (screenComments_.length === 0) return

      const firstComment = screenComments_[0]
      md += `## ${pageId} — ${firstComment.screenLabel}\n\n`

      screenComments_.forEach((c, idx) => {
        const time = new Date(c.timestamp).toLocaleString()
        md += `**Comment ${idx + 1}** · ${time}  \n`
        if (c.tags.length > 0) {
          md += `Tags: ${c.tags.join(', ')}\n`
        }
        md += `${c.text}\n\n`
        if (includeScreenshots && c.screenshot) {
          md += `![Screenshot of ${pageId}](${c.screenshot})\n\n`
        }
      })

      md += `---\n\n`
    })

    return md
  }

  const parseMdFeedback = (content: string): { reviewer: string; comments: FeedbackComment[] } => {
    const lines = content.split('\n')
    let reviewer = 'Unknown'
    const comments: FeedbackComment[] = []

    // Parse header
    for (const line of lines) {
      const reviewerMatch = line.match(/^Reviewer:\s*(.+)/)
      if (reviewerMatch) {
        reviewer = reviewerMatch[1].trim()
        break
      }
    }

    // Split into screen sections by ## headings
    const sectionRegex = /^## (.+?) — (.+)$/m
    const sections = content.split(/^---$/m).filter(s => sectionRegex.test(s))

    for (const section of sections) {
      const sectionLines = section.split('\n')
      const headingLine = sectionLines.find(l => sectionRegex.test(l))
      if (!headingLine) continue
      const headingMatch = headingLine.match(sectionRegex)
      if (!headingMatch) continue
      const pageId = headingMatch[1].trim()
      const screenLabel = headingMatch[2].trim()

      // Split section into individual comments by **Comment N** lines
      const commentBlocks = section.split(/\*\*Comment \d+\*\*/g).slice(1)

      for (const block of commentBlocks) {
        const blockLines = block.split('\n')

        // Parse timestamp from the header line (first non-empty line)
        let timestamp = new Date().toISOString()
        const headerLine = blockLines.find(l => l.trim().startsWith('·'))
        if (headerLine) {
          const tsMatch = headerLine.match(/·\s*(.+?)\s*(?:·|$)/)
          if (tsMatch) {
            const parsed = Date.parse(tsMatch[1].trim())
            if (!isNaN(parsed)) timestamp = new Date(parsed).toISOString()
          }
        }

        // Parse Tags: line
        let tags: FeedbackTag[] = []
        const tagsLine = blockLines.find(l => l.trim().startsWith('Tags:'))
        if (tagsLine) {
          const rawTags = tagsLine
            .replace(/^Tags:\s*/i, '')
            .split(',')
            .map(t => t.trim())
          const VALID_TAGS = new Set<string>([
            '#minor-issue',
            '#major-issue',
            '#question',
            '#suggestion',
            '#approved',
            '#needs-revision',
          ])
          tags = rawTags.filter(t => VALID_TAGS.has(t)) as FeedbackTag[]
        }

        // Everything else (after header and Tags lines) is the comment body
        const bodyLines = blockLines.filter(l => {
          const t = l.trim()
          return t !== '' && !t.startsWith('·') && !t.startsWith('Tags:') && !t.startsWith('![')
        })
        const text = bodyLines.join('\n').trim()
        if (!text) continue

        comments.push({
          id: `md-import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          pageId,
          screenLabel,
          tags,
          text,
          timestamp,
          authorName: reviewer,
          isImported: true,
        })
      }
    }

    return { reviewer, comments }
  }

  // No cloud vocabulary here — this function only knows how to produce content
  // and (optionally) trigger a browser download. Cloud push is the caller's
  // responsibility (see context/index.tsx's handleExport), which calls this with
  // { download: false } and hands the returned json to cloud-sync's pushJson.
  const exportAndDownload = async (
    reviewerName: string,
    format: 'md' | 'json' | 'both' = 'both',
    includeScreenshots = true,
    options?: { download?: boolean }
  ): Promise<{ json?: string }> => {
    const download = options?.download ?? true
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `wireframe-feedback-${dateStr}`

    localStorage.setItem(REVIEWER_STORAGE_KEY, reviewerName)
    setLastReviewerName(reviewerName)

    const hydratedComments = await Promise.all(
      comments.map(async c => {
        let screenshot: string | undefined = undefined
        if (includeScreenshots) {
          screenshot = (await FeedbackImageStore.get(c.id)) || undefined
        }
        return { ...c, screenshot }
      })
    )

    const triggerDownload = (content: string, type: string, suffix: string) => {
      const blob = new Blob([content], { type })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.${suffix}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }

    if ((format === 'md' || format === 'both') && download) {
      const md = exportMarkdown(reviewerName, hydratedComments, includeScreenshots)
      triggerDownload(md, 'text/markdown;charset=utf-8', 'md')
    }

    let json: string | undefined
    if (format === 'json' || format === 'both') {
      json = JSON.stringify(
        {
          exported: new Date().toISOString(),
          reviewer: reviewerName,
          totalComments: totalCommentCount,
          commentedScreens: commentedScreenCount,
          comments: hydratedComments.map(c => {
            if (!includeScreenshots) {
              const clone = { ...c }
              delete clone.screenshot
              return clone
            }
            return c
          }),
        },
        null,
        2
      )

      if (download) {
        if (format === 'both') {
          setTimeout(() => triggerDownload(json!, 'application/json;charset=utf-8', 'json'), 100)
        } else {
          triggerDownload(json, 'application/json;charset=utf-8', 'json')
        }
      }
    }

    return { json }
  }

  const importCommentsFromText = async (
    text: string
  ): Promise<{ reviewer: string; added: number; duplicates: number }> => {
    const trimmed = text.trim()
    let importedComments: FeedbackComment[]
    let reviewer: string

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const data = JSON.parse(trimmed)
      importedComments = data.comments || []
      reviewer = data.reviewer || 'Unknown'
    } else {
      const parsed = parseMdFeedback(trimmed)
      importedComments = parsed.comments
      reviewer = parsed.reviewer
    }

    const existingIds = new Set(comments.map(c => c.id))
    const newComments = importedComments.filter((c: FeedbackComment) => !existingIds.has(c.id))
    const duplicates = importedComments.length - newComments.length

    for (const c of newComments) {
      if (c.screenshot) {
        await FeedbackImageStore.set(c.id, c.screenshot).catch(() => {})
        delete c.screenshot
      }
    }

    setComments(prev => [
      ...prev,
      ...newComments.map((c: FeedbackComment) => ({ ...c, isImported: true })),
    ])
    return { reviewer, added: newComments.length, duplicates }
  }

  const importComments = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async e => {
        try {
          const content = e.target?.result as string
          await importCommentsFromText(content)
          resolve()
        } catch {
          reject(new Error('Failed to parse feedback file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const setOpenFeedbackTab = (cb: () => void) => {
    openFeedbackTabRef.current = cb
  }
  const openFeedbackTab = () => {
    openFeedbackTabRef.current?.()
  }
  const setOpenCommentForm = (cb: () => void) => {
    openCommentFormRef.current = cb
  }
  const openCommentForm = () => {
    openCommentFormRef.current?.()
  }
  const setOpenExportModal = (cb: () => void) => {
    openExportModalRef.current = cb
  }
  const openExportModal = () => {
    openExportModalRef.current?.()
  }
  const setOpenImportModal = (cb: () => void) => {
    openImportModalRef.current = cb
  }
  const openImportModal = () => {
    openImportModalRef.current?.()
  }

  return (
    <FeedbackContext.Provider
      value={{
        comments,
        addComment,
        editComment,
        deleteComment,
        clearAll,
        commentedScreenCount,
        totalCommentCount,
        exportAndDownload,
        importComments,
        importCommentsFromText,
        openFeedbackTab,
        setOpenFeedbackTab,
        openCommentForm,
        setOpenCommentForm,
        openExportModal,
        setOpenExportModal,
        openImportModal,
        setOpenImportModal,
        lastReviewerName,
        setLastReviewerName,
        cloudSyncSlot,
        cloudExportEnabled: cloudSync.cloudExportEnabled,
        cloudKey: cloudSync.cloudKey,
        setCloudKey: cloudSync.setCloudKey,
        providedKey: cloudSync.providedKey,
        importReadKey: cloudSync.importReadKey,
        setImportReadKey: cloudSync.setImportReadKey,
        pushJson: cloudSync.pushJson,
        pullFromBin: cloudSync.pullFromBin,
      }}
    >
      {children}
    </FeedbackContext.Provider>
  )
}
