# FlowLens ReportsOverlay — UI/UX Revamp Plan

## Context

The current `ReportsOverlay` is a single-column scrollable page with a flat filter bar and minimal visual structure. It doesn't scale to large datasets: the filter bar gets cluttered with more fields, there's no way to navigate sections non-linearly, and there's no sessions list, loading skeleton, or empty state. Several filter fields in the data model (date range, tags, maxQuality) are silently unused by the UI.

**Goal:** Revamp into a polished, scalable analytics dashboard — two-pane layout with a collapsible filter sidebar and a tabbed main content area.

---

## File Modified

**Only one file changes:**
`src/modes/flowlens/components/reports/ReportsOverlay.tsx`

No changes to `AnalyticsOverlay.tsx`, `analyticsPrimitives.tsx`, `aggregate.ts`, `sessionFilters.ts`, or `HeatmapView.tsx`.

---

## New Layout Structure

```
<AnalyticsOverlay>
  <div className="flex h-full overflow-hidden">

    {/* LEFT: collapsible filter sidebar — 260px open, 40px collapsed */}
    <aside className="shrink-0 border-r border-theme-border transition-[width] duration-200 ...">
      <FilterSidebar ... />
    </aside>

    {/* RIGHT: tab bar + tab body */}
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Tab bar row — shrink-0, h-10 */}
      {/* Active tab panel — flex-1 overflow-auto */}
    </div>

  </div>
</AnalyticsOverlay>
```

The `AnalyticsOverlay` wrapper gives `flex-1 overflow-auto` to its child div, which makes `h-full` resolve correctly for the inner layout.

---

## New State

```typescript
type TabId = 'overview' | 'funnel' | 'heatmap' | 'sessions'
const [tab, setTab] = useState<TabId>('overview')
const [sidebarOpen, setSidebarOpen] = useState(true)

type SortCol = 'name' | 'date' | 'duration' | 'quality' | 'screens' | 'completion' | 'source'
type SortDir = 'asc' | 'desc'
const [sortCol, setSortCol] = useState<SortCol>('date')
const [sortDir, setSortDir] = useState<SortDir>('desc')
```

Add a `toDateInput(ms: number): string` helper alongside `fmtDur`.

Add `activeFilterCount` memo: count of non-default filter fields (screenId, device, connection, minQuality>0, maxQuality<100, tags.length, startAfter, startBefore, completion!='any', source!='any').

---

## New Imports

```typescript
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { ExportMenu, MiniBarRow } from '../analyticsPrimitives'
```

---

## Sub-Components (all defined after the default export)

### Layout

**`FilterSidebar`** — Left panel. Props: `filters`, `setFilters`, `facets`, `activeFilterCount`, `isOpen`, `onToggle`.

- Toggle row (h-10, border-b): `<SlidersHorizontal>` icon + "Filters" label + accent badge for count.
- Scrollable body (flex-1 overflow-y-auto): collapsible `FilterSection` groups.
- Pinned reset button at bottom.

**`FilterSection`** — Collapsible wrapper. Local `useState` for open/closed. Renders title + `<ChevronDown>` header, children in body.

**`SidebarSelect`** — Vertical-stacked select (label above, full-width `<select>`).

### Tabs

**`OverviewTab`** — Props: `stats`, `funnel`, `filtered`, `onGoToFunnel`. Renders:

1. Hero stat grid (`StatCard` × 7, `grid-cols-[repeat(auto-fill,minmax(160px,1fr))]`)
2. Quick funnel preview (`funnel.slice(0,5)` via `FunnelBar compact` + "View all →" action)
3. Most frustrated screens via `MiniBarRow` (reuse from `analyticsPrimitives`)
4. Screen popularity mini-table (visits + avg dwell, top 10)

**`FunnelTab`** — Props: `funnel`, `stats`. Full list of `FunnelBar` steps with step-index badges and drop-off annotations.

**`HeatmapTab`** — Props: `heatmaps`, `views`, `heatScreen`, `setHeatScreen`. Screen picker row + `HeatmapView` filling remaining height.

**`SessionsTab`** — Props: `filtered`, `sortCol`, `sortDir`, `onSort`. Sticky-header table with `SortableHeader` columns + `SessionRow` rows. Footer count bar.

### Atoms

**`StatCard`** — Replaces old `Stat`. Larger (text-3xl value), supports `accent` (purple) and `warn` (amber) color props.

**`FunnelBar`** — Single funnel step: numbered badge, screen name, filled progress bar, drop-off annotation. `compact` prop for overview preview (no annotation row).

**`SortableHeader`** — `<th>` with sort arrows (↑/↓/↕), click handler.

**`SessionRow`** — `<tr>` with: name, date, duration, quality (green/purple/red by score), event count, outcome badge (Completed/Abandoned), source, tags.

**`TagPill`** — Tiny inline tag badge.

**`SkeletonBlock`** — `animate-pulse bg-theme-border rounded` div. Used in loading states.

**`EmptyState`** — Centered panel with inline SVG icon, headline, subtext, and accent "Reset filters" button. Shown when `sessions !== null && filtered.length === 0`.

**`Section`** — Revised to accept optional `action` prop (right-aligned, used for "View all →" links in Overview).

---

## Filter Sidebar — All Filters Exposed

| Group               | Fields                                                                                |
| ------------------- | ------------------------------------------------------------------------------------- |
| Basic (defaultOpen) | Screen, Device, Connection, Outcome, Source — via `SidebarSelect`                     |
| Quality             | Min quality slider + Max quality slider (both from data model, max was unused before) |
| Date range          | "After" + "Before" `<input type="date">` → epoch-ms via `new Date().getTime()`        |
| Tags                | Checkbox list from `facets.tags` (was unused in old UI)                               |
| Advanced            | Include test mode checkbox                                                            |

---

## Loading State (sessions === null)

Each tab body shows skeletons instead of real content:

- **Overview**: 7 shimmer stat cards + 5 shimmer funnel rows
- **Sessions**: 1 header block + 8 row blocks
- Other tabs: a single centered loading text

---

## Empty State (filtered.length === 0, sessions loaded)

All tabs show `<EmptyState onReset={() => setFilters(DEFAULT_FILTERS)} />` instead of their normal content.

---

## Verification

1. Run the dev server (`npm run dev` or equivalent).
2. Open FlowLens mode, click the Reports button.
3. Verify:
   - Two-pane layout renders: sidebar left, tabs right.
   - Sidebar collapses/expands on toggle; active filter count badge appears.
   - All 4 tabs switch without error.
   - Overview tab shows 7 stat cards, funnel preview, frustrated screens, screen popularity.
   - Funnel tab shows full funnel with step badges.
   - Heatmap tab shows screen picker + heatmap viewer filling the panel.
   - Sessions tab shows sortable table; clicking column headers sorts correctly.
   - Date range and tag filters apply correctly (change subtitle count).
   - Loading skeletons appear briefly before sessions load.
   - Empty state appears when filters exclude all sessions.
   - Export still works from the header action.
   - Escape key still closes the overlay.
