// Public API for workspace config + flowplan authoring helpers.
// Import from '@flowkit-core/config'.
export type {
  AnnotationTag,
  AnnotationTagColor,
  DotPathPatch,
  FlowkitConfig,
  FlowkitProjectConfig,
  FlowplanDef,
  FlowplanRef,
  FlowplanStepEntry,
  FlowStep,
  Fork,
  PageProps,
  SimulatorControl,
  SimulatorControlType,
  StepSimulatorOverride,
} from '../../types/index'
export { defineConfig, defineFlow, tag } from './defineConfig'
