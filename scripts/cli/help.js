import { b, c, d, getActiveWorkspaceName } from '../lib/config.js'

export function cmdHelp() {
  const ws = getActiveWorkspaceName()
  console.log(`
${b('flowkit')} — UI prototyping platform CLI
${d(`Active workspace: ${ws || '(none)'}`)}

${b('Syntax:')} short alias or long-form, both always work
  ${c('flowkit nw')}                         guided
  ${c('flowkit nw:<name>')}                  express — colon separates command from value
  ${c('flowkit new-workspace:<name>')}        same, long form
  ${c('flowkit nw:<name> --kit:apple --lang:ts --agent:claude')}   with flags

${b('Workspaces:')}
  ${c('nw')} / ${c('new-workspace')}           Create workspace (guided or express)
  ${c('rw')} / ${c('remove-workspace')}        Remove workspace (requires confirmation)
  ${c('watch:flows')}                      Watch for file changes
  ${c('status')}                           Health snapshot: flows, router, sessions, feedback, agent

${b('Scaffold (authoring):')}
  ${c('create:flow')} ${d('--name:<id>')}            Add a flow + register in config
  ${c('create:screen')} ${d('--flow:<id> --name:<id>')}  Add a screen to a flow
  ${c('create:flowplan')} ${d('--name:<id>')}         Add a flowplan script
  ${c('create:component')} ${d('--name:<id>')}        Add a workspace component
  ${c('remove:flow')} / ${c('remove:screen')} / ${c('remove:flowplan')} / ${c('remove:component')} / ${c('remove:step')} ${d('--flowplan:<id> --index:<n>')}
  ${c('rename:screen')} ${d('--flow:<id> --name:<old> --new:<new>')}
  ${c('move:screen')} ${d('--name:<id> --from:<flow> --to:<flow>')}
  ${c('add:step')} ${d('--flowplan:<id> --screen:<id>')}   Append a step to a flowplan
  ${c('add:export')} ${d('--barrel:<path> --name:<ExportName>')}   Add a barrel re-export
  ${c('list:flows')} / ${c('list:screens')} / ${c('list:steps')} / ${c('list:exports')} ${d('--barrel:<path>')}
  ${c('screen:info')} ${d('--name:<id>')}            Show screen metadata + flowplan refs
  ${c('flowplan:info')} ${d('--name:<id>')}          Show flowplan steps
  ${c('components:ls')} / ${c('components:find')} / ${c('components:scan')}

  ${d('All scaffold commands accept --workspace:<name> to target a non-active workspace.')}
  ${d('screenOrder in flowkit.config.ts controls display order; scaffold commands keep it in sync.')}

${b('Projects:')}
  ${c('project:ls')} / ${c('pj:ls')}          List projects + plan counts

${b('FlowPlans:')}
  ${c('plan:ls')} / ${c('fp:ls')}             List flowplans  ${d('[--project:<slug>]')}
  ${c('plan:check')} / ${c('fp:check')}       Validate flowplans (static lint)

${b('Sessions (FlowTracer / FlowLens library):')}
  ${c('sessions:ls')} ${d('[--json]')}         List committed sessions
  ${c('sessions:import <file>')} ${d('[--force]')}   Import an exported session
  ${c('sessions:export')} / ${c('se')}         Export a committed session back to disk
  ${c('sessions:check')}                   Validate the library
  ${c('sessions:stats')}                   Roll-up: quality, completion, frustrated screens
  ${c('sessions:sample')}                  Generate a synthetic test session
  ${c('sessions:rm <id|name>')}            Remove one committed session
  ${c('sessions:purge')} / ${c('sp')}            Bulk remove  ${d('[--test-only] [--older-than:<days>]')}
  ${c('sessions:brief')} ${d('[--append]')}          Agent brief from session data  ${d('(--append → project.md)')}
  ${c('sessions:report')} ${d('--study:<name|id> --format:json|md|both [--dest <path>]')}
                                       Unified report — ${c('lens:report')}/${c('sessions:brief')} are presets of this
  ${c('lens:report')} / ${c('lr')}             Export FlowLens analytics JSON  ${d('[--dest <path>]')}
  ${c('sessions:study:new')} ${d('<name>')} / ${c('study:ls')} / ${c('study:archive')} / ${c('study:active')}
                                       Manage FlowLens studies (named session cohorts)

${b('Feedback:')}
  ${c('feedback:import <file>')} / ${c('fi')}   Commit feedback from an exported JSON file
  ${c('feedback:dump')} / ${c('fd')}            Export committed feedback to disk
  ${c('feedback:ls')}                      List committed comments

${b('Workspace dump:')}
  ${c('dump')}  ${d('[--sessions] [--feedback] [--report] [--dest <dir>]')}
              Export all workspace data in one shot (omit flags = dump everything)

${b('Export & handoff:')}
  ${c('export')}                           Standalone HTML viewer (no FlowLens)
  ${c('export:full')}                      Standalone HTML viewer + FlowLens included
  ${c('handoff')}                          Developer handoff zip

${b('Agent onboarding:')}
  ${c('agent:sync')} ${d('[--agent:claude|agents|cursor|none]')}   Regenerate .agent/* from spec

${b('Kit (dev/internal):')}
  ${c('kit:check')}                        Check all themes cover all kit components

${b('Version & deployment:')}
  ${c('checkpoint')} ${d('[:<label>]')}          Tag HEAD before a risky change
  ${c('release')}                          Tag a milestone version with notes
  ${c('sync:deployment')}                  Generate clean deployment branch from current branch

  ${c('flowkit -h')} / ${c('flowkit help')}  — show this help
`)
}
