// Platform command: prints CLI usage help.
import path from 'path'
import { getActiveWorkspaceName, isRepoMode, ROOT } from '../helpers/paths.js'
import { readJson } from '../helpers/json.js'
import { b, c, d } from '../helpers/colors.js'

export function cmdHelp() {
  const ws = getActiveWorkspaceName()
  const pkg = readJson(path.join(ROOT, 'package.json'), {})
  const mode = isRepoMode() ? 'repo' : 'consumer (flat/multi-workspace)'
  console.log(`
${b('flowkit')} ${d(`v${pkg.version ?? 'unknown'}`)} — UI prototyping platform CLI
${d(`Active workspace: ${ws || '(none)'}  ·  Mode: ${mode}`)}

${b('Syntax:')} short alias or long-form, both always work
  ${c('flowkit nw')}                         guided
  ${c('flowkit nw:<name>')}                  express — colon separates command from value
  ${c('flowkit new-workspace:<name>')}        same, long form
  ${c('flowkit nw:<name> --kit:apple --lang:ts --agent:claude')}   with flags

${b('Workspaces (repo mode only')} ${d('— not available in flat/multi consumer projects, see below')}${b('):')}
  ${c('nw')} / ${c('new-workspace')}           Create workspace (guided or express)
  ${c('rw')} / ${c('remove-workspace')}        Remove workspace (requires confirmation)
  ${c('watch:flows')}                      Watch for file changes
  ${c('status')}                           Health snapshot: flows, router, sessions, feedback, agent

${b('Workspaces (flat/multi-workspace author projects):')}
  ${c('convert:multi')} ${d('[--name:<id>]')}       Convert a flat project to multi-workspace mode
  ${c('convert:flat')} ${d('[--from:<id>] [--all]')}  Collapse multi-workspace mode back to flat
  ${c('create:workspace')} ${d('[--name:<id>] [--lang:ts|js]')}   Add a workspace (multi mode only)
  ${c('remove:workspace')} ${d('[--name:<id>]')}     Remove a workspace (requires confirmation)
  ${c('rename:workspace')} ${d('<old> <new>')}       Rename a workspace

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
  ${c('promote:flow')} ${d('--flowplan:<path> --fork:"<label>" [--as:<new-id>]')}   Extract a fork into its own flowplan

  ${d('All scaffold commands accept --workspace:<name> to target a non-active workspace.')}
  ${d('screenOrder in flowkit.config.ts controls display order; scaffold commands keep it in sync.')}

${b('Projects:')}
  ${c('project:ls')} / ${c('pj:ls')}          List projects + plan counts

${b('FlowPlans:')}
  ${c('plan:ls')} / ${c('fp:ls')}             List flowplans  ${d('[--project:<slug>]')}
  ${c('plan:check')} / ${c('fp:check')}       Validate flowplans (static lint)

${b('Sessions (FlowTracer / FlowLens library):')}
  ${d('Note: this section uses space-separated flags (--flag value), not the --flag:value colon')}
  ${d('convention used everywhere else in this CLI.')}
  ${c('sessions:ls')} ${d('[--json]')}         List committed sessions
  ${c('sessions:import <file>')} ${d('[--force] [--study <name|id>]')}   Import an exported session
  ${c('sessions:export')} / ${c('se')} ${d('<id|name|file> [--dest <path>]')}   Export a committed session back to disk
  ${c('sessions:check')}                   Validate the library
  ${c('sessions:stats')}                   Roll-up: quality, completion, frustrated screens
  ${c('sessions:sample')}                  Generate a synthetic test session
  ${c('sessions:rm <id|name|file>')}       Remove one committed session
  ${c('sessions:purge')} / ${c('sp')} ${d('[--test-only] [--older-than <days>] [--study <name|id>]')}   Bulk remove
  ${c('sessions:brief')} ${d('[--append]')}          Agent brief from session data  ${d('(--append → project.md)')}
  ${c('sessions:report')} ${d('[--study <name|id>] [--format json|md|both] [--agent] [--dest <path>]')}
                                       Unified report — ${c('lens:report')}/${c('sessions:brief')} are presets of this.
                                       ${d('--agent appends to .agent/project.md instead of stdout.')}
  ${c('lens:report')} / ${c('lr')}             Export FlowLens analytics JSON  ${d('[--dest <path>]')}
  ${c('sessions:study:new')} ${d('<name> [--desc "<text>"]')} / ${c('study:ls')} / ${c('study:archive')} ${d('[--force]')} / ${c('study:active')}
                                       Manage FlowLens studies (named session cohorts)

${b('Feedback:')}
  ${c('feedback:import <file>')} / ${c('fi')}   Commit feedback from an exported JSON file
  ${c('feedback:dump')} / ${c('fd')} ${d('[--dest <path>]')}   Export committed feedback to disk
  ${c('feedback:ls')}                      List committed comments

${b('Export & handoff')} ${d('(repo mode only):')}
  ${c('export')} ${d('[<workspace>|all]')}          Standalone HTML viewer (no FlowLens)  ${d('— guided prompt if omitted')}
  ${c('export:full')} ${d('[<workspace>|all]')}     Standalone HTML viewer + FlowLens included
  ${c('handoff')} ${d('[<workspace>]')}             Developer handoff zip  ${d('— guided prompt if omitted')}

${b('Agent onboarding:')}
  ${c('agent:sync')} ${d('[--agent:claude|agents|cursor|none]')}   Regenerate .agent/* from spec

  ${c('flowkit -h')} / ${c('flowkit help')}     — show this help
  ${c('flowkit -v')} / ${c('flowkit version')}  — show installed version
`)
}
