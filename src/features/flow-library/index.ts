// Public API for the flow-library feature.
// Import from '@flowkit-features/flow-library' — never reach inside internals.
export { default as FlowCanvas } from './FlowCanvas'
export { default as FlowLibrary } from './FlowLibrary'
export { default as PagesHierarchy } from './PagesHierarchy'
export type { FlowRunRecord } from './runHistory'
export { readLastRun, writeLastRun } from './runHistory'
export type { FlowLibraryData, FlowSummary } from './useFlowLibrary'
export { useFlowLibrary } from './useFlowLibrary'
// Compiler moved to @features/flowStory — re-exported here so existing consumers
// of this barrel (e.g. FlowMaster's `CompiledFlowplan` type import) keep working.
export type {
  CompiledFlowplan,
  CompiledStep,
  PageResolver,
  ResolvedPage,
} from '../flowStory/compileFlowStory'
export { compileFlowStory, FlowplanCompileError } from '../flowStory/compileFlowStory'
