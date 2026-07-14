// flowkit check:plans — flowplan rules. Real successor to plan:check's previous
// string-presence-only implementation (scripts/platform/plans.js's cmdPlanCheck now
// delegates here).
//
// Known gap, deliberate: fork-nested steps (the `label:`+`steps:[...]` sub-objects
// scripts/authoring/promote-flow.js text-matches by regex) are NOT walked by
// `flowplan/invalid-screen` below — forks aren't part of FlowplanDef's typed `steps[]`
// union (src/types/index.ts's FlowplanStepEntry is FlowStep | FlowplanRef, neither of
// which models a fork's nested structure), and promote-flow.js's own fork-detection is
// itself regex-based rather than a stable, reusable AST shape. Revisit once forks have a
// first-class typed representation to validate against.
import fs from 'fs'
import path from 'path'
import { readFlowplanModule } from './config.js'

function listFlowplanFiles(wsDir) {
  const dir = path.join(wsDir, 'flowplans')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
    .map(f => ({ file: f, fullPath: path.join(dir, f) }))
}

/** True for a plain FlowStep entry (has screenId) — excludes FlowplanRef ({ ref }) entries. */
function isScreenStep(entry) {
  return entry && typeof entry === 'object' && typeof entry.screenId === 'string'
}

function collectAllScreenIds(wsDir) {
  const flowsDir = path.join(wsDir, 'flows')
  const ids = new Set()
  if (!fs.existsSync(flowsDir)) return ids
  for (const flowId of fs.readdirSync(flowsDir)) {
    const flowDir = path.join(flowsDir, flowId)
    if (!fs.statSync(flowDir).isDirectory()) continue
    for (const screenId of fs.readdirSync(flowDir)) {
      if (fs.statSync(path.join(flowDir, screenId)).isDirectory()) ids.add(screenId)
    }
  }
  return ids
}

/** Runs flowplan-domain rules for one workspace. Appends findings to `report`. */
export async function checkFlowplans(wsDir, report) {
  const files = listFlowplanFiles(wsDir)
  if (files.length === 0) {
    // A flowplans/ dir that exists but is empty is suspicious enough to fail the
    // prebuild gate rather than silently pass — mirrors plan:check's old behavior
    // (the naive string-check command this rule module supersedes).
    if (fs.existsSync(path.join(wsDir, 'flowplans'))) {
      report.add({
        ruleId: 'flowplan/empty-workspace',
        severity: 'error',
        file: 'flowplans/',
        message: 'flowplans/ directory exists but contains no .ts/.js plans.',
        fix: 'flowkit create:flowplan --name:<id>',
      })
    }
    return
  }

  const knownScreenIds = collectAllScreenIds(wsDir)

  for (const { file, fullPath } of files) {
    const relPath = path.relative(wsDir, fullPath)
    const flowplan = await readFlowplanModule(fullPath)
    if (!flowplan) {
      report.add({
        ruleId: 'flowplan/unreadable',
        severity: 'error',
        file: relPath,
        message: 'Could not be parsed/evaluated — check for a syntax error.',
      })
      continue
    }

    const expectedId = file.replace(/\.(ts|js)$/, '')
    if (flowplan.id && flowplan.id !== expectedId) {
      report.add({
        ruleId: 'flowplan/id-filename-mismatch',
        severity: 'error',
        file: relPath,
        message: `defineFlow's id is '${flowplan.id}' but the filename implies '${expectedId}'.`,
        fix: `Set id to '${expectedId}', or rename the file to match.`,
      })
    }

    const steps = flowplan.steps ?? []
    if (steps.length === 0) {
      report.add({
        ruleId: 'flowplan/empty-steps',
        severity: 'warning',
        file: relPath,
        message: 'Flowplan has zero steps.',
        fix: `flowkit add:step --flowplan:${expectedId} --screen:<id>`,
      })
      continue
    }

    steps.forEach((step, i) => {
      if (!isScreenStep(step)) return // a FlowplanRef ({ ref }) — nothing to validate here

      if (!knownScreenIds.has(step.screenId)) {
        report.add({
          ruleId: 'flowplan/invalid-screen',
          severity: 'error',
          file: relPath,
          message: `step[${i}]'s screenId '${step.screenId}' is not a real screen in this workspace.`,
          fix: 'Update the step to reference a real screenId.',
          clifix: `flowkit create:screen --flow:<flow> --name:${step.screenId}`,
        })
      }

      if (!step.actionNote && !step.on) {
        report.add({
          ruleId: 'flowplan/weak-step',
          severity: 'warning',
          file: relPath,
          message: `step[${i}] has no actionNote and no 'on' handler — playback shows no guidance.`,
          fix: `Add actionNote: 'describe what the user does here'`,
        })
      }
    })
  }
}
