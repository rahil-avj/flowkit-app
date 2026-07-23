export type SearchItemKind = 'page' | 'flowStory' | 'chapter'

/** Extra metadata attached to PaletteItem.meta for Go-To results. */
export interface GoToItemMeta {
  kind: SearchItemKind
  /** Parent chapter id — present for page items; the chapter id itself for chapter items. */
  chapterId?: string
  /** First page id in the chapter — present for chapter items. */
  firstPageId?: string
}
