import type { PatchScript, ScreenMetaPatchEntry } from './types'

// ─── Page Meta Patch ────────────────────────────────────────────────────────
// Migrated from DevModeContext.generateScript / generateRestoreScript.

export function generateScreenMetaPatch(
  entries: ScreenMetaPatchEntry[],
  _activeWorkspace: string
): PatchScript {
  if (entries.length === 0) {
    return { label: 'Copy patch script', script: '' }
  }

  const patches = JSON.stringify(
    entries.map(e => ({
      filePath: e.filePath, // already root-relative (set by ScreenInfoContent as derivedPath)
      label: e.pageLabel,
      desc: e.desc,
      devNotes: e.devNotes,
      isStandalone: e.isStandalone ?? false,
      hasTag: e.hasTag ?? '',
      tags: e.tags ?? [],
    })),
    null,
    2
  )

  const script = `node << 'FLOWKIT_PATCH'
const fs = require('fs');
const patches = ${patches};

// Save backup before patching
const backup = {};
patches.forEach(({ filePath }) => {
  backup[filePath] = fs.readFileSync(filePath, 'utf8');
});
fs.writeFileSync('.flowkit-backup.json', JSON.stringify(backup, null, 2), 'utf8');
console.log('Backup saved to .flowkit-backup.json');

patches.forEach(({ filePath, desc, devNotes, isStandalone, hasTag, tags, label }) => {
  let src = fs.readFileSync(filePath, 'utf8');
  const lines = ['export const pageMeta: PageMeta = {'];
  if (desc) lines.push('  desc: ' + JSON.stringify(desc) + ',');
  if (devNotes) lines.push('  devNotes: ' + JSON.stringify(devNotes) + ',');
  if (isStandalone) lines.push('  isStandalone: true,');
  if (hasTag) lines.push('  hasTag: ' + JSON.stringify(hasTag) + ',');
  if (tags && tags.length > 0) lines.push('  tags: ' + JSON.stringify(tags) + ',');
  lines.push('};');
  const newMeta = lines.join('\\n');
  if (/export const pageMeta/.test(src)) {
    src = src.replace(/export const pageMeta[^=]*=\\s*\\{[\\s\\S]*?\\n\\};/, newMeta);
  } else {
    src = src.trimEnd() + '\\n\\n' + newMeta + '\\n';
  }
  fs.writeFileSync(filePath, src, 'utf8');
  console.log('  patched: ' + label + '  (' + filePath + ')');
});
console.log('\\nDone. To undo, run the restore script.');
FLOWKIT_PATCH`

  const restoreScript = `node << 'FLOWKIT_RESTORE'
const fs = require('fs');
if (!fs.existsSync('.flowkit-backup.json')) {
  console.error('No backup found. Run the patch script first.');
  process.exit(1);
}
const backup = JSON.parse(fs.readFileSync('.flowkit-backup.json', 'utf8'));
Object.entries(backup).forEach(([filePath, src]) => {
  fs.writeFileSync(filePath, src, 'utf8');
  console.log('  restored: ' + filePath);
});
fs.rmSync('.flowkit-backup.json');
console.log('\\nRestored. Backup removed.');
FLOWKIT_RESTORE`

  return { label: 'Copy patch script', script, restoreScript }
}

// ─── Workspace Order Patch ────────────────────────────────────────────────────

export function generateWorkspaceOrderPatch(names: string[]): PatchScript {
  const script = `node << 'FLOWKIT_WS_ORDER'
const fs = require('fs');
const raw = fs.readFileSync('src/workspaces.json', 'utf8');
const config = JSON.parse(raw);
const newOrder = ${JSON.stringify(names)};
config.workspaces = newOrder.map(name => {
  const existing = config.workspaces.find(w => w.name === name);
  return existing ?? { name };
});
fs.writeFileSync('src/workspaces.json', JSON.stringify(config, null, 2) + '\\n', 'utf8');
console.log('workspaces.json updated with order: ' + newOrder.join(', '));
FLOWKIT_WS_ORDER`

  return { label: 'Copy workspace order script', script }
}

// ─── Flow Order Patch ─────────────────────────────────────────────────────────

export function generateFlowOrderPatch(
  ws: string,
  projectFlowMap: Record<string, string[]>
): PatchScript {
  const script = `node << 'FLOWKIT_FLOW_ORDER'
const fs = require('fs');
const configPath = 'workspaces/${ws}/workspace.ts';
let src = fs.readFileSync(configPath, 'utf8');
const projectFlowMap = ${JSON.stringify(projectFlowMap, null, 2)};

// For each project, patch or insert the flows[] array.
Object.entries(projectFlowMap).forEach(([project, flows]) => {
  const flowsStr = JSON.stringify(flows);
  // Try to replace an existing flows: [...] for this project.
  const replaced = src.replace(
    new RegExp('(\\\\b' + project + '\\\\b[\\\\s\\\\S]*?flows\\\\s*:\\\\s*)\\\\[[^\\\\]]*\\\\]'),
    '$1' + flowsStr
  );
  if (replaced !== src) {
    src = replaced;
  } else {
    // Insert the projects block if absent — append before closing brace of defineConfig arg.
    console.warn('Could not auto-patch ' + project + '. Edit workspace.ts manually:');
    console.warn('  ' + project + ': { flows: ' + flowsStr + ' }');
  }
});
fs.writeFileSync(configPath, src, 'utf8');
console.log('Flow order updated in ' + configPath);
FLOWKIT_FLOW_ORDER`

  return { label: 'Copy flow order script', script }
}
