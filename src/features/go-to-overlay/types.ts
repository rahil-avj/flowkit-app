export type SearchItemKind = 'screen' | 'flowplan' | 'flow'

/** Extra metadata attached to PaletteItem.meta for Go-To results. */
export interface GoToItemMeta {
  kind: SearchItemKind
  /** Parent flow id — present for screen items; the flow id itself for flow items. */
  flowId?: string
  /** First screen id in the flow — present for flow items. */
  firstPageId?: string
}
