// Public API for the flowplan feature.
// Import from '@flowkit-features/flowplan' — never reach inside internals.
export type { CompiledFlowplan, CompiledStep, PageResolver, ResolvedPage } from './compileFlowplan'
export { compileFlowplan, FlowplanCompileError } from './compileFlowplan'
export { default as MobilePlaybackBar } from './components/MobilePlaybackBar'
export type { FlowplanSettingsValue, HighlightColor, HintPosition } from './FlowplanSettingsContext'
export { FlowplanSettingsProvider, useFlowplanSettings } from './FlowplanSettingsContext'
export type { FlowPlaybackValue } from './FlowPlaybackContext'
export {
  FlowPlaybackProvider,
  useFlowPlayback,
  useFlowPlaybackOptional,
} from './FlowPlaybackContext'
export type { FlowplanElementCheckResult } from './useFlowplanElementCheck'
export { useFlowplanElementCheck } from './useFlowplanElementCheck'
