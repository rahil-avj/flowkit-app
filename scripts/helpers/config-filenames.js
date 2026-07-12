/**
 * Single source of truth for the two config filenames every authoring
 * command, scaffolder, and doc must agree on. Import these instead of
 * retyping the string literal.
 */

/** Per-workspace content registration (workspace identity, flows, screenOrder). */
export const WORKSPACE_CONFIG_FILENAME = 'workspace.ts'

/** Project-root export settings (exportDefaults, exportProfiles). Plain JSON. */
export const PROJECT_CONFIG_FILENAME = 'flowkit.json'
