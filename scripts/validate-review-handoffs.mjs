#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { canonicalRoot } from './lib/repository-paths.mjs';
import { readJsonNoFollow } from './lib/review-safety.mjs';
import { normalizeLocalScope, resolveLocalProjectRoot } from './lib/local-directory.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const valueFor = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };

try {
  const local = args.includes('--local');
  if (local && !args.includes('--scope')) throw new Error('local-directory handoff validation requires independently supplied caller --scope');
  if (!local && args.includes('--scope')) throw new Error('--scope requires explicit local-directory validation');
  const callerScope = local ? normalizeLocalScope(JSON.parse(valueFor('--scope'))) : undefined;
  const repositoryRoot = canonicalRoot(valueFor('--repo-root'));
  const artifactRoot = canonicalRoot(valueFor('--artifact-root'));
  const artifactRelative = path.relative(repositoryRoot, artifactRoot).split(path.sep).join('/');
  if (!/^\.agents\/reviews\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(artifactRelative)) throw new Error('artifact root must be repository-owned');
  const intake = readJsonNoFollow(artifactRoot, 'intake.json');
  if ((intake.comparison === 'local-directory') !== local) throw new Error('local-directory handoff validation requires caller --local authorization and cannot reinterpret a Git review');
  if (local) {
    resolveLocalProjectRoot(repositoryRoot);
    const state = readJsonNoFollow(artifactRoot, 'state.json');
    if (intake.comparison !== 'local-directory' || state.target?.comparison !== 'local-directory') throw new Error('caller local authorization cannot reinterpret a Git review');
    if (JSON.stringify(callerScope) !== JSON.stringify(intake.local_scope) || JSON.stringify(callerScope) !== JSON.stringify(state.target.local_scope)) throw new Error('caller local scope differs from saved review before evidence reads');
  }
  const directory = path.join(artifactRoot, 'debug-handoffs');
  const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  const files = entries.filter((entry) => entry.isFile() && !entry.isSymbolicLink() && entry.name.endsWith('.json'));
  if (entries.length !== files.length) throw new Error('debug-handoffs may contain only regular JSON files');
  for (const entry of files) execFileSync(process.execPath, [
    path.join(harnessRoot, 'scripts', 'validate-review-handoff.mjs'),
    '--repo-root', repositoryRoot, '--artifact-root', artifactRoot, '--handoff', `debug-handoffs/${entry.name}`,
    ...(local ? ['--local', '--scope', JSON.stringify(callerScope)] : []),
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  console.log(JSON.stringify({ status: 'success', summary: `validated ${files.length} Review Pro handoff(s)`, artifacts: files.map(({ name }) => `debug-handoffs/${name}`), next_actions: ['Continue to completion validation.'] }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Repair or quarantine the invalid handoff and retry.'] }, null, 2));
  process.exit(1);
}
