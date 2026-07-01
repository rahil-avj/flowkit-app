// Public API for the flow-library feature.
// Import from '@features/flow-library' — never reach inside internals.
export { default as FlowCanvas } from './FlowCanvas'
export { default as FlowLibrary } from './FlowLibrary'
export type { FlowRunRecord } from './runHistory'
export { readLastRun, writeLastRun } from './runHistory'
export { default as ScreensHierarchy } from './ScreensHierarchy'
export type { FlowLibraryData, FlowSummary } from './useFlowLibrary'
export { useFlowLibrary } from './useFlowLibrary'
// Compiler is part of this feature's public surface (used by the loader/runner).
export type {
  CompiledFlowplan,
  CompiledStep,
  ResolvedScreen,
  ScreenResolver,
} from './compileFlowplan'
export { compileFlowplan, FlowplanCompileError } from './compileFlowplan'
