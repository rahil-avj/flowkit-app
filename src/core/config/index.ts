// Public API for workspace config + flowplan authoring helpers.
// Import from '@flowkit-core/config'.
export type {
  AnnotationTag,
  AnnotationTagColor,
  FlowkitConfig,
  FlowkitProjectConfig,
  FlowplanDef,
  FlowplanStepEntry,
  FlowScreenProps,
  SimulatorControl,
} from '../../types/index'
export { defineConfig, defineFlow, tag } from './defineConfig'
